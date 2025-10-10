/**
 * WebSocket Module - Handles real-time game communication
 * Supports all game types: demo, normal, tournament
 */

import { movePaddle, restartGame, startGame, startGameLoop, moveBall } from '../pong/gameLogic.js';

/**
 * Register WebSocket routes with the Fastify instance
 * @param {Object} fastify - Fastify instance
 * @param {Map} games - Games storage map
 * @param {Function} broadcastState - Function to broadcast game state
 */

// function retnum(str) { 
//     var num = str.replace(/[^0-9]/g, ''); 
//     return num; 
// }


export function registerWebSocketRoutes(fastify, games, broadcastState) {
  
  /**
   * WebSocket route per game - handles all game types
   * GET /ws/pong/game-ws/:gameId (WebSocket upgrade)
   */
  fastify.get('/ws/pong/game-ws/:gameId', { websocket: true }, (connection, request) => {
    // const gameId = parseInt(retnum(request.params.gameId), 10);
    const gameId = parseInt(request.params.gameId, 10);
    const game = games.get(gameId);

    console.log(games)

    // const gameId = req.params.gameId;
    // const game = gameId;

    console.log("🆔gameId= ", gameId)

    if (!game) {
      console.warn(`[WS] Connection attempt to invalid game ID: ${gameId}`);
      connection.socket.close(1000, 'Game not found');
      return;
    }

    const ws = connection.socket;

    const gameState = game.state;
    const clients = game.clients;
    clients.add(ws);
    console.log("🆔add client to ws: ")
    // Determine game type for logging
    let gameTypeLabel = 'NORMAL';
    if (game.isDemo) {
      gameTypeLabel = 'DEMO';
    } else if (game.gameType === 'tournament') {
      gameTypeLabel = 'TOURNAMENT';
    }

    console.log(
      `[WS] Client connected to ${gameTypeLabel} game ${gameId} (${game.player1_name} vs ${game.player2_name}). Total clients: ${clients.size}`
    );

    // Send initial state to the new client
    ws.send(createInitialStateMessage(game, gameId));

    // Handle incoming WebSocket messages
    ws.on('message', (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        console.log(message)
        handleWebSocketMessage(message, gameState, gameId, broadcastState, games);
      } catch (error) {
        console.error(`[WS] Message parse error in game ${gameId}:`, error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle client disconnection
    ws.on('close', (code, reason) => {
      clients.delete(ws);
      console.log(
        `[WS] Client disconnected from ${gameTypeLabel} game ${gameId}. Remaining: ${clients.size}. Code: ${code}, Reason: ${reason}`
      );
      
      // Optionally pause game if no clients are connected
      if (clients.size === 0) {
        console.log(`[WS] No clients remaining in game ${gameId}, game continues running`);
      }
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error(`[WS] Socket error in ${gameTypeLabel} game ${gameId}:`, error);
      clients.delete(ws);
    });
  });

  /**
   * WebSocket route for demo games (alternative endpoint)
   * GET /demo-ws/:gameId (WebSocket upgrade)
   */
  fastify.get('/ws/pong/demo-ws/:gameId', { websocket: true }, (connection, request) => {
    const gameId = parseInt(request.params.gameId, 10);
    const game = games.get(gameId);

    if (!game || !game.isDemo) {
      console.warn(`[Demo-WS] Connection attempt to invalid demo game ID: ${gameId}`);
      connection.socket.close(1000, 'Demo game not found');
      return;
    }

    // Redirect to main WebSocket handler with demo flag
    console.log(`[Demo-WS] Redirecting demo game ${gameId} to main WebSocket handler`);
    
    // Use the same logic as the main WebSocket route

    const ws = connection.socket;
    const gameState = game.state;
    const clients = game.clients;
    clients.add(ws);

    console.log(`[Demo-WS] Client connected to DEMO game ${gameId} (${game.player1_name} vs ${game.player2_name}). Total clients: ${clients.size}`);

    // Send initial state
    ws.send(createInitialStateMessage(game, gameId));

    // Handle messages
    ws.on('message', (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        handleWebSocketMessage(message, gameState, gameId, broadcastState, games);
      } catch (error) {
        console.error(`[Demo-WS] Message parse error in demo game ${gameId}:`, error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle disconnection
    ws.on('close', (code, reason) => {
      clients.delete(ws);
      console.log(`[Demo-WS] Client disconnected from DEMO game ${gameId}. Remaining: ${clients.size}`);
    });

    ws.on('error', (error) => {
      console.error(`[Demo-WS] Socket error in demo game ${gameId}:`, error);
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

  console.log(cleanGameState);

  return JSON.stringify({
    type: 'STATE_UPDATE',
    id: gameId,
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
    gameState: cleanGameState
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
      console.log(`[WS] Game ${gameId} restarted`);
      break;

    case 'START_GAME':
      startGame(gameState);
      
      // Restart game loop if it was cleared (e.g., after restart)
      if (game && !gameState.gameLoopInterval) {
        console.log(`[WS] Restarting game loop for game ${gameId}`);
        const getClientCount = () => game.clients.size;
        const newLoop = startGameLoop(gameState, () => broadcastState(gameId), moveBall, getClientCount);
        gameState.gameLoopInterval = newLoop;
        game.loop = newLoop; // Also update the game object
      }
      
      broadcastState(gameId);
      console.log(`[WS] Game ${gameId} started`);
      break;
    
    case 'pause_game':
      gameState.isPaused = true;
      broadcastState(gameId);
      console.log(`[WS] Game ${gameId} paused`);
      break;

    case 'unpause_game':
      gameState.isPaused = false;
      broadcastState(gameId);
      console.log(`[WS] Game ${gameId} unpaused`);
      break;

    case 'health_check':
      // Respond to health check messages
      console.log(`[WS] Health check received in game ${gameId}`);
      break;

    case 'stats':
      broadcastState(gameId);
      // I don't know what to do here but there is no function named getStats()
      // getStats(gameState);
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
 */
function handlePlayerReady(message, game, gameId, broadcastState) {
  const { player_id } = message;

  if (!game || game.isDemo) {
    console.warn(`[WS] PLAYER_READY message ignored for demo game ${gameId}`);
    return;
  }

  if (game.status !== 'ready') {
    console.warn(`[WS] PLAYER_READY message ignored, game ${gameId} status: ${game.status}`);
    broadcastToGame(game, {
      type: 'ERROR',
      message: `Game is not ready for players to ready up. Status: ${game.status}`
    });
    return;
  }

  // Check if this player belongs to the game
  let playerSlot = null;
  if (game.player1_id === parseInt(player_id)) {
    playerSlot = 'player1';
  } else if (game.player2_id === parseInt(player_id)) {
    playerSlot = 'player2';
  } else {
    console.warn(`[WS] PLAYER_READY from unknown player ${player_id} in game ${gameId}`);
    return;
  }

  // Mark player as ready
  game.playersReady[playerSlot] = true;
  console.log(`[WS] Player ${playerSlot} (${player_id}) is ready in game ${gameId}`);

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
    console.log(`[WS] Both players ready in game ${gameId}, starting countdown`);
    game.status = 'starting';
    
    // Start countdown
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
      
      console.log(`[WS] Game ${gameId} started!`);
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
