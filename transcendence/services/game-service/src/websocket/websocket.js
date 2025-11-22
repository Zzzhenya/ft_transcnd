/**
 * WebSocket Module - Handles real-time game communication
 * Supports game types: normal, tournament
 */

import { movePaddle, restartGame, startGame, startGameLoop, moveBall } from '../pong/gameLogic.js';
import logger from '../utils/logger.js';

/**
 * Register WebSocket routes with the Fastify instance
 * @param {Object} fastify - Fastify instance
 * @param {Map} games - Games storage map
 * @param {Function} broadcastState - Function to broadcast game state
 */


export function registerWebSocketRoutes(fastify, games, broadcastState) {
  
  /**
   * WebSocket route per game - handles all game types
   * GET /ws/pong/game-ws/:gameId (WebSocket upgrade)
   */
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
    logger.info(`[WS] Client added to WebSocket connection for game ${gameId}`);
    // Determine game type for logging
    let gameTypeLabel = 'NORMAL';
    if (game.gameType === 'tournament') {
      gameTypeLabel = 'TOURNAMENT';
    }

    logger.info(
      `[WS] Client connected to ${gameTypeLabel} game ${gameId} (${game.player1_name} vs ${game.player2_name}). Total clients: ${clients.size}`
    );

    // Send initial state to the new client
    ws.send(createInitialStateMessage(game, gameId));

    ws.on('message', (rawMessage) => {
  try {
    const message = JSON.parse(rawMessage.toString());

    // === QUICK PING HANDLER ===
    if (message && message.type === 'ping') {
      // Only reply if socket is open
      if (ws.readyState === 1) {
        try {
          // If client provided ts, echo it back; include serverTime for debugging/clock info
          ws.send(JSON.stringify({
            type: 'pong',
            ts: typeof message.ts !== 'undefined' ? message.ts : Date.now(),
            serverTime: Date.now()
          }));
        } catch (err) {
          // log but don't crash; avoid super-verbose logging for every ping
          logger.debug && logger.debug(`[WS] Failed to send pong for game ${gameId}: ${err && err.message}`);
        }
      }
      // We handled it — no need to pass to the main message handler
      return;
    }
    // ==========================

    // Delegate other message types to the main handler
    handleWebSocketMessage(message, gameState, gameId, broadcastState, games);

  } catch (error) {
    logger.error(`[WS] Message parse error in game ${gameId}:`, { error: error.message, stack: error.stack });
    // reply with an error to the sender if socket still open
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


    // Handle client disconnection
    ws.on('close', (code, reason) => {
      clients.delete(ws);
      logger.info(
        `[WS] Client disconnected from ${gameTypeLabel} game ${gameId}. Remaining: ${clients.size}. Code: ${code}, Reason: ${reason}`
      );
      
      // Game continues running even if no clients are connected
      if (clients.size === 0) {
        logger.info(`[WS] No clients remaining in game ${gameId}, game continues running`);
      }
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
      logger.error(`[WS] Socket error in ${gameTypeLabel} game ${gameId}:`, { error: error.message, stack: error.stack });
      clients.delete(ws);
    });
  });
}

/**
 * Creates the initial state message for new WebSocket connections
 * @param {Object} game - The game object
 * @param {number} gameId - The game ID
 * @returns {string} JSON string of the initial state
 */
function createInitialStateMessage(game, gameId) {
  // Create a clean game state without circular references (intervals)
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
      // Exclude countdownInterval - it's not serializable
    }
    // Exclude gameLoopInterval - it's not serializable
  };

  logger.debug(`[WS] Initial state for game ${gameId}:`, cleanGameState);

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
    // timestamps
    createdAt: game.createdAt || null,
    startedAt: game.startedAt || null,
    completedAt: game.completedAt || null
  });
}

/**
 * Handles WebSocket messages based on message type
 * @param {Object} message - Parsed WebSocket message
 * @param {Object} gameState - Current game state
 * @param {number} gameId - Game ID for broadcasting
 * @param {Function} broadcastState - Function to broadcast state
 * @param {Map} games - Games storage map
 */
function handleWebSocketMessage(message, gameState, gameId, broadcastState, games) {
  const game = games.get(gameId);

  switch (message.type) {
    case 'MOVE_PADDLE':
      if (message.player && message.direction) {
        movePaddle(gameState, message.player, message.direction);
        broadcastState(gameId);
      } else {
        console.warn(`[WS] Invalid MOVE_PADDLE message in game ${gameId}:`, message);
      }
      break;

    case 'PLAYER_READY':
      handlePlayerReady(message, game, gameId, broadcastState);
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

      //startGame(gameState);

      // Restart game loop if it was cleared (e.g., after restart)
      if (game && !gameState.gameLoopInterval) {
        logger.info(`[WS] Restarting game loop for game ${gameId}`);
        const getClientCount = () => game.clients.size;
        const newLoop = startGameLoop(gameState, () => broadcastState(gameId), moveBall, getClientCount);
        gameState.gameLoopInterval = newLoop;
        game.loop = newLoop; // Also update the game object
      }
      
      broadcastState(gameId);
      logger.info(`[WS] Game ${gameId} started`);
      break;
    
    case 'health_check':
      // Respond to health check messages
      logger.debug(`[WS] Health check received in game ${gameId}`);
      break;

    case 'stats':
      broadcastState(gameId);
      // I don't know what to do here but there is no function named getStats()
      // getStats(gameState);
      break;

    case 'ping':
    // Echo back a pong with same timestamp for client RTT calc
      client.send(JSON.stringify({ type: 'pong', ts: message.ts ?? Date.now() }));
    break;


    default:
      console.warn(`[WS] Unknown message type in game ${gameId}: ${message.type}`);
  }
}

/**
 * Handle player ready messages for multiplayer lobby system
 * @param {Object} message - The PLAYER_READY message
 * @param {Object} game - The game object
 * @param {number} gameId - Game ID
 * @param {Function} broadcastState - Broadcast function
//  */
// function handlePlayerReady(message, game, gameId, broadcastState) {
//   const { player_id } = message;

//   if (!game || game.isDemo) {
//     console.warn(`[WS] PLAYER_READY message ignored for demo game ${gameId}`);
//     return;
//   }

//   if (game.status !== 'ready') {
//     console.warn(`[WS] PLAYER_READY message ignored, game ${gameId} status: ${game.status}`);
//     broadcastToGame(game, {
//       type: 'ERROR',
//       message: `Game is not ready for players to ready up. Status: ${game.status}`
//     });
//     return;
//   }

//   // Check if this player belongs to the game
//   let playerSlot = null;
//   if (game.player1_id === parseInt(player_id)) {
//     playerSlot = 'player1';
//   } else if (game.player2_id === parseInt(player_id)) {
//     playerSlot = 'player2';
//   } else {
//     console.warn(`[WS] PLAYER_READY from unknown player ${player_id} in game ${gameId}`);
//     return;
//   }

//   // Mark player as ready
//   game.playersReady[playerSlot] = true;
//   logger.info(`[WS] Player ${playerSlot} (${player_id}) is ready in game ${gameId}`);

//   // Broadcast player ready status
//   broadcastToGame(game, {
//     type: 'PLAYER_READY_UPDATE',
//     gameId,
//     playerSlot,
//     playersReady: game.playersReady,
//     message: `${game[playerSlot + '_name']} is ready!`
//   });

//   // Check if both players are ready
//   if (game.playersReady.player1 && game.playersReady.player2) {
//     logger.info(`[WS] Both players ready in game ${gameId}, starting countdown`);
//     game.status = 'starting';
    
//     // Start countdown
//     startGameCountdown(game, gameId, broadcastState);
//   }
// }
function handlePlayerReady(message, game, gameId, broadcastState) {
  const { player_id, player } = message; // player is expected to be "player1" or "player2"

  if (!game || game.isDemo) {
    console.warn(`[WS] PLAYER_READY message ignored for demo game ${gameId}`);
    return;
  }

  if (!game.playersReady) {
    game.playersReady = { player1: false, player2: false };
  }

  if (game.status !== 'ready') {
    console.warn(`[WS] PLAYER_READY message ignored, game ${gameId} status: ${game.status}`);
    broadcastToGame(game, {
      type: 'ERROR',
      message: `Game is not ready for players to ready up. Status: ${game.status}`
    });
    return;
  }

  // Decide which slot this message belongs to
  let playerSlot = null;

  // 1) Prefer explicit slot from client (remote mode)
  if (player === 'player1' || player === 'player2') {
    playerSlot = player;
  } else if (player_id != null) {
    // 2) Fallback: map numeric player_id (for existing single-game clients)
    const pid = parseInt(player_id, 10);
    if (Number.isNaN(pid)) {
      console.warn(`[WS] PLAYER_READY with invalid player_id "${player_id}" in game ${gameId}`);
      return;
    }

    if (game.player1_id === pid) {
      playerSlot = 'player1';
    } else if (game.player2_id === pid) {
      playerSlot = 'player2';
    } else {
      console.warn(`[WS] PLAYER_READY from unknown player_id ${player_id} in game ${gameId}`);
      return;
    }
  } else {
    console.warn(`[WS] PLAYER_READY without player or player_id in game ${gameId}`);
    return;
  }

  // Mark player as ready
  game.playersReady[playerSlot] = true;
  logger.info(`[WS] Player ${playerSlot} (${player_id ?? 'no-id'}) is ready in game ${gameId}`);

  // Broadcast player ready status
  broadcastToGame(game, {
    type: 'PLAYER_READY_UPDATE',
    gameId,
    playerSlot,
    playersReady: game.playersReady,
    message: `${game[playerSlot + '_name']} is ready!`
  });

  // Check if both players are ready
  if (game.playersReady.player1 && game.playersReady.player2) {
    logger.info(`[WS] Both players ready in game ${gameId}, starting countdown`);
    game.status = 'starting';

    // Start countdown (existing logic)
    startGameCountdown(game, gameId, broadcastState);
  }
}

/**
 * Start a countdown before the game begins
 * @param {Object} game - The game object
 * @param {number} gameId - Game ID
 * @param {Function} broadcastState - Broadcast function
 */
function startGameCountdown(game, gameId, broadcastState) {
  let countdown = 3;
  
  // Broadcast countdown start
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
      // Start the game
      clearInterval(countdownInterval);
      game.status = 'active';
      game.startedAt = new Date();
      
      // Reset game state
      startGame(game.state);
      
      // Broadcast game start
      broadcastToGame(game, {
        type: 'GAME_STARTED',
        gameId,
        message: 'Game has started! Good luck!'
      });
      
      // Broadcast initial game state
      broadcastState(gameId);
      
      logger.info(`[WS] Game ${gameId} started!`);
    }
  }, 1000);

  // Store interval for cleanup
  game.countdownInterval = countdownInterval;
}

/**
 * Broadcast a message to all clients in a game
 * @param {Object} game - The game object
 * @param {Object} message - Message to broadcast
 */
function broadcastToGame(game, message) {
  const messageStr = JSON.stringify(message);
  for (const client of game.clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(messageStr);
    }
  }
}
