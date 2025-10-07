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
  fastify.get('/pong', { websocket: true }, async (connection, req) => {
    console.log('Ws1\n');
    const clientSocket = connection
    console.log('Ws2\n');
    // Replace with dynamic routing logic if needed
    // const backendUrl = 'ws://game-service/ws/pong'
    const backendUrl = 'ws://game-service:3002/ws/pong'
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
}

export default wsProxyRoute


