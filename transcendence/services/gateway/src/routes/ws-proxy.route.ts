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
  clientSocket: WebSocket,
  backendSocket: WebSocket
) {
  // Forward from client -> backend
  clientSocket.on('message', (msg) => {
    if (backendSocket.readyState === WebSocket.OPEN) {
      backendSocket.send(msg)
    }
  })

  // Forward from backend -> client
  backendSocket.on('message', (msg) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(msg)
    }
  })

  // Handle closures
  const closeBoth = () => {
    if (clientSocket.readyState === WebSocket.OPEN) clientSocket.close()
    if (backendSocket.readyState === WebSocket.OPEN) backendSocket.close()
  }

  clientSocket.on('close', closeBoth)
  backendSocket.on('close', closeBoth)
}


const wsProxyRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/pong/game-ws', { websocket: true }, async (connection, req) => {
    console.log('Ws1\n');
    const clientSocket = connection
    console.log('Ws2\n');
    // Replace with dynamic routing logic if needed
    // const backendUrl = 'ws://game-service/ws/pong'
    const backendUrl = 'ws://game-service:3002/ws/pong/game-ws'
    console.log('Ws3\n');
    try {
      console.log('Ws4\n');
      const backendSocket = await createBackendSocket(backendUrl)
      console.log('Ws5\n');
      forwardMessages(clientSocket, backendSocket)
      console.log('Ws6\n');
    } catch (err) {
      clientSocket.close()
      fastify.log.error('Failed to connect to backend:' + err)
    }
  })

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


