/**
 * Single Game Route - Handles single games only
 * Creates games with 3 rounds and score limit of 5
 */

import {
  startGameLoop,
  initialGameState,
  moveBall,
  movePaddle,
  cleanupGame
} from '../pong/gameLogic.js';

/**
 * Register single game routes with the Fastify instance
 * @param {Object} fastify - Fastify instance
 * @param {Map} games - Games storage map
 * @param {Object} counters - Object containing nextGameId and nextPlayerId
 * @param {Function} broadcastState - Function to broadcast game state
 */
export function registerSingleGameRoutes(fastify, games, counters, broadcastState) {
  
  /**
   * Create a single game for players
   * POST /ws/pong/game
   * Body: { 
   *   player1_id: number, 
   *   player1_name: string,
   *   player2_id?: number (optional - for immediate full game creation),
   *   player2_name?: string (optional - for immediate full game creation)
   * }
   */
  fastify.post('/ws/pong/game', async (request, reply) => {
    try {
      const { 
        player1_id, 
        player2_id, 
        player1_name, 
        player2_name
      } = request.body;

      // Validation for single player creation
      const validation = validateGameCreation(request.body);
      if (!validation.valid) {
        return reply.code(400).send({ error: validation.error });
      }

      const gameId = counters.nextGameId++;
      const state = initialGameState();
      state.gameId = gameId;
      
      // Set game rules: 3 rounds, score limit 5
      state.maxRounds = 3;
      state.scoreLimit = 5;
      state.currentRound = 1;
      state.roundsWon = { player1: 0, player2: 0 };
      
      const clients = new Set();

      // Start a game loop that updates the ball and broadcasts per game
      const loop = startGameLoop(
        state, 
        () => broadcastState(gameId), 
        moveBall, 
        () => clients.size
      );
      state.gameLoopInterval = loop; // Store reference for cleanup

      const game = {
        state,
        clients,
        loop,
        player1_id: parseInt(player1_id),
        player2_id: player2_id ? parseInt(player2_id) : null,
        player1_name: player1_name.trim(),
        player2_name: player2_name ? player2_name.trim() : null,
        status: player2_id ? 'ready' : 'waiting_for_player',
        isDemo: false,
        isRegistered: true,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        winner: null,
        finalScore: { player1: 0, player2: 0 },
        playersReady: { player1: false, player2: false },
        // Game rules
        maxRounds: 3,
        scoreLimit: 5
      };

      games.set(gameId, game);

      const playerInfo = player2_id ? 
        `${player1_name} vs ${player2_name}` : 
        `${player1_name} (waiting for opponent)`;
      console.log(`[Game] Created single game ${gameId} with players ${playerInfo} (3 rounds, score limit: 5)`);

      const response = {
        id: gameId,
        player1_id: game.player1_id,
        player2_id: game.player2_id,
        player1_name: game.player1_name,
        player2_name: game.player2_name,
        status: game.status,
        isRegistered: true,
        createdAt: game.createdAt,
        maxRounds: game.maxRounds,
        scoreLimit: game.scoreLimit,
        websocketUrl: `ws://localhost:3002/ws/pong/game-ws/${gameId}`,
        message: 'Single game created successfully (3 rounds, score limit: 5)'
      };

      return reply.code(201).send(response);

    } catch (error) {
      console.error('[SingleGame] Error creating single game:', error);
      return reply.code(500).send({ error: 'Failed to create single game' });
    }
  });

  /**
   * Join an existing game as player2
   * POST /ws/pong/game/:gameId/join
   * Body: { 
   *   player2_id: number, 
   *   player2_name: string
   * }
   */
  fastify.post('/ws/pong/game/:gameId/join', async (request, reply) => {
    try {
      const gameId = parseInt(request.params.gameId, 10);
      const { player2_id, player2_name } = request.body;

      // Validation
      if (!player2_id || !player2_name) {
        return reply.code(400).send({ 
          error: 'player2_id and player2_name are required' 
        });
      }

      if (typeof player2_name !== 'string' || player2_name.trim().length === 0) {
        return reply.code(400).send({ 
          error: 'player2_name must be a non-empty string' 
        });
      }

      const game = games.get(gameId);
      if (!game) {
        return reply.code(404).send({ error: 'Game not found' });
      }

      if (game.isDemo) {
        return reply.code(400).send({ error: 'Cannot join demo games' });
      }

      if (game.status !== 'waiting_for_player') {
        return reply.code(400).send({ 
          error: `Game is not accepting players. Current status: ${game.status}` 
        });
      }

      if (game.player2_id) {
        return reply.code(400).send({ error: 'Game already has 2 players' });
      }

      if (parseInt(player2_id) === game.player1_id) {
        return reply.code(400).send({ 
          error: 'Cannot join your own game' 
        });
      }

      // Join the game
      game.player2_id = parseInt(player2_id);
      game.player2_name = player2_name.trim();
      game.status = 'ready';

      console.log(`[Game] Player ${player2_name} joined game ${gameId}. Status: ${game.status}`);

      // Broadcast to connected clients that player joined
      const joinMessage = JSON.stringify({
        type: 'PLAYER_JOINED',
        gameId: gameId,
        player2_name: game.player2_name,
        status: game.status,
        message: `${game.player2_name} joined the game! Both players can now ready up.`
      });

      for (const client of game.clients) {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(joinMessage);
        }
      }

      const response = {
        id: gameId,
        player1_id: game.player1_id,
        player2_id: game.player2_id,
        player1_name: game.player1_name,
        player2_name: game.player2_name,
        status: game.status,
        message: 'Successfully joined the game',
        websocketUrl: `ws://localhost:3002/ws/pong/game-ws/${gameId}`
      };

      return reply.code(200).send(response);

    } catch (error) {
      console.error('[Game] Error joining game:', error);
      return reply.code(500).send({ error: 'Failed to join game' });
    }
  });

  /**
   * Get all single games
   * GET /ws/pong/game
   */
  fastify.get('/ws/pong/game', async (request, reply) => {
    try {
      const singleGames = [];
      
      for (const [gameId, game] of games.entries()) {
        if (game.isRegistered && !game.isDemo) {
          singleGames.push({
            id: gameId,
            player1_id: game.player1_id,
            player2_id: game.player2_id,
            player1_name: game.player1_name,
            player2_name: game.player2_name,
            status: game.status,
            clientCount: game.clients.size,
            createdAt: game.createdAt,
            startedAt: game.startedAt,
            completedAt: game.completedAt,
            winner: game.winner,
            finalScore: game.finalScore,
            currentRound: game.state?.currentRound || 1,
            roundsWon: game.state?.roundsWon || { player1: 0, player2: 0 },
            maxRounds: game.maxRounds,
            scoreLimit: game.scoreLimit
          });
        }
      }

      return reply.send({
        games: singleGames,
        total: singleGames.length,
        message: `Found ${singleGames.length} single games`
      });

    } catch (error) {
      console.error('[SingleGames] Error fetching single games:', error);
      return reply.code(500).send({ error: 'Failed to fetch single games' });
    }
  });

  /**
   * Get specific single game details
   * GET /ws/pong/game/:gameId
   */
  fastify.get('/ws/pong/game/:gameId', async (request, reply) => {
    try {
      const gameId = parseInt(request.params.gameId, 10);
      const game = games.get(gameId);

      if (!game) {
        return reply.code(404).send({ error: 'Game not found' });
      }

      if (game.isDemo) {
        return reply.code(400).send({ error: 'This is a demo game, not a single game' });
      }

      return reply.send({
        id: gameId,
        player1_id: game.player1_id,
        player2_id: game.player2_id,
        player1_name: game.player1_name,
        player2_name: game.player2_name,
        status: game.status,
        clientCount: game.clients.size,
        createdAt: game.createdAt,
        startedAt: game.startedAt,
        completedAt: game.completedAt,
        winner: game.winner,
        finalScore: game.finalScore,
        currentRound: game.state?.currentRound || 1,
        roundsWon: game.state?.roundsWon || { player1: 0, player2: 0 },
        maxRounds: game.maxRounds,
        scoreLimit: game.scoreLimit,
        gameState: game.state
      });

    } catch (error) {
      console.error(`[SingleGame] Error fetching game details:`, error);
      return reply.code(500).send({ error: 'Failed to fetch game details' });
    }
  });

  /**
   * Update game result when a game completes
   * PUT /ws/pong/game/:gameId/result
   * Body: { winner: 'player1' | 'player2', finalScore: { player1: number, player2: number }, roundsWon: { player1: number, player2: number } }
   */
  fastify.put("/ws/pong/game/:gameId/result", async (req, reply) => {
  const game = games.get(req.params.gameId);
  if (!game) return reply.code(404).send({ error: "Game not found" });

  const { winner } = req.body;
  game.status = "completed";
  game.winner = winner;

  // ✅ Stop loop here to prevent memory leaks
  if (game.loop) {
    clearInterval(game.loop);
    game.loop = null;
  }
  
  // Clean up all intervals in game state
  cleanupGame(game.state);

  // Broadcast final state to connected clients
  broadcastState(game.id);

  const result = {
    gameId: game.id,
    winner: winner,
    timestamp: Date.now(),
  };
  console.log(`[Game ${game.id}] Result recorded:`, result);

  games.delete(req.params.gameId);
  reply.send({ message: "Game result recorded", result });
  });
}

/**
 * Validates game creation parameters
 * Supports both single-player creation and full game creation
 * @param {Object} body - Request body
 * @returns {Object} Validation result
 */
function validateGameCreation(body) {
  const { player1_id, player2_id, player1_name, player2_name } = body;
  
  // Player 1 is always required
  if (!player1_id || !player1_name) {
    return {
      valid: false,
      error: 'player1_id and player1_name are required'
    };
  }

  if (typeof player1_name !== 'string' || player1_name.trim().length === 0) {
    return {
      valid: false,
      error: 'player1_name must be a non-empty string'
    };
  }

  // If player2 info is provided, validate it
  if (player2_id || player2_name) {
    if (!player2_id || !player2_name) {
      return {
        valid: false,
        error: 'If providing player2 info, both player2_id and player2_name are required'
      };
    }

    if (typeof player2_name !== 'string' || player2_name.trim().length === 0) {
      return {
        valid: false,
        error: 'player2_name must be a non-empty string'
      };
    }

    if (player1_id === player2_id) {
      return {
        valid: false,
        error: 'player1_id and player2_id must be different'
      };
    }
  }
  
  return { valid: true };
}

/**
 * POST /ws/pong/game/:gameId/move
 * Move player paddle in normal game
 */
export function addMovementEndpoint(fastify, games, broadcastState) {
  fastify.post('/ws/pong/game/:gameId/move', async (request, reply) => {
    try {
      const { gameId } = request.params;
      const { player, direction } = request.body;

      // Validate input
      if (!gameId || !player || !direction) {
        return reply.code(400).send({ 
          error: 'Missing required fields: gameId, player, direction' 
        });
      }

      if (!['player1', 'player2'].includes(player)) {
        return reply.code(400).send({ 
          error: 'Player must be "player1" or "player2"' 
        });
      }

      if (!['up', 'down'].includes(direction)) {
        return reply.code(400).send({ 
          error: 'Direction must be "up" or "down"' 
        });
      }

      const game = games.get(parseInt(gameId));
      if (!game) {
        return reply.code(404).send({ error: 'Game not found' });
      }

      if (game.isDemo) {
        return reply.code(400).send({ error: 'This endpoint is for normal games only' });
      }

      // Move the paddle
      movePaddle(game.state, player, direction);

      // Broadcast the updated state
      broadcastState(parseInt(gameId));

      return reply.send({
        success: true,
        message: `Moved ${player} paddle ${direction}`,
        paddlePosition: game.state.paddles[player],
        gameState: {
          ball: game.state.ball,
          paddles: game.state.paddles,
          score: game.state.score
        }
      });

    } catch (error) {
      console.error('[Game] Error moving paddle:', error);
      return reply.code(500).send({ error: 'Failed to move paddle' });
    }
  });
}
