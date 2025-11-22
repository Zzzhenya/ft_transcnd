// transcendence/services/game-service/src/routes/remoteMatchRoutes.js

import logger from '../utils/logger.js';
import { finishRemoteMatch } from '../utils/remoteMatchDB.js';
import { roomManager } from '../room/RoomManager.js';
import { games } from '../pong/createGame.js'; // for legacy stats if available

/**
 * Register remote room / remote-match related REST routes
 * @param {import('fastify').FastifyInstance} fastify
 */
export function registerRemoteMatchRoutes(fastify) {
  // POST /api/rooms - Create a new room
  fastify.post('/api/rooms', async (request, reply) => {
    try {
      const roomId = roomManager.createRoom();
      logger.info(`[API] Room created: ${roomId}`);
      return {
        success: true,
        roomId,
        joinUrl: `/game/remote?room=${roomId}`
      };
    } catch (err) {
      logger.error('[API] Failed to create room:', err);
      return reply.code(500).send({ success: false, error: 'Failed to create room' });
    }
  });

  // GET /api/rooms - List all rooms
  fastify.get('/api/rooms', async (request, reply) => {
    try {
      const stats = roomManager.getStats();
      return {
        success: true,
        rooms: stats.roomsList,
        total: stats.totalRooms
      };
    } catch (err) {
      logger.error('[API] Failed to list rooms:', err);
      return reply.code(500).send({ success: false, error: 'Failed to list rooms' });
    }
  });

  // GET /api/rooms/:roomId - Info for a specific room
  fastify.get('/api/rooms/:roomId', async (request, reply) => {
    try {
      const { roomId } = request.params;
      const room = roomManager.getRoom(roomId);

      if (!room) {
        return reply.code(404).send({ success: false, error: 'Room not found' });
      }

      return { success: true, room: room.getInfo() };
    } catch (err) {
      logger.error('[API] Failed to fetch room info:', err);
      return reply.code(500).send({ success: false, error: 'Failed to fetch room' });
    }
  });

  // POST /api/matchmaking/join - Quick Match
  fastify.post('/api/matchmaking/join', async (request, reply) => {
    try {
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
    } catch (err) {
      logger.error('[Matchmaking] Error:', err);
      return reply.code(500).send({ success: false, error: 'Matchmaking failed' });
    }
  });

  // GET /api/stats - Server stats (remote + legacy)
  fastify.get('/api/stats', async (request, reply) => {
    try {
      const roomStats = roomManager.getStats();
      return {
        success: true,
        stats: {
          remote: {
            totalRooms: roomStats.totalRooms,
            activeGames: roomStats.activeGames,
            totalPlayers: roomStats.totalPlayers
          },
          legacy: {
            totalGames: typeof games !== 'undefined' ? games.size : 0,
            activeGames: typeof games !== 'undefined' ? Array.from(games.values()).filter(g => g.status === 'active').length : 0
          },
          server: {
            uptime: process.uptime(),
            memory: process.memoryUsage()
          }
        }
      };
    } catch (err) {
      logger.error('[API] Failed to fetch stats:', err);
      return reply.code(500).send({ success: false, error: 'Failed to fetch stats' });
    }
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
        if (playerId) {
          const byPlayerRoom = roomManager.getRoomByPlayer(playerId);
          fastify.log.info('[HTTP Ready] roomByPlayerId', { playerId, found: !!byPlayerRoom, resolvedRoomId: byPlayerRoom?.roomId });
          if (byPlayerRoom) {
            room = byPlayerRoom;
            roomId = room.roomId;
          }
        }

        // Fallback by username or playerNumber
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

      // Resolve target playerId within the resolved room
      let targetId = null;
      const directNum = playerId ? room.getPlayerNumber(playerId) : null;
      fastify.log.info('[HTTP Ready] directPlayerId', { playerId, matched: !!directNum });
      if (directNum) {
        targetId = playerId;
      } else {
        const info = room.getInfo();
        const players = Array.isArray(info.players) ? info.players : [];

        if (body && body.username) {
          const want = String(body.username || '').toLowerCase();
          const byName = players.find(p => String(p.username || '').toLowerCase() === want);
          if (byName) targetId = byName.playerId;
        }

        if (!targetId && body && (body.playerNumber === 1 || body.playerNumber === 2)) {
          const byNum = players.find(p => p.playerNumber === body.playerNumber);
          if (byNum) targetId = byNum.playerId;
        }

        if (!targetId) {
          const notReady = players.filter(p => !p.ready);
          if (notReady.length === 1) targetId = notReady[0].playerId;
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

  // NOTE: the WebSocket setup for remote players is registered elsewhere (index.js)
  // and shouldn't be invoked here. This file only registers REST routes.

  /**
   * POST /remote/match/finish
   * Finish a remote match based on central game result.
   *
   * Body:
   * {
   *   "gameId": number,
   *   "winner": "player1" | "player2",
   *   "finalScore": { "player1": number, "player2": number }
   * }
   */
  fastify.post('/remote/match/finish', async (request, reply) => {
    try {
      const { gameId, winner, finalScore } = request.body || {};

      if (!gameId || typeof gameId !== 'number') {
        return reply.code(400).send({ error: 'gameId (number) is required' });
      }

      if (!['player1', 'player2'].includes(winner)) {
        return reply.code(400).send({ error: 'winner must be "player1" or "player2"' });
      }

      if (
        !finalScore ||
        typeof finalScore.player1 !== 'number' ||
        typeof finalScore.player2 !== 'number'
      ) {
        return reply.code(400).send({
          error: 'finalScore with numeric player1 and player2 is required'
        });
      }

      const mapping = roomManager.getCentralGameMapping(gameId);
      if (!mapping) {
        logger.warn(`[RemoteMatch] No mapping found for gameId=${gameId}`);
        return reply.code(404).send({ error: 'Match mapping not found' });
      }

      const { matchId, player1UserId, player2UserId } = mapping;

      if (!matchId) {
        return reply.code(400).send({ error: 'No Remote_Match id associated with this game' });
      }

      const winnerUserId = winner === 'player1' ? player1UserId : player2UserId;

      if (!winnerUserId) {
        return reply.code(400).send({ error: 'Could not determine winnerUserId from mapping' });
      }

      logger.info(
        `[RemoteMatch] Finishing Remote_Match=${matchId} for gameId=${gameId}, winner=${winnerUserId}, score=${finalScore.player1}-${finalScore.player2}`
      );

      await finishRemoteMatch(
        matchId,
        winnerUserId,
        finalScore.player1,
        finalScore.player2
      );

      roomManager.clearCentralGameMapping(gameId);

      return reply.send({
        success: true,
        message: 'Remote match finished and recorded',
        matchId,
        gameId
      });
    } catch (err) {
      logger.error('[RemoteMatch] Error in /remote/match/finish:', err);
      return reply.code(500).send({ error: 'Failed to finish remote match' });
    }
  });
}
