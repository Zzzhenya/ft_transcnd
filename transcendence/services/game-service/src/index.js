import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { registerSingleGameRoutes } from './Routes/gameRoute.js';
import { registerWebSocketRoutes } from './websocket/websocket.js';
import { registerStatsRoutes } from './Routes/statsRoute.js';
import { healthCheck } from './Routes/healthRoute.js';
import { broadcastState } from './pong/broadcast.js';
import { games, counters } from './pong/createGame.js';
import logger from './utils/logger.js';

//import remote players
import { setupRemoteWebSocket } from './websocket/remoteWebSocket.js';
import { roomManager } from './room/RoomManager.js';

const fastify = Fastify({ logger: true });
await fastify.register(websocket);

await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

const wrappedBroadcastState = (gameId) => broadcastState(gameId, games);

// ========================================
// EXISTENT ROUTES (no changes)
// ========================================

registerSingleGameRoutes(fastify, games, counters, wrappedBroadcastState);

registerWebSocketRoutes(fastify, games, wrappedBroadcastState);

registerStatsRoutes(fastify, games);

healthCheck(fastify);

// ========================================
// NEW ROUTES: REMOTE PLAYERS
// ========================================

// API REST for Remote Players

// POST /api/rooms - Crear nueva room
fastify.post('/api/rooms', async (request, reply) => {
  const roomId = roomManager.createRoom();

  logger.info(`[API] Room created: ${roomId}`);

  return {
    success: true,
    roomId,
    joinUrl: `/game/remote?room=${roomId}`
  };
});

// GET /api/rooms - Listar todas las rooms
fastify.get('/api/rooms', async (request, reply) => {
  const stats = roomManager.getStats();

  return {
    success: true,
    rooms: stats.roomsList,
    total: stats.totalRooms
  };
});

// GET /api/rooms/:roomId - Info de una room específica
fastify.get('/api/rooms/:roomId', async (request, reply) => {
  const { roomId } = request.params;
  const room = roomManager.getRoom(roomId);

  if (!room) {
    return reply.code(404).send({
      success: false,
      error: 'Room not found'
    });
  }

  return {
    success: true,
    room: room.getInfo()
  };
});

// POST /api/matchmaking/join - Quick Match
fastify.post('/api/matchmaking/join', async (request, reply) => {
  let roomId = roomManager.findAvailableRoom();

  if (!roomId) {
    roomId = roomManager.createRoom();
    logger.info(`[Matchmaking] Created new room: ${roomId}`);
  } else {
    logger.info(`[Matchmaking] Found available room: ${roomId}`);
  }

  return {
    success: true,
    roomId,
    joinUrl: `/game/remote?room=${roomId}`
  };
});

// GET /api/stats - Estadísticas del servidor (combinadas)
fastify.get('/api/stats', async (request, reply) => {
  const roomStats = roomManager.getStats();

  return {
    success: true,
    stats: {
      // Remote players stats
      remote: {
        totalRooms: roomStats.totalRooms,
        activeGames: roomStats.activeGames,
        totalPlayers: roomStats.totalPlayers
      },
      // Legacy games stats
      legacy: {
        totalGames: games.size,
        activeGames: Array.from(games.values()).filter(g => g.status === 'active').length
      },
      // Server stats
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    }
  };
});

// WebSocket for Remote Players
setupRemoteWebSocket(fastify);

// ========================================
// START SERVER
// ========================================

const PORT = parseInt(process.env.GAME_SERVICE_PORT || process.env.PORT || '3002');
const HOST = process.env.HOST || '0.0.0.0';

try {
  const address = await fastify.listen({ port: PORT, host: HOST });

  logger.info(`[game-service] 🚀 Server listening on ${address}`);
  logger.info(`[game-service] 📡 WebSocket endpoints:`);
  logger.info(`  - ws://${HOST}:${PORT}/ws/remote (Remote Players)`);
  logger.info(`  - ws://${HOST}:${PORT}/ws/pong/game-ws/:gameId (Legacy)`);
  logger.info(`[game-service] 🎮 API endpoints:`);
  logger.info(`  - POST /api/rooms (Create room)`);
  logger.info(`  - GET  /api/rooms (List rooms)`);
  logger.info(`  - GET  /api/rooms/:roomId (Room info)`);
  logger.info(`  - POST /api/matchmaking/join (Quick match)`);
  logger.info(`  - GET  /api/stats (Server stats)`);

} catch (err) {
  logger.error('[game-service] Error starting server:', err);
  process.exit(1);
}