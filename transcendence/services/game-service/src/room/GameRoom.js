// transcendence/services/game-service/src/room/GameRoom.js

import logger from '../utils/logger.js';
import {
  createRemoteMatch,
  startRemoteMatch,
  finishRemoteMatch,
  cancelRemoteMatch
} from '../utils/remoteMatchDB.js';

// Service-to-service base URL (inside Docker network)
const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://game-service:3002';

/**
 * GameRoom: a lobby / match coordinator that uses the central game engine.
 *
 * Responsibilities:
 *  - manage players in the waiting room
 *  - ready/countdown flow
 *  - create Remote_Match DB row (createRemoteMatch)
 *  - create central game via POST /pong/game
 *  - register mapping to RoomManager (roomManager.registerCentralGame)
 *  - broadcast lobby messages to clients
 *
 * It DOES NOT run physics, moveBall, checkWinCondition, etc.
 */
export class GameRoom {
  constructor(roomId, options = {}) {
    this.roomId = roomId;
    this.players = new Map();
    this.maxPlayers = 2;

    // Lobby / metadata
    this.isPlaying = false;
    this.isPaused = false;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();

    // DB match info for remote games
    this.matchId = options.remoteMatchId || null; // Remote_Match.id (Case A: created here)
    this.matchStarted = false;

    // Game type metadata (default 'remote')
    this.gameType = options.gameType || 'remote'; // 'remote' | 'normal' | 'tournament'
    this.tournamentId = options.tournamentId || null;

    // Reference to RoomManager for mapping registration
    this.roomManager = options.roomManager || null;

    // central gameId (from /pong/game)
    this.centralGameId = null;

    // Timers
    this.countdownInterval = null;

    logger.info(`[GameRoom] Room ${roomId} created (type: ${this.gameType}, matchId: ${this.matchId})`);
  }

  // -------------------------
  // Player management
  // -------------------------
  addPlayer(playerId, socket, playerInfo = {}) {
    if (this.players.size >= this.maxPlayers) {
      logger.warn(`[GameRoom] ${this.roomId} is full`);
      return false;
    }

    if (this.players.has(playerId)) {
      // Reconnect logic - replace socket and merge info
      const existing = this.players.get(playerId);
      logger.warn(`[GameRoom] Player ${playerId} already in room ${this.roomId} - performing reconnect`);
      try {
        if (existing.socket && (existing.socket.readyState === 0 || existing.socket.readyState === 1)) {
          existing.socket.close(1012, 'Replaced by new connection');
        }
      } catch (e) {
        logger.warn(`[GameRoom] Error closing previous socket for player ${playerId}:`, e);
      }

      existing.socket = socket;
      existing.info = {
        username: playerInfo.username || existing.info?.username || `Player ${existing.playerNumber}`,
        avatar: playerInfo.avatar || existing.info?.avatar || null,
        userId: playerInfo.userId || existing.info?.userId || null,
        ...playerInfo
      };
      this.players.set(playerId, existing);
      this.lastActivity = Date.now();

      // Notify reconnected player
      this.sendToPlayer(playerId, {
        type: 'playerReconnected',
        playerId,
        playerNumber: existing.playerNumber
      });

      logger.info(`[GameRoom] Player ${playerId} reconnected in room ${this.roomId} as P${existing.playerNumber}`);
      return true;
    }

    const playerNumber = this.players.size + 1;
    this.players.set(playerId, {
      socket,
      playerNumber,
      ready: false,
      info: {
        username: playerInfo.username || `Player ${playerNumber}`,
        avatar: playerInfo.avatar || null,
        userId: playerInfo.userId || null,
        ...playerInfo
      }
    });

    this.lastActivity = Date.now();
    logger.info(`[GameRoom] Player ${playerId} (P${playerNumber}) joined room ${this.roomId}`);

    this.broadcast({
      type: 'playerJoined',
      playerId,
      playerNumber,
      playerInfo: this.players.get(playerId).info,
      totalPlayers: this.players.size
    }, playerId);

    // For remote: create DB row when both players are present
    if (this.gameType === 'remote' && this.players.size === 2 && !this.matchId) {
      this.createDatabaseMatch().catch(err => {
        logger.error(`[GameRoom] Error creating DB match for room ${this.roomId}:`, err);
      });
    }

    return true;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    logger.info(`[GameRoom] Player ${playerId} left room ${this.roomId}`);
    this.players.delete(playerId);

    if (this.isPlaying && !this.isPaused) {
      this.pauseGame?.(); // no-op usually but keep safe
      this.broadcast({
        type: 'playerDisconnected',
        playerId,
        reason: 'left'
      });
    }

    this.lastActivity = Date.now();

    // If remote match not started and someone left, cancel DB match
    if (this.gameType === 'remote' && !this.matchStarted && this.matchId && this.players.size < this.maxPlayers) {
      cancelRemoteMatch(this.matchId).catch(err => {
        logger.error(`[GameRoom] Error cancelling Remote_Match ${this.matchId}:`, err);
      });
    }
  }

  setPlayerReady(playerId) {
    const player = this.players.get(playerId);
    if (!player) {
      logger.warn(`[GameRoom] Player ${playerId} not found in room ${this.roomId}`);
      return;
    }

    player.ready = true;
    this.lastActivity = Date.now();

    logger.info(`[GameRoom] Player ${playerId} is ready in room ${this.roomId}`);

    this.broadcast({
      type: 'playerReady',
      playerId,
      playerNumber: player.playerNumber
    });

    logger.info(`[GameRoom] Checking if all players ready... (${this.players.size}/${this.maxPlayers})`);
    this.players.forEach((p, id) => logger.info(`  - Player ${id}: ready=${p.ready}`));

    if (this.allPlayersReady()) {
      logger.info(`[GameRoom] ✅ All players ready! Starting countdown...`);
      this.startCountdown();
    } else {
      logger.info(`[GameRoom] ⏳ Waiting for all players to be ready...`);
    }
  }

  // -------------------------
  // Countdown & central game creation
  // -------------------------
  async startCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    logger.info(`[GameRoom] 🕐 Starting countdown in room ${this.roomId}`);

    // Create DB match if needed
    if (this.gameType === 'remote' && !this.matchId) {
      await this.createDatabaseMatch().catch(err => {
        logger.error(`[GameRoom] Error creating DB match before countdown in room ${this.roomId}:`, err);
      });
    }

    let count = 3;
    this.broadcast({ type: 'countdown', count });

    this.countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        this.broadcast({ type: 'countdown', count });
        logger.info(`[GameRoom] Countdown: ${count}`);
      } else {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        logger.info(`[GameRoom] 🎮 Countdown finished! Creating central game...`);
        this.startCentralGame().catch(err => {
          logger.error(`[GameRoom] Error in startCentralGame for room ${this.roomId}:`, err);
          this.broadcast({ type: 'error', message: 'Failed to start game after countdown' });
        });
      }
    }, 1000);
  }

  // -------------------------
  // Database: Remote_Match (Case A)
  // -------------------------
  async createDatabaseMatch() {
    if (this.gameType !== 'remote') {
      logger.info(`[GameRoom] Skipping Remote_Match creation for ${this.gameType} game`);
      return;
    }

    const playersArray = Array.from(this.players.values());
    if (playersArray.length !== 2) {
      logger.warn(`[GameRoom] Cannot create DB match: need 2 players, have ${playersArray.length}`);
      return;
    }

    const player1UserId = playersArray[0].info.userId;
    const player2UserId = playersArray[1].info.userId;

    if (!player1UserId || !player2UserId) {
      logger.warn(`[GameRoom] Cannot create DB match: missing user IDs (P1=${player1UserId}, P2=${player2UserId})`);
      return;
    }

    // Insert into Remote_Match table
    try {
      this.matchId = await createRemoteMatch(player1UserId, player2UserId);
      if (this.matchId) {
        logger.info(`[GameRoom] ✅ Remote_Match created: ID=${this.matchId}`);
      }
    } catch (err) {
      logger.error(`[GameRoom] createRemoteMatch failed:`, err);
    }
  }

  // -------------------------
  // Central game creation (untouched engine)
  // -------------------------
  async startCentralGame() {
    const playersArray = Array.from(this.players.values());
    if (playersArray.length !== 2) {
      logger.warn(`[GameRoom] Cannot start central game: need 2 players, have ${playersArray.length}`);
      return;
    }

    const [p1, p2] = playersArray;
    const player1UserId = p1.info.userId;
    const player2UserId = p2.info.userId;

    if (!player1UserId || !player2UserId) {
      logger.warn(`[GameRoom] Cannot start central game: missing user IDs (P1=${player1UserId}, P2=${player2UserId})`);
      return;
    }

    logger.info(`[GameRoom] 🌐 Creating central game via HTTP for room ${this.roomId}`);

    const url = `${GAME_SERVICE_URL}/pong/game`;
    const body = {
      player1_id: player1UserId,
      player1_name: p1.info.username || `Player 1`,
      player2_id: player2UserId,
      player2_name: p2.info.username || `Player 2`
    };

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (err) {
      logger.error(`[GameRoom] ❌ HTTP error creating central game:`, err);
      this.broadcast({ type: 'error', message: 'Failed to create central game' });
      return;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.error(`[GameRoom] ❌ Central game creation failed. Status=${res.status}, body=${text}`);
      this.broadcast({ type: 'error', message: 'Failed to create central game' });
      return;
    }

    const game = await res.json();

    logger.info(`[GameRoom] ✅ Central game created from room ${this.roomId}: gameId=${game.id}, ws=${game.websocketUrl}`);

    // Save central id and mark as playing
    this.centralGameId = game.id;
    this.isPlaying = true;
    this.isPaused = false;

    // Mark DB match as started if remote
    if (this.gameType === 'remote' && this.matchId && !this.matchStarted) {
      try {
        await startRemoteMatch(this.matchId);
        this.matchStarted = true;
      } catch (err) {
        logger.error(`[GameRoom] Error calling startRemoteMatch for matchId=${this.matchId}:`, err);
      }
    }

    // Register mapping with RoomManager (gameId -> room + match)
    if (this.roomManager && typeof this.roomManager.registerCentralGame === 'function') {
      try {
        this.roomManager.registerCentralGame(game.id, this, player1UserId, player2UserId);
      } catch (err) {
        logger.error(`[GameRoom] Error registering central game mapping:`, err);
      }
    }

    // Tell clients to connect to central WS and include metadata
    this.broadcast({
      type: 'startGame',
      gameId: game.id,
      websocketUrl: game.websocketUrl,
      mode: this.gameType,
      matchId: this.matchId,
      roomId: this.roomId
    });
  }

  // -------------------------
  // Legacy/no-op paddle handler (prevents crashes)
  // -------------------------
  // In the new architecture, paddle movement should be sent to the central WS.
  // This method exists to avoid uncaught exceptions when /ws/remote still forwards 'paddleMove'.
  async updatePaddle(playerId, direction) {
    logger.info(
      `[GameRoom] updatePaddle called for player ${playerId} with direction=${direction} (no-op in central-engine mode)`
    );
    // Intentionally no-op. Optionally log or track telemetry.
    return;
  }

  // -------------------------
  // Broadcast / Send utilities
  // -------------------------
  broadcast(message, excludePlayerId = null) {
    const messageStr = JSON.stringify(message);
    this.players.forEach((player, playerId) => {
      if (playerId === excludePlayerId) return;
      try {
        if (player.socket && player.socket.readyState === 1) {
          player.socket.send(messageStr);
        }
      } catch (err) {
        logger.error(`[GameRoom] Error sending to ${playerId}:`, err);
      }
    });
  }

  sendToPlayer(playerId, message) {
    const player = this.players.get(playerId);
    if (!player || !player.socket || player.socket.readyState !== 1) return;
    try {
      player.socket.send(JSON.stringify(message));
    } catch (err) {
      logger.error(`[GameRoom] Error sending to ${playerId}:`, err);
    }
  }

  // -------------------------
  // Helpers / state
  // -------------------------
  isFull() {
    return this.players.size >= this.maxPlayers;
  }

  isEmpty() {
    return this.players.size === 0;
  }

  allPlayersReady() {
    if (this.players.size < this.maxPlayers) {
      logger.info(`[GameRoom] Not enough players: ${this.players.size}/${this.maxPlayers}`);
      return false;
    }
    for (const [playerId, player] of this.players.entries()) {
      if (!player.ready) {
        logger.info(`[GameRoom] Player ${playerId} not ready yet`);
        return false;
      }
    }
    return true;
  }

  getPlayerNumber(playerId) {
    const player = this.players.get(playerId);
    return player ? player.playerNumber : null;
  }

  getInfo() {
    const playersInfo = [];
    this.players.forEach((player, playerId) => {
      playersInfo.push({
        playerId,
        playerNumber: player.playerNumber,
        ready: player.ready,
        username: player.info.username
      });
    });

    return {
      roomId: this.roomId,
      players: playersInfo,
      totalPlayers: this.players.size,
      maxPlayers: this.maxPlayers,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      isFull: this.isFull(),
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      gameState: null,
      matchId: this.matchId,
      centralGameId: this.centralGameId
    };
  }
}
