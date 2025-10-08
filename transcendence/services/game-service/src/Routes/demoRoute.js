/**
 * Demo Route - Handles demo game sessions
 * Creates temporary games with auto-generated players
 */

import {
  startGameLoop,
  initialGameState,
  moveBall,
  movePaddle,
  startRoundCountdown,
  cleanupGame
} from '../pong/gameLogic.js';

/**
 * Register demo routes with the Fastify instance
 * @param {Object} fastify - Fastify instance
 * @param {Map} games - Games storage map
 * @param {Object} counters - Object containing nextGameId and nextPlayerId
 * @param {Function} broadcastState - Function to broadcast game state
 */
export function registerDemoRoutes(fastify, games, counters, broadcastState) {
  
  /**
   * Create a demo game session with temporary players
   * POST /ws/pong/demo
   */
  fastify.post('/ws/pong/demo', async (request, reply) => {
    try {
      // Generate temporary player IDs
      const demoPlayer1Id = counters.nextPlayerId++;
      const demoPlayer2Id = counters.nextPlayerId++;
      
      // Generate demo player names with 'd' prefix
      const demoPlayer1Name = `d${demoPlayer1Id}`;
      const demoPlayer2Name = `d${demoPlayer2Id}`;

      const gameId = counters.nextGameId++;
      const state = initialGameState();
      state.gameId = gameId;
      const clients = new Set();

            // Start a game loop that updates the ball and broadcasts per game
      const getClientCount = () => clients.size;
      const loop = startGameLoop(state, () => broadcastState(gameId), moveBall, getClientCount);
      state.gameLoopInterval = loop; // Store reference for cleanup

      const game = {
        state,
        clients,
        loop,
        player1_id: demoPlayer1Id,
        player2_id: demoPlayer2Id,
        player1_name: demoPlayer1Name,
        player2_name: demoPlayer2Name,
        status: 'demo',
        isDemo: true,
        createdAt: new Date()
      };

      games.set(gameId, game);

      console.log(`[Demo] Created demo game ${gameId} with players ${demoPlayer1Name} vs ${demoPlayer2Name}`);

      return reply.code(201).send({
        id: gameId,
        player1_id: demoPlayer1Id,
        player2_id: demoPlayer2Id,
        player1_name: demoPlayer1Name,
        player2_name: demoPlayer2Name,
        status: 'demo',
        isDemo: true,
        message: 'Demo game created with temporary players',
        websocketUrl: `ws://localhost:3002/ws/pong/game-ws/${gameId}`
      });

    } catch (error) {
      console.error('[Demo] Error creating demo game:', error);
      return reply.code(500).send({ error: 'Failed to create demo game' });
    }
  });

  /**
   * Get all demo games
   * GET /ws/pong/demo
   */
  fastify.get('/ws/pong/demo', async (request, reply) => {
    try {
      const demoGames = [];
      
      for (const [gameId, game] of games.entries()) {
        if (game.isDemo) {
          demoGames.push({
            id: gameId,
            player1_id: game.player1_id,
            player2_id: game.player2_id,
            player1_name: game.player1_name,
            player2_name: game.player2_name,
            status: game.status,
            clientCount: game.clients.size,
            createdAt: game.createdAt
          });
        }
      }

      return reply.send({
        demoGames,
        total: demoGames.length,
        message: `Found ${demoGames.length} demo games`
      });

    } catch (error) {
      console.error('[Demo] Error fetching demo games:', error);
      return reply.code(500).send({ error: 'Failed to fetch demo games' });
    }
  });

  /**
   * Delete a demo game
   * DELETE /ws/pong/demo/:gameId
   */
  fastify.delete('/ws/pong/demo/:gameId', async (request, reply) => {
    try {
      const gameId = parseInt(request.params.gameId, 10);
      const game = games.get(gameId);

      if (!game) {
        return reply.code(404).send({ error: 'Demo game not found' });
      }

      if (!game.isDemo) {
        return reply.code(400).send({ error: 'Game is not a demo game' });
      }

      // Stop the game loop and clean up all intervals
      if (game.loop) {
        clearInterval(game.loop);
      }
      
      // Clean up all intervals in game state
      cleanupGame(game.state);

      // Close all WebSocket connections
      for (const ws of game.clients) {
        if (ws.readyState === 1) {
          ws.close(1000, 'Demo game ended');
        }
      }

      // Remove the game
      games.delete(gameId);

      console.log(`[Demo] Deleted demo game ${gameId} (${game.player1_name} vs ${game.player2_name})`);

      return reply.send({
        message: `Demo game ${gameId} deleted successfully`,
        deletedGame: {
          id: gameId,
          player1_name: game.player1_name,
          player2_name: game.player2_name
        }
      });

    } catch (error) {
      console.error('[Demo] Error deleting demo game:', error);
      return reply.code(500).send({ error: 'Failed to delete demo game' });
    }
  });

  /**
   * Delete all demo games
   * DELETE /games/demo
   */
  fastify.delete('/ws/pong/demo', async (request, reply) => {
    try {
      const deletedGames = [];
      const gamesToDelete = [];

      // Find all demo games
      for (const [gameId, game] of games.entries()) {
        if (game.isDemo) {
          gamesToDelete.push({ gameId, game });
        }
      }

      // Delete each demo game
      for (const { gameId, game } of gamesToDelete) {
        // Stop the game loop and clean up all intervals
        if (game.loop) {
          clearInterval(game.loop);
        }
        
        // Clean up all intervals in game state
        cleanupGame(game.state);

        // Close all WebSocket connections
        for (const ws of game.clients) {
          if (ws.readyState === 1) {
            ws.close(1000, 'Demo games cleanup');
          }
        }

        games.delete(gameId);
        deletedGames.push({
          id: gameId,
          player1_name: game.player1_name,
          player2_name: game.player2_name
        });
      }

      console.log(`[Demo] Deleted ${deletedGames.length} demo games`);

      return reply.send({
        message: `${deletedGames.length} demo games deleted successfully`,
        deletedGames
      });

    } catch (error) {
      console.error('[Demo] Error deleting demo games:', error);
      return reply.code(500).send({ error: 'Failed to delete demo games' });
    }
  });

  /**
   * POST /ws/pong/demo/:gameId/move
   * Move player paddle in demo game
   */
  fastify.post('/ws/pong/demo/:gameId/move', async (request, reply) => {
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

      if (!game.isDemo) {
        return reply.code(400).send({ error: 'This endpoint is for demo games only' });
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
      console.error('[Demo] Error moving paddle:', error);
      return reply.code(500).send({ error: 'Failed to move paddle' });
    }
  });
}