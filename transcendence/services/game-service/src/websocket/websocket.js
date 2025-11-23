
// transcendence/services/game-service/src/websocket/websocket.js

import { movePaddle, restartGame, startGame, startGameLoop, moveBall } from '../pong/gameLogic.js';
import logger from '../utils/logger.js';

/**
 * Register WebSocket routes with the Fastify instance
 * @param {Object} fastify - Fastify instance
 * @param {Map} games - Games storage map
 * @param {Function} broadcastState - Function to broadcast game state
 */
export function registerWebSocketRoutes(fastify, games, broadcastState) {

  fastify.get('/ws/pong/game-ws/:gameId', { websocket: true }, (connection, request) => {
    const gameId = parseInt(request.params.gameId, 10);
    const game = games.get(gameId);

    logger.info(`[WS] Connection request for gameId: ${gameId}`);

    if (!game) {
      logger.warn(`[WS] Connection attempt to invalid game ID: ${gameId}`);
      connection.socket.close(1000, 'Game not found');
      return;
    }

    const ws = connection.socket;
    const gameState = game.state;
    const clients = game.clients;
    clients.add(ws);

    logger.info(`[WS] Client connected to game ${gameId} (${game.player1_name} vs ${game.player2_name}). Total clients: ${clients.size}`);

    // Send initial state
    ws.send(createInitialStateMessage(game, gameId));

    const remoteAddress = request?.socket?.remoteAddress || 'unknown';

    ws.on('message', (rawMessage) => {
      try {
        // quick log (not too verbose)
        logger.debug && logger.debug(`[WS] Raw message from ${remoteAddress} game ${gameId}: ${rawMessage.toString()}`);

        const message = JSON.parse(rawMessage.toString());

        // === QUICK PING HANDLER ===
        if (message && message.type === 'ping') {
          // reply with pong (echo ts if provided)
          if (ws.readyState === 1) {
            try {
              ws.send(JSON.stringify({
                type: 'pong',
                ts: typeof message.ts !== 'undefined' ? message.ts : Date.now(),
                serverTime: Date.now()
              }));
            } catch (err) {
              logger.debug && logger.debug(`[WS] Failed to send pong for game ${gameId}: ${err && err.message}`);
            }
          }
          return;
        }
        // ==========================

        // Delegate other message types
        handleWebSocketMessage(message, gameState, gameId, broadcastState, games, ws);
      } catch (error) {
        logger.error(`[WS] Message parse error in game ${gameId}:`, { error: error.message, stack: error.stack });
        try {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Invalid message format'
            }));
          }
        } catch (e) {
          logger.debug && logger.debug(`[WS] Failed to send error message in game ${gameId}: ${e && e.message}`);
        }
      }
    });

    ws.on('close', (code, reason) => {
      clients.delete(ws);
      logger.info(`[WS] Client disconnected from game ${gameId}. Remaining: ${clients.size}. Code: ${code}, Reason: ${reason}`);

      if (clients.size === 0) {
        logger.info(`[WS] No clients remaining in game ${gameId}, game continues running`);
      }
    });

    ws.on('error', (error) => {
      logger.error(`[WS] Socket error in game ${gameId}:`, { error: error.message, stack: error.stack });
      clients.delete(ws);
    });
  });
}

/**
 * Creates the initial state message for new WebSocket connections
 */
function createInitialStateMessage(game, gameId) {
  const cleanGameState = {
    score: game.state.score,
    ball: game.state.ball,
    paddles: game.state.paddles,
    totalScore: game.state.totalScore,
    tournament: {
      currentRound: game.state.tournament.currentRound,
      maxRounds: game.state.tournament.maxRounds,
      scoreLimit: game.state.tournament.scoreLimit,
      roundsWon: game.state.tournament.roundsWon,
      gameStatus: game.state.tournament.gameStatus,
      winner: game.state.tournament.winner,
      lastPointWinner: game.state.tournament.lastPointWinner,
      nextRoundCountdown: game.state.tournament.nextRoundCountdown,
      nextRoundNumber: game.state.tournament.nextRoundNumber
    }
  };

  return JSON.stringify({
    type: 'STATE_UPDATE',
    gameId,
    player1_id: game.player1_id,
    player2_id: game.player2_id,
    player1_name: game.player1_name,
    player2_name: game.player2_name,
    status: game.status,
    playersReady: game.playersReady || { player1: false, player2: false },
    gameType: game.gameType || 'normal',
    tournamentId: game.tournamentId || null,
    isDemo: game.isDemo || false,
    isRegistered: game.isRegistered || false,
    round: game.round || null,
    matchNumber: game.matchNumber || null,
    gameState: cleanGameState,
    createdAt: game.createdAt || null,
    startedAt: game.startedAt || null,
    completedAt: game.completedAt || null
  });
}

/**
 * Main message dispatcher for a game websocket
 */
function handleWebSocketMessage(message, gameState, gameId, broadcastState, games, ws) {
  const game = games.get(gameId);

  switch (message.type) {
    case 'MOVE_PADDLE':
      if (message.player && message.direction) {
        movePaddle(gameState, message.player, message.direction);
        broadcastState(gameId);
      } else {
        logger.warn(`[WS] Invalid MOVE_PADDLE message in game ${gameId}:`, message);
      }
      break;

    case 'PLAYER_READY':
      // call handler and *log using message fields* (no undefined variables)
      handlePlayerReady(message, game, gameId, broadcastState);
      logger.info(`[WS] PLAYER_READY handled for game ${gameId}: player=${message.player ?? null}, player_id=${message.player_id ?? null}, status=${game?.status ?? 'N/A'}`);
      break;

    case 'RESTART_GAME':
      restartGame(gameState);
      broadcastState(gameId);
      logger.info(`[WS] Game ${gameId} restarted`);
      break;

    case 'START_GAME':
      if (gameState.tournament.gameStatus !== 'playing') {
        startGame(gameState);
      }

      if (game && !gameState.gameLoopInterval) {
        logger.info(`[WS] Restarting game loop for game ${gameId}`);
        const getClientCount = () => game.clients.size;
        const newLoop = startGameLoop(gameState, () => broadcastState(gameId), moveBall, getClientCount);
        gameState.gameLoopInterval = newLoop;
        game.loop = newLoop;
      }

      broadcastState(gameId);
      logger.info(`[WS] Game ${gameId} started`);
      break;

    case 'health_check':
      logger.debug(`[WS] Health check received in game ${gameId}`);
      break;

    case 'stats':
      broadcastState(gameId);
      break;

    default:
      // server-side quick ping fallback
      if (message && message.type === 'ping') {
        try {
          ws.send(JSON.stringify({ type: 'pong', ts: message.ts ?? Date.now() }));
        } catch (e) { /* ignore */ }
        break;
      }
      logger.warn(`[WS] Unknown message type in game ${gameId}: ${message.type}`);
  }
}

/**
 * Handle PLAYER_READY messages
 * Supports:
 *   - { player: "player1" } / { player: "player2" }  (remote clients)
 *   - { player_id: 123 } (legacy clients)
 */
function handlePlayerReady(message, game, gameId, broadcastState) {
  const { player_id, player } = message;

  if (!game || game.isDemo) {
    logger.warn(`[WS] PLAYER_READY ignored for demo/invalid game ${gameId}`);
    return;
  }

  if (!game.playersReady) {
    game.playersReady = { player1: false, player2: false };
  }

  if (game.status !== 'ready') {
    logger.warn(`[WS] PLAYER_READY ignored, game ${gameId} status: ${game.status}`);
    broadcastToGame(game, {
      type: 'ERROR',
      message: `Game is not ready for players to ready up. Status: ${game.status}`
    });
    return;
  }

  // find slot
  let playerSlot = null;

  if (player === 'player1' || player === 'player2') {
    playerSlot = player;
  } else if (typeof player_id !== 'undefined') {
    const pid = parseInt(player_id, 10);
    if (!Number.isNaN(pid)) {
      if (game.player1_id === pid) playerSlot = 'player1';
      else if (game.player2_id === pid) playerSlot = 'player2';
    }
  }

  if (!playerSlot) {
    logger.warn(`[WS] PLAYER_READY with unknown player info in game ${gameId}`, { player, player_id });
    return;
  }

  // mark ready
  game.playersReady[playerSlot] = true;

  logger.info(`[WS] Player ${playerSlot} marked ready in game ${gameId}. playersReady=${JSON.stringify(game.playersReady)}`);

  broadcastToGame(game, {
    type: 'PLAYER_READY_UPDATE',
    gameId,
    playerSlot,
    playersReady: game.playersReady,
    // be defensive with name — stringify to avoid "2 is ready!"
    message: `${String(game[`${playerSlot}_name`] ?? playerSlot)} is ready!`
  });

  // both ready → start countdown
  if (game.playersReady.player1 && game.playersReady.player2) {
    logger.info(`[WS] Both players ready in game ${gameId}, starting countdown`);
    game.status = 'starting';
    startGameCountdown(game, gameId, broadcastState);
  }
}

/**
 * Start a countdown before the game begins
 */
function startGameCountdown(game, gameId, broadcastState) {
  let countdown = 3;

  broadcastToGame(game, {
    type: 'GAME_START_COUNTDOWN',
    gameId,
    countdown,
    message: `Game starting in ${countdown}...`
  });

  const countdownInterval = setInterval(() => {
    countdown--;

    if (countdown > 0) {
      broadcastToGame(game, {
        type: 'GAME_START_COUNTDOWN',
        gameId,
        countdown,
        message: `Game starting in ${countdown}...`
      });
    } else {
      clearInterval(countdownInterval);
      game.status = 'active';
      game.startedAt = new Date();

      // Reset game state and start engine
      startGame(game.state);

      // Broadcast game started
      broadcastToGame(game, {
        type: 'GAME_STARTED',
        gameId,
        message: 'Game has started! Good luck!'
      });

      // Broadcast initial state
      broadcastState(gameId);

      logger.info(`[WS] Game ${gameId} started!`);
    }
  }, 1000);

  game.countdownInterval = countdownInterval;
}

/**
 * Helper — broadcast a plain object to every client
 */
function broadcastToGame(game, message) {
  const messageStr = JSON.stringify(message);
  for (const client of game.clients) {
    try {
      if (client.readyState === 1) client.send(messageStr);
    } catch (err) {
      logger.warn(`[WS] Error sending to client in game: ${err && err.message}`);
    }
  }
}
