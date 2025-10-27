// src/routes/game.route.ts
import type { FastifyPluginAsync } from 'fastify'

const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://game-service:3002'

const gameRoute: FastifyPluginAsync = async (fastify) => {
  
  // POST /api/rooms - Create new room
  fastify.post('/rooms', async (request, reply) => {
    try {
      const response = await fetch(`${GAME_SERVICE_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error: any) {
      fastify.log.error('Error creating room:', error.message)
      return reply.code(500).send({ success: false, error: 'Failed to create room' })
    }
  })

  // GET /api/rooms - List all rooms
  fastify.get('/rooms', async (request, reply) => {
    try {
      const response = await fetch(`${GAME_SERVICE_URL}/api/rooms`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error: any) {
      fastify.log.error('Error listing rooms:', error.message)
      return reply.code(500).send({ success: false, error: 'Failed to list rooms' })
    }
  })

  // GET /api/rooms/:roomId - Get room info
  fastify.get('/rooms/:roomId', async (request, reply) => {
    try {
      const { roomId } = request.params as { roomId: string }
      const response = await fetch(`${GAME_SERVICE_URL}/api/rooms/${roomId}`)
      if (response.status === 404) {
        return reply.code(404).send({ success: false, error: 'Room not found' })
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error: any) {
      fastify.log.error('Error getting room info:', error.message)
      return reply.code(500).send({ success: false, error: 'Failed to get room info' })
    }
  })

  // POST /api/matchmaking/join - Quick match
  fastify.post('/matchmaking/join', async (request, reply) => {
    try {
      const response = await fetch(`${GAME_SERVICE_URL}/api/matchmaking/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error: any) {
      fastify.log.error('Error joining matchmaking:', error.message)
      return reply.code(500).send({ success: false, error: 'Failed to join matchmaking' })
    }
  })

  // GET /api/stats - Get server stats
  fastify.get('/stats', async (request, reply) => {
    try {
      const response = await fetch(`${GAME_SERVICE_URL}/api/stats`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error: any) {
      fastify.log.error('Error getting stats:', error.message)
      return reply.code(500).send({ success: false, error: 'Failed to get stats' })
    }
  })
}

export default gameRoute