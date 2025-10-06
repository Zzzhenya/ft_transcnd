/**
 * WebSocket Module - Handles real-time game communication
 * Supports all game types: demo, normal, tournament
 */

import { movePaddle, restartGame, startGame } from '../pong/gameLogic.js';

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

    if (!game) {
      console.warn(`[WS] Connection attempt to invalid game ID: ${gameId}`);
      connection.socket.close(1000, 'Game not found');
      return;
    }

    const ws = connection.socket;
    const gameState = game.state;
    const clients = game.clients;
    clients.add(ws);

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
        handleWebSocketMessage(message, gameState, gameId, broadcastState);
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
        handleWebSocketMessage(message, gameState, gameId, broadcastState);
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
  return JSON.stringify({
    type: 'STATE_UPDATE',
    gameId,
    player1_id: game.player1_id,
    player2_id: game.player2_id,
    player1_name: game.player1_name,
    player2_name: game.player2_name,
    gameType: game.gameType || 'normal',
    tournamentId: game.tournamentId || null,
    isDemo: game.isDemo || false,
    isRegistered: game.isRegistered || false,
    round: game.round || null,
    matchNumber: game.matchNumber || null,
    gameState: game.state
  });
}

/**
 * Handles WebSocket messages based on message type
 * @param {Object} message - Parsed WebSocket message
 * @param {Object} gameState - Current game state
 * @param {number} gameId - Game ID for broadcasting
 * @param {Function} broadcastState - Function to broadcast state
 */
function handleWebSocketMessage(message, gameState, gameId, broadcastState) {
  switch (message.type) {
    case 'MOVE_PADDLE':
      if (message.player && message.direction) {
        movePaddle(gameState, message.player, message.direction);
        broadcastState(gameId);
      } else {
        console.warn(`[WS] Invalid MOVE_PADDLE message in game ${gameId}:`, message);
      }
      break;

    case 'RESTART_GAME':
      restartGame(gameState);
      broadcastState(gameId);
      console.log(`[WS] Game ${gameId} restarted`);
      break;

    case 'START_GAME':
      startGame(gameState);
      broadcastState(gameId);
      console.log(`[WS] Game ${gameId} started`);
      break;
    
    case 'pause_game':
      gameState.isPaused = true;
      broadcastState(gameId);
      console.log(`[WS] Game ${gameId} paused`);
      break;

    case 'health_check':
      // Respond to health check messages
      console.log(`[WS] Health check received in game ${gameId}`);
      break;

    case 'stats':
      getStats(gameState);
      break;

    default:
      console.warn(`[WS] Unknown message type in game ${gameId}: ${message.type}`);
  }
}
