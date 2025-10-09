// src/routes/ws-proxy.route.ts
import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"

import type {  } from '@fastify/websocket'

import WebSocket from 'ws'

export function createBackendSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)

    ws.on('open', () => resolve(ws))
    ws.on('error', (err) => reject(err))
  })
}

export function forwardMessages(
  clientSocket: any,  // Fastify WebSocket connection
  backendSocket: WebSocket
) {
  console.log('Setting up message forwarding...');
  console.log('Client socket type:', typeof clientSocket);
  console.log('Client socket keys:', Object.keys(clientSocket || {}));
  
  // Forward from client -> backend
  if (clientSocket && typeof clientSocket.on === 'function') {
    clientSocket.on('message', (msg: any) => {
      if (backendSocket.readyState === WebSocket.OPEN) {
        console.log('📤 Forwarding client->backend:', msg.toString());
        backendSocket.send(msg);
      } else {
        console.warn('⚠️ Backend socket not open when trying to forward message');
      }
    });
    console.log('✅ Client message handler attached');
  } else {
    console.error('❌ Client socket does not have "on" method');
    console.error('❌ Available methods:', clientSocket ? Object.getOwnPropertyNames(clientSocket).filter(p => typeof clientSocket[p] === 'function') : 'none');
  }

  // Forward from backend -> client
  backendSocket.on('message', (msg: any) => {
    if (clientSocket && typeof clientSocket.send === 'function') {
      console.log('📥 Forwarding backend->client:', msg.toString());
      try {
        clientSocket.send(msg);
      } catch (error) {
        console.error('❌ Error sending to client:', error);
      }
    } else {
      console.error('❌ Client socket not available or no send method');
    }
  });

  // Handle errors
  backendSocket.on('error', (error: any) => {
    console.error('❌ Backend socket error:', error);
  });

  if (clientSocket && typeof clientSocket.on === 'function') {
    clientSocket.on('error', (error: any) => {
      console.error('❌ Client socket error:', error);
    });
  }

  // Handle closures
  const closeBoth = () => {
    console.log('🔌 Closing both connections...');
    try {
      if (clientSocket && typeof clientSocket.close === 'function') {
        clientSocket.close();
      }
    } catch (error) {
      console.error('❌ Error closing client socket:', error);
    }
    
    try {
      if (backendSocket.readyState === WebSocket.OPEN) {
        backendSocket.close();
      }
    } catch (error) {
      console.error('❌ Error closing backend socket:', error);
    }
  };

  if (clientSocket && typeof clientSocket.on === 'function') {
    clientSocket.on('close', () => {
      console.log('🔌 Client disconnected');
      closeBoth();
    });
  }
  
  backendSocket.on('close', () => {
    console.log('🔌 Backend disconnected');
    closeBoth();
  });
}


const wsProxyRoute: FastifyPluginAsync = async (fastify) => {
  fastify.register(async function (fastify) {
    fastify.get('/pong/game-ws/:gameId', { websocket: true }, async (connection: any, req: any) => {
      console.log('WebSocket proxy connecting...');
      
      // With Fastify WebSocket, the connection IS the WebSocket
      const clientSocket = connection;
      
      console.log('Connection object:', typeof connection);
      console.log('Connection is socket:', connection && typeof connection.send === 'function');
      console.log('Available methods:', connection ? Object.getOwnPropertyNames(connection).filter(k => typeof connection[k] === 'function').slice(0, 10) : 'none');
      
      // Extract gameId from URL path since req.params may not work in WebSocket handlers
      let gameId = null;
      
      // Method 1: Try req.params first
      if (req.params && req.params.gameId) {
        gameId = req.params.gameId;
        console.log('GameId from req.params:', gameId);
      }
      
      // Method 2: Extract from URL if params didn't work
      if (!gameId && req.url) {
        const urlMatch = req.url.match(/\/pong\/game-ws\/(\d+)/);
        gameId = urlMatch ? urlMatch[1] : null;
        console.log('GameId from URL regex:', gameId);
      }
      
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
      
      const backendUrl = `ws://game-service:3002/ws/pong/game-ws/${gameId}`;
      console.log(`Proxying WebSocket to: ${backendUrl}`);
      
      try {
        const backendSocket = await createBackendSocket(backendUrl);
        console.log('WebSocket proxy connected successfully');
        forwardMessages(clientSocket, backendSocket);
      } catch (err) {
        console.error('Failed to connect to backend:', err);
        if (clientSocket && typeof clientSocket.close === 'function') {
          clientSocket.close();
        }
      }
    });
  });

// demo

  fastify.get('/pong/demo', async (request , reply) => {
    try
    {
        fastify.log.error("Gateway received GET request for /ws/pong/demo")
        const response = await fetch('http://game-service:3002/ws/pong/demo', {
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

  fastify.post('/pong/demo', async (request , reply) => {
    try
    {
        fastify.log.error("Gateway received POST request for /ws/pong/demo")
        const response = await fetch('http://game-service:3002/ws/pong/demo', {
        method: 'POST',
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

// game

  fastify.post('/pong/game', async (request , reply) => {
    try
    {
        fastify.log.error("Gateway received POST request for /ws/pong/game")
        const response = await fetch('http://game-service:3002/ws/pong/game', {
        method: 'POST',
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

  fastify.post('/pong/game/:gameId/move', async (request , reply) => {
    try
    {
        fastify.log.error("Gateway received POST request for /ws/pong/game/:gameId/move")
        const response = await fetch('http://game-service:3002/ws/pong/game/:gameId/move', {
        method: 'POST',
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


