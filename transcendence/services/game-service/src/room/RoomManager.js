// transcendence/services/game-service/src/room/RoomManager.js

import { GameRoom } from './GameRoom.js';
import logger from '../utils/logger.js';

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.playerToRoom = new Map();

    // gameId -> { roomId, matchId, player1UserId, player2UserId }
    this.gameToMatch = new Map();

    this.startCleanupInterval();

    logger.info('[RoomManager] Initialized');
  }

  createRoom() {
    const roomId = this.generateRoomId();
    const room = new GameRoom(roomId, {
      gameType: 'remote',
      roomManager: this
    });

    this.rooms.set(roomId, room);

    logger.info(`[RoomManager] Created room ${roomId}`);

    return roomId;
  }

  joinRoom(roomId, playerId, socket, playerInfo = {}) {
    let room = this.rooms.get(roomId);

    if (!room) {
      room = new GameRoom(roomId, {
        gameType: 'remote',
        roomManager: this
      });
      this.rooms.set(roomId, room);
      logger.info(`[RoomManager] Auto-created room ${roomId}`);
    }

    if (room.isFull()) {
      logger.warn(`[RoomManager] Room ${roomId} is full`);
      return null;
    }

    const existingRoomId = this.playerToRoom.get(playerId);
    if (existingRoomId) {
      this.leaveRoom(existingRoomId, playerId);
    }

    const success = room.addPlayer(playerId, socket, playerInfo);

    if (!success) {
      return null;
    }

    this.playerToRoom.set(playerId, roomId);

    return room;
  }

  async leaveRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return;
    }

    // Get the leaving player's info before removing them
    const leavingPlayer = room.players.get(playerId);
    const leavingPlayerName = leavingPlayer?.username || 'Player';

    // Get all other players in the room to notify them
    const otherPlayers = Array.from(room.players.entries())
      .filter(([id]) => id !== playerId)
      .map(([id, player]) => ({ id, username: player.username }));

    room.removePlayer(playerId);

    this.playerToRoom.delete(playerId);

    // Notify other players that someone left (only if game hasn't started)
    if (otherPlayers.length > 0 && !room.isPlaying) {
      logger.info(
        `[RoomManager] Notifying ${otherPlayers.length} players that ${leavingPlayerName} left room ${roomId}`
      );

      for (const otherPlayer of otherPlayers) {
        try {
          // Extract numeric user ID from playerId (format: "userId_timestamp_random")
          const userIdMatch = otherPlayer.id.match(/^(\d+)_/);
          const userId = userIdMatch ? parseInt(userIdMatch[1]) : null;

          if (!userId) {
            logger.warn(
              `[RoomManager] Could not extract userId from playerId: ${otherPlayer.id}`
            );
            continue;
          }

          const notificationPayload = {
            roomCode: roomId,
            leaverName: leavingPlayerName,
            message: `${leavingPlayerName} left the waiting room.`
          };

          const writePayload = {
            table: 'Notifications',
            action: 'insert',
            values: {
              user_id: userId,
              actor_id: null,
              Noti_type: 'player_left_room',
              payload: JSON.stringify(notificationPayload),
              Noti_read: 0,
              created_at: new Date().toISOString()
            }
          };

          const response = await fetch(
            'http://database-service:3006/internal/users',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-service-auth': 'super_secret_internal_token'
              },
              body: JSON.stringify(writePayload)
            }
          );

          if (response.ok) {
            logger.info(
              `[RoomManager] ✅ Notified user ${userId} that ${leavingPlayerName} left`
            );
          } else {
            logger.error(
              `[RoomManager] ❌ Failed to notify user ${userId}: ${response.status}`
            );
          }
        } catch (error) {
          logger.error(
            `[RoomManager] Error notifying player about leave:`,
            error
          );
        }
      }
    }

    if (room.isEmpty()) {
      this.deleteRoom(roomId);
    }
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return;
    }

    // DO NOT clear gameToMatch mapping here, we need it for finish endpoint.
    // It will be cleared when /remote/match/finish is called.

    room.isPlaying = false;
    room.isPaused = false;

    this.rooms.delete(roomId);

    logger.info(`[RoomManager] Deleted room ${roomId}`);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  getRoomByPlayer(playerId) {
    const roomId = this.playerToRoom.get(playerId);
    return roomId ? this.rooms.get(roomId) : null;
  }

  findAvailableRoom() {
    for (const [roomId, room] of this.rooms.entries()) {
      if (!room.isFull() && !room.isPlaying) {
        return roomId;
      }
    }
    return null;
  }

  generateRoomId() {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let roomId;

    do {
      roomId = '';
      for (let i = 0; i < 6; i++) {
        roomId += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }
    } while (this.rooms.has(roomId));

    return roomId;
  }

  cleanupInactiveRooms() {
    const now = Date.now();
    const inactivityTimeout = 30 * 60 * 1000; // 30 minutos

    const roomsToDelete = [];

    this.rooms.forEach((room, roomId) => {
      if (room.isEmpty() || now - room.lastActivity > inactivityTimeout) {
        roomsToDelete.push(roomId);
      }
    });

    roomsToDelete.forEach((roomId) => {
      logger.info(`[RoomManager] Cleaning up inactive room ${roomId}`);
      this.deleteRoom(roomId);
    });

    if (roomsToDelete.length > 0) {
      logger.info(
        `[RoomManager] Cleaned up ${roomsToDelete.length} inactive rooms`
      );
    }
  }

  startCleanupInterval() {
    setInterval(() => {
      this.cleanupInactiveRooms();
    }, 5 * 60 * 1000);
  }

  getStats() {
    return {
      totalRooms: this.rooms.size,
      activeGames: Array.from(this.rooms.values()).filter(
        (r) => r.isPlaying
      ).length,
      totalPlayers: this.playerToRoom.size,
      roomsList: Array.from(this.rooms.values()).map((r) => r.getInfo())
    };
  }

  // ─────────────────────────────────────────────
  // Central game ↔ Remote_Match mapping
  // ─────────────────────────────────────────────

  /**
   * Called by GameRoom when /pong/game returns a central gameId.
   * Registers mapping: gameId -> { roomId, matchId, players }.
   */
  registerCentralGame(gameId, room, player1UserId, player2UserId) {
    if (!gameId) return;
    const info = {
      roomId: room.roomId,
      matchId: room.matchId,
      gameType: room.gameType,
      player1UserId,
      player2UserId
    };

    this.gameToMatch.set(gameId, info);

    logger.info(
      `[RoomManager] Registered central game mapping: gameId=${gameId}, roomId=${room.roomId}, matchId=${room.matchId}, P1=${player1UserId}, P2=${player2UserId}`
    );
  }

  /**
   * Get mapping for central gameId.
   */
  getCentralGameMapping(gameId) {
    return this.gameToMatch.get(gameId) || null;
  }

  /**
   * Clear mapping when match is finished.
   */
  clearCentralGameMapping(gameId) {
    if (this.gameToMatch.delete(gameId)) {
      logger.info(
        `[RoomManager] Cleared central game mapping for gameId=${gameId}`
      );
    }
  }
}



export const roomManager = new RoomManager();
