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

// POST /rooms/:roomId/players/:playerId/ready - HTTP fallback to mark player ready
fastify.post('/rooms/:roomId/players/:playerId/ready', async (request, reply) => {
  try {
    let { roomId, playerId } = request.params;
    const body = (request.body || {});
    fastify.log.info('[HTTP Ready] req', { params: request.params, body });
    let room = roomManager.getRoom(roomId);
    fastify.log.info('[HTTP Ready] roomById', { triedRoomId: roomId, found: !!room });

    // If the provided roomId isn't found, try resolving by player identity
    if (!room) {
      // 1) If we have a playerId, try to find the room by playerId mapping
      if (playerId) {
        const byPlayerRoom = roomManager.getRoomByPlayer(playerId);
        fastify.log.info('[HTTP Ready] roomByPlayerId', { playerId, found: !!byPlayerRoom, resolvedRoomId: byPlayerRoom?.roomId });
        if (byPlayerRoom) {
          room = byPlayerRoom;
          roomId = room.roomId;
        }
      }
      // 2) As a fallback, try scanning rooms by username or playerNumber if provided
      if (!room && (body.username || body.playerNumber)) {
        fastify.log.info('[HTTP Ready] scanRooms start', { username: body.username, playerNumber: body.playerNumber });
        for (const [rid, r] of roomManager.rooms.entries()) {
          const info = r.getInfo();
          const players = Array.isArray(info.players) ? info.players : [];
          const want = String(body.username || '').toLowerCase();
          const found = players.find(p => (body.username && String(p.username || '').toLowerCase() === want) ||
                                          (body.playerNumber && p.playerNumber === body.playerNumber));
          if (found) {
            room = r;
            roomId = rid;
            if (!playerId) playerId = found.playerId;
            fastify.log.info('[HTTP Ready] scanRooms resolved', { resolvedRoomId: roomId, resolvedPlayerId: playerId });
            break;
          }
        }
      }
      if (!room) {
        fastify.log.warn('[HTTP Ready] 404 room not found', { paramsRoomId: request.params.roomId, body });
        return reply.code(404).send({ success: false, error: 'Room not found' });
      }
    }

    // Try by exact playerId first within the resolved room
    let targetId = null;
    const directNum = playerId ? room.getPlayerNumber(playerId) : null;
    fastify.log.info('[HTTP Ready] directPlayerId', { playerId, matched: !!directNum });
    if (directNum) {
      targetId = playerId;
    } else {
      // Attempt to resolve by username or playerNumber, or single unready player fallback
      const info = room.getInfo();
      const players = Array.isArray(info.players) ? info.players : [];
      // 1) by username
      if (body && body.username) {
        const want = String(body.username || '').toLowerCase();
        const byName = players.find(p => String(p.username || '').toLowerCase() === want);
        if (byName) targetId = byName.playerId;
      }
      // 2) by playerNumber
      if (!targetId && body && (body.playerNumber === 1 || body.playerNumber === 2)) {
        const byNum = players.find(p => p.playerNumber === body.playerNumber);
        if (byNum) targetId = byNum.playerId;
      }
      fastify.log.info('[HTTP Ready] resolveBy', { byName: !!targetId && body?.username ? true : false, byNum: !!targetId && (body?.playerNumber === 1 || body?.playerNumber === 2) ? true : false });
      // 3) if exactly one player is not ready, assume it
      if (!targetId) {
        const notReady = players.filter(p => !p.ready);
        if (notReady.length === 1) {
          targetId = notReady[0].playerId;
        }
      }
      if (!targetId) {
        fastify.log.warn('[HTTP Ready] 404 player not found', { roomId, playerId, body });
        return reply.code(404).send({ success: false, error: 'Player not found in room' });
      }
    }

    room.setPlayerReady(targetId);

    const response = {
      success: true,
      roomId,
      playerId: targetId,
      room: room.getInfo()
    };
    fastify.log.info('[HTTP Ready] success', response);
    return reply.send(response);
  } catch (err) {
    fastify.log.error('[HTTP Ready] Error:', err);
    return reply.code(500).send({ success: false, error: 'Failed to mark player ready' });
  }
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