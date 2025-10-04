// src/routes/ws-proxy.route.ts
import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"

import { SocketStream } from 'fastify-websocket'

import WebSocket from 'ws'

const function createBackendSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)

    ws.on('open', () => resolve(ws))
    ws.on('error', (err) => reject(err))
  })
}

const function forwardMessages(
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
    const clientSocket = connection.socket

    // Replace with dynamic routing logic if needed
    const backendUrl = 'ws://game-service/ws/pong'

    try {
      const backendSocket = await createBackendSocket(backendUrl)
      forwardMessages(clientSocket, backendSocket)
    } catch (err) {
      clientSocket.close()
      fastify.log.error('Failed to connect to backend:', err)
    }
  })
}

export default wsProxyRoute


