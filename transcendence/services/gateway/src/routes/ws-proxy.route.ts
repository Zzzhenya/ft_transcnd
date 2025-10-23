// src/routes/ws-proxy.route.ts
import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"

import type {  } from '@fastify/websocket'

import WebSocket from 'ws'

export function createBackendSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)

    console.log(ws)
    ws.onopen = () =>
    {
      console.log('WebSocket Open')
      resolve(ws)
    }
    ws.onerror = (err) =>
    {
      console.error('Websocket error: ', err)
      reject(err)
    }
  })
}

export function forwardMessages (
  clientSocket: WebSocket, // why make it any type
  backendSocket: WebSocket
  ) {

  console.log('Setting up message forwarding...');
  // fastify.log.info('Client socket type:', typeof clientSocket);
  // fastify.log.info('Client socket keys:', Object.keys(clientSocket || {}));


  // Forward from client -> backend
  clientSocket.on('message', (msg) => {
    if (backendSocket.readyState === WebSocket.OPEN) {
      try {
        const parsed = JSON.parse(msg.toString()); // Ensure text
        backendSocket.send(JSON.stringify(parsed)); // Force stringified JSON
        // backendSocket.send(JSON.stringify(msg)); // Force stringified JSON
        // console.log(msg)
      } catch (err) {
        console.error('Invalid JSON from client:', err);
      }
    }
  })

  // Forward from backend -> client
  backendSocket.on('message', (msg) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      try {
        // not necessary to parse but doing all the same
        const parsed = JSON.parse(msg.toString()); // Ensure text
        clientSocket.send(JSON.stringify(parsed)); // Force stringified JSON
        // clientSocket.send(JSON.stringify(msg)); // Force stringified JSON
        // console.log(msg)
        // console.log(msg)
        // clientSocket.send(msg)
      } catch (err) {
        console.error('Invalid JSON from game-service:', msg);
      }
    }
  })

  // Handle closures
  const closeBoth = () => {
    // if (clientSocket.readyState === WebSocket.OPEN) clientSocket.close()
    // if (backendSocket.readyState === WebSocket.OPEN) backendSocket.close()
    console.log('Close both connections')
    
    try {
      if (clientSocket && typeof clientSocket.close === 'function') {
        if (clientSocket.readyState === WebSocket.OPEN){
          clientSocket.close();
        }
      }
    } catch (error) {
      console.error('❌ Error closing client socket:', error)
    }

    try {
      if (backendSocket && backendSocket.readyState === WebSocket.OPEN){
        backendSocket.close()
      }
    } catch (error) {
      console.error('❌ Error closing backend socket:', error)
    }

  }

  // if (clientSocket && typeof clientSocket.on === 'function') {
  //   clientSocket.on('close', closeBoth)
  //   console.log('Client disconnected the ws connection')
  // }

  // backendSocket.on('close', closeBoth)
  // console.log('Backend disconnected the ws connection')

  const pingInterval = setInterval(() => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.ping();
    }
    if (backendSocket.readyState === WebSocket.OPEN) {
      backendSocket.ping();
    }
  }, 30_000); // every 30s

  // ⛔️ Stop the interval when either side disconnects
  const clear = () => clearInterval(pingInterval);
  clientSocket.on('close', clear);
  backendSocket.on('close', clear);
}


interface GameParams {
  gameId: string;
}



const wsProxyRoute: FastifyPluginAsync = async (fastify) => {
  
  // WebSocket route for remote players
  fastify.get('/remote', { websocket: true }, async (connection, req) => {
    const clientSocket = connection
    
    // Extract query parameters from URL
    let roomId = null, playerId = null, username = null
    if (req.url) {
      const url = new URL(req.url, `http://${req.headers.host}`)
      roomId = url.searchParams.get('roomId')
      playerId = url.searchParams.get('playerId')
      username = url.searchParams.get('username')
    }
    
    if (!roomId || !playerId) {
      fastify.log.error('Missing roomId or playerId in WebSocket connection')
      if (clientSocket && typeof clientSocket.close === 'function') {
        clientSocket.close()
      }
      return
    }
    
    // Create backend WebSocket URL with query parameters
    const backendUrl = `ws://game-service:3002/ws/remote?roomId=${roomId}&playerId=${playerId}&username=${encodeURIComponent(username || 'Anonymous')}`
    
    try {
      const backendSocket = await createBackendSocket(backendUrl)
      fastify.log.info(`Remote WebSocket proxy connected: ${roomId}`)
      forwardMessages(clientSocket, backendSocket)
    } catch (err) {
      fastify.log.error('Failed to connect to backend for remote play')
      if (clientSocket && typeof clientSocket.close === 'function') {
        clientSocket.close()
      }
    }
  })

  fastify.get<{Params: GameParams;}>('/pong/game-ws/:gameId', { websocket: true }, async (connection, req) => {
    const clientSocket = connection
    if (req.cookies)
    {
      const existingSessionId = req.cookies.sessionId;
      if (existingSessionId)
        fastify.log.info('✅' + existingSessionId)
    }
    // fastify.log.info("Check sessionID")
    // const cookies = req.cookies;
    // // Safely access a specific cookie - check for session id
    // const sessionId = cookies?.sessionId;
    // if (sessionId) {
    //   console.log('Cookie found', sessionId)
    // } else {
    //   console.error('No sessionId cookie found');
    //   clientSocket.close();
    //   return;
    // }

    fastify.log.info("Extract gameId")

    // Extract gameId from URL path since req.params may not work in WebSocket handlers
    let gameId = null;
    
    // Method 1: Try req.params first

    if (req.params)
    {
      var gameIdStr = req.params.gameId;
      gameId = parseInt(gameIdStr.replace(/[^0-9]/g, ''),10); 
      // gameId = req.params.gameId;
      console.log('other: ', gameId)
    }
    // if (req.params && req.params.gameId) {
    //   gameId = req.params.gameId;
    //   console.log('GameId from req.params:', gameId);
    // }
    
    // Method 2: Extract from URL if params didn't work
    // if (!gameId && req.url) {
    //   const urlMatch = req.url.match(/\/pong\/game-ws\/(\d+)/);
    //   gameId = urlMatch ? urlMatch[1] : null;
    //   console.log('GameId from URL regex:', gameId);
    // }
    
    // Method 3: Try raw URL if available
    if (!gameId && req.raw && req.raw.url) {
      const rawUrlMatch = req.raw.url.match(/\/ws\/pong\/game-ws\/(\d+)/);
      gameId = rawUrlMatch ? rawUrlMatch[1] : null;
      console.log('GameId from raw URL:', gameId);
    }
    
    console.log('Final gameId:', gameId);
    
    if (!gameId) {
      console.error('GameId not found in request');
      console.log('Request details:', {
        url: req.url,
        rawUrl: req.raw?.url,
        params: req.params
      });
      if (clientSocket && typeof clientSocket.close === 'function') {
        clientSocket.close();
      }
      return;
    }
    console.log(gameId)
    // const backendUrl = 'ws://game-service:3002/ws/pong/game-ws'
    const backendUrl = `ws://game-service:3002/ws/pong/game-ws/${gameId}`;
    try {
      const backendSocket = await createBackendSocket(backendUrl)
      fastify.log.info('WebSocket proxy connected successfully');
      forwardMessages(clientSocket, backendSocket)
      fastify.log.info('Message forward setup successfully');
    } catch (err) {
      fastify.log.info('Failed to connect to backend:');
      if (clientSocket && typeof clientSocket.close === 'function'){
        clientSocket.close();
      }
    }
  })

// demo

  fastify.get('/pong/demo', async (request , reply) => {
    const existingSessionId = request.cookies.sessionId;
    if (existingSessionId)
      fastify.log.info('✅'+existingSessionId)
    // var haveSesionId = false;
    try
    {
        fastify.log.info("Gateway received GET request for /ws/pong/demo")
        // const cookies = request.cookies;
        // Safely access a specific cookie - check for session id
        // if (!cookies)
        //   haveSesionId= false;
        // const sessionId = cookies?.sessionId;
        // if (cookies && sessionId) {
        //   haveSesionId = true;
        //   console.log('Cookie found', sessionId)
        // } else {
        //   console.log('No sessionId cookie found');
        // }
        const response = await fetch('http://game-service:3002/ws/pong/demo', {
        method: 'GET',
        headers: {
        'Authorization': request.headers['authorization'] || '',
      }})
    const data = await response.json();
    reply.status(response.status);
    // if (!haveSesionId){
      // add abc123 as session id
      // const sessionId = 'abc123'
      // Set the cookie
      // reply
      // .setCookie('sessionId', sessionId, {
      //   path: '/',           // cookie available on all routes
      //   httpOnly: true,      // not accessible via client-side JS
      //   secure: false,        // true send only over HTTPS
      //   sameSite: 'none',   // none for HTTPS
      //   // sameSite: 'Strict',  // CSRF protection
      //   maxAge: 3600         // 1 hour
      // })
    // }
    reply.send(data);
    }
    catch (error) {
      fastify.log.error(error)
      reply.status(404);
    }
  })

  fastify.post('/pong/demo', async (request , reply) => {
    // var haveSesionId = false
    try
    {
        fastify.log.error("Gateway received POST request for /ws/pong/demo")
        // const cookies = request.cookies;
        // Safely access a specific cookie - check for session id
        // if (!cookies)
        //   haveSesionId= false;
        // const sessionId = cookies?.sessionId;
        // if (sessionId) {
        //   haveSesionId = true;
        //   console.log('Cookie found', sessionId)
        // } else {
        //   console.log('No sessionId cookie found');
        // }
        const response = await fetch('http://game-service:3002/ws/pong/demo', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers['authorization'] || '',},
         // 'Authorization': request.headers['authorization'] || '',},
        body:JSON.stringify(request.body),
      })
    const data = await response.json();
    // reply.status(response.status).send(data);
    reply.status(response.status);
    // if (!haveSesionId){
    //   // add abc123 as session id - Should get one from AUTH server and store it?
    //   const d = new Date()
    //   const sessionId = d.toString()
    //   // Set the cookie
    //   reply
    //   .setCookie('sessionId', sessionId, {
    //     path: '/',           // cookie available on all routes
    //     httpOnly: true,      // not accessible via client-side JS
    //     secure: true,        // send only over HTTPS
    //     // sameSite: 'Strict',  // CSRF protection
    //     sameSite: false, // for demo
    //     // maxAge: 3600         // 1 hour // without maxAge browser automatically expires the cookie when tab or browser is closed - only on frontend not file
    //   })
    // }
    reply.send(data);
    }
    catch (error) {
      fastify.log.error(error)
      reply.status(404);
    }
  })

  fastify.delete('/pong/demo/:gameId', async (request , reply) => {
    try
    {
        fastify.log.error("Gateway received DELETE request for /ws/pong/demo/:gameId")
        const response = await fetch('http://game-service:3002/ws/pong/demo/:gameId', {
        method: 'DELETE',
        headers: {
        'Authorization': request.headers['authorization'] || '',
      }})
    const data = await response.json();
    reply.status(response.status).send(data);
    }
    catch (error) {
      fastify.log.error(error)
      reply.status(404);
    }
  })

  fastify.delete('/pong/demo', async (request , reply) => {
    try
    {
        fastify.log.error("Gateway received DELETE request for /ws/pong/demo")
        const response = await fetch('http://game-service:3002/ws/pong/demo', {
        method: 'DELETE',
        headers: {
        'Authorization': request.headers['authorization'] || '',
      }})
    const data = await response.json();
    reply.status(response.status).send(data);
    }
    catch (error) {
      fastify.log.error(error)
      reply.status(404);
    }
  })

  fastify.post('/pong/demo/:gameId/move', async (request , reply) => {
    try
    {
        fastify.log.error("Gateway received POST request for /ws/pong/demo/:gameId/move")
        const response = await fetch('http://game-service:3002/ws/pong/demo/:gameId/move', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers['authorization'] || '',},
        body:JSON.stringify(request.body),
      })
    const data = await response.json();
    reply.status(response.status).send(data);
    }
    catch (error) {
      fastify.log.error(error)
      reply.status(404);
    }
  })

// game

  fastify.post('/pong/game', async (request , reply) => {
    try
    {
        fastify.log.error("Gateway received POST request for /ws/pong/game")
        const response = await fetch('http://game-service:3002/ws/pong/game', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers['authorization'] || '',},
        body:JSON.stringify(request.body),
      })
    const data = await response.json();
    reply.status(response.status).send(data);
    }
    catch (error) {
      fastify.log.error(error)
      reply.status(404);
    }
  })

  fastify.get('/pong/game', async (request , reply) => {
    try
    {
        fastify.log.error("Gateway received GET request for /ws/pong/game")
        const response = await fetch('http://game-service:3002/ws/pong/game', {
        method: 'GET',
        headers: {
        'Authorization': request.headers['authorization'] || '',
      }})
    const data = await response.json();
    reply.status(response.status).send(data);
    }
    catch (error) {
      fastify.log.error(error)
      reply.status(404);
    }
  })

  fastify.get('/pong/game/:gameId', async (request , reply) => {
    try
    {
        fastify.log.error("Gateway received GET request for /ws/pong/game/:gameId")
        const response = await fetch('http://game-service:3002/ws/pong/game/:gameId', {
        method: 'GET',
        headers: {
        'Authorization': request.headers['authorization'] || '',
      }})
    const data = await response.json();
    reply.status(response.status).send(data);
    }
    catch (error) {
      fastify.log.error(error)
      reply.status(404);
    }
  })

  fastify.post('/pong/game/:gameId/join', async (request , reply) => {
    try
    {
        fastify.log.error("Gateway received POST request for /ws/pong/game/:gameId/join")
        const response = await fetch('http://game-service:3002/ws/pong/game/:gameId/join', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers['authorization'] || '',},
        body:JSON.stringify(request.body),
      })
    const data = await response.json();
    reply.status(response.status).send(data);
    }
    catch (error) {
      fastify.log.error(error)
      reply.status(404);
    }
  })

  fastify.post('/pong/game/:gameId/move', async (request , reply) => {
    try
    {
        fastify.log.error("Gateway received POST request for /ws/pong/game/:gameId/move")
        const response = await fetch('http://game-service:3002/ws/pong/game/:gameId/move', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers['authorization'] || '',},
        body:JSON.stringify(request.body),
      })
    const data = await response.json();
    reply.status(response.status).send(data);
    }
    catch (error) {
      fastify.log.error(error)
      reply.status(404);
    }
  })

  fastify.put('/pong/game/:gameId/result', async (request , reply) => {
    try
    {
        fastify.log.error("Gateway received PUT request for /ws/pong/game/:gameId/result")
        const response = await fetch('http://game-service:3002/ws/pong/game/:gameId/result', {
        method: 'PUT',
        headers: {
        'Authorization': request.headers['authorization'] || '',
      }})
    const data = await response.json();
    reply.status(response.status).send(data);
    }
    catch (error) {
      fastify.log.error(error)
      reply.status(404);
    }
  })

}

export default wsProxyRoute


