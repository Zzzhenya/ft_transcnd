// src/routes/remote-only.route.ts
import type { FastifyInstance } from 'fastify'
import WebSocket from 'ws'

export default async function remoteOnlyRoute(fastify: FastifyInstance) {
  
  // Log when this plugin is loaded
  fastify.log.info('🎮 Loading remote-only WebSocket route...')
  
  // WebSocket route for remote players
  fastify.get('/remote', { websocket: true }, async (connection, req) => {
    const clientSocket = connection
    
    // Extract query parameters from URL
    let roomId = null, playerId = null, username = null
    if (req.url) {
      const url = new URL(req.url,`http://${req.headers.host}`)
      roomId = url.searchParams.get('roomId')
      playerId = url.searchParams.get('playerId')
      username = url.searchParams.get('username')
    }
    
    if (!roomId || !playerId || !username) {
      fastify.log.error('Missing roomId, playerId or username in WebSocket connection')
      if (clientSocket && typeof clientSocket.close === 'function') {
        clientSocket.close()
      }
      return
    }

    // Log connection
    fastify.log.info(`🎮 Remote WebSocket connection: roomId=${roomId}, playerId=${playerId}, username=${username}`)

    try {
      // Connect to game-service
      const gameServiceUrl = 'ws://game-service:3002/remote-player'
      const backendSocket = new WebSocket(gameServiceUrl)

      backendSocket.on('open', () => {
        fastify.log.info(`🎮 ✅ Connected to game-service for roomId: ${roomId}`)
        
        // Send initial connection data
        backendSocket.send(JSON.stringify({
          type: 'connect',
          roomId: roomId,
          playerId: playerId,
          username: username
        }))
        
        // Forward messages from client to backend
        clientSocket.on('message', (message) => {
          backendSocket.send(message)
        })
      })

      backendSocket.on('message', (data) => {
        // Forward messages from backend to client
        try {
          clientSocket.send(data)
        } catch (err) {
          fastify.log.error('Error sending message to client: ' + String(err))
        }
      })

      backendSocket.on('error', (err) => {
        fastify.log.error('Game service connection error: ' + String(err))
        clientSocket.close()
      })

      backendSocket.on('close', () => {
        fastify.log.info(`🎮 ❌ Game service connection closed for roomId: ${roomId}`)
        clientSocket.close()
      })

      clientSocket.on('close', () => {
        fastify.log.info(`🎮 ❌ Client disconnected from roomId: ${roomId}`)
        backendSocket.close()
      })

      clientSocket.on('error', (err) => {
        fastify.log.error('Client WebSocket error: ' + String(err))
        backendSocket.close()
      })

    } catch (err) {
      fastify.log.error('🎮 ❌ Failed to connect to game-service for remote player: ' + String(err))
      clientSocket.close()
    }
  })
}