// @ts-nocheck
// src/routes/ws-proxy.route.ts
import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions, FastifyPluginAsync } from "fastify"

export function createBackendSocket(url: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      const { default: WebSocket } = await import('ws')
      const ws = new WebSocket(url)

      ws.on('open', () => resolve(ws))
      ws.on('error', (err: any) => reject(err))
    } catch (error) {
      reject(error)
    }
  })
}

export function forwardMessages(
  clientSocket: any,
  backendSocket: any
) {
  // Forward from client -> backend
  clientSocket.on('message', (msg: any) => {
    if (backendSocket.readyState === 1) { // WebSocket.OPEN
      backendSocket.send(msg)
    }
  })

  // Forward from backend -> client
  backendSocket.on('message', (msg: any) => {
    if (clientSocket.readyState === 1) { // WebSocket.OPEN
      clientSocket.send(msg)
    }
  })

  // Handle closures
  const closeBoth = () => {
    if (clientSocket.readyState === 1) clientSocket.close()
    if (backendSocket.readyState === 1) backendSocket.close()
  }

  clientSocket.on('close', closeBoth)
  backendSocket.on('close', closeBoth)
}


const wsProxyRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/pong/game-ws/:gameId', { websocket: true }, async (connection: any, req: any) => {
    console.log('WebSocket proxy connecting...');
    
    const clientSocket = connection.socket
    
    // Extract gameId from the raw URL since Fastify WebSocket params are not working
    const rawUrl = req.raw ? req.raw.url : req.url;
    console.log('Raw URL:', rawUrl);
    
    let gameId = null;
    
    if (rawUrl) {
      // Match pattern: /ws/pong/game-ws/123
      const gameIdMatch = rawUrl.match(/\/ws\/pong\/game-ws\/(\d+)/);
      gameId = gameIdMatch ? gameIdMatch[1] : null;
      console.log('GameId extracted from raw URL:', gameId);
    }
    
    if (!gameId) {
      console.error('GameId not found in URL:', rawUrl);
      if (clientSocket && typeof clientSocket.close === 'function') {
        clientSocket.close();
      }
      return;
    }
    
    const backendUrl = `ws://game-service:3002/ws/pong/game-ws/${gameId}`
    console.log(`Proxying WebSocket to: ${backendUrl}`);
    
    try {
      const backendSocket = await createBackendSocket(backendUrl)
      console.log('WebSocket proxy connected successfully');
      forwardMessages(clientSocket, backendSocket)
    } catch (err: any) {
      console.error('Failed to connect to backend:', err);
      if (clientSocket && typeof clientSocket.close === 'function') {
        clientSocket.close();
      }
    }
  })
}

export default wsProxyRoute


