/**
 * Local Route - Handles local game sessions
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
 * Register local routes with the Fastify instance
 * @param {Object} fastify - Fastify instance
 * @param {Map} games - Games storage map
 * @param {Object} counters - Object containing nextGameId and nextPlayerId
 * @param {Function} broadcastState - Function to broadcast game state
 */
export function registerLocalRoutes(fastify, games, counters, broadcastState) {
  
  /**
   * Create a local game session with temporary players
   * POST /ws/pong/local
   */
  fastify.post('/ws/pong/local', async (request, reply) => {
    try {
      // Generate temporary player IDs
      const localPlayer1Id = counters.nextPlayerId++;
      const localPlayer2Id = counters.nextPlayerId++;
      
      // Generate local player names with 'local' prefix
      const localPlayer1Name = `localPlayer${localPlayer1Id}`;
      const localPlayer2Name = `localPlayer${localPlayer2Id}`;

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
        player1_id: localPlayer1Id,
        player2_id: localPlayer2Id,
        player1_name: localPlayer1Name,
        player2_name: localPlayer2Name,
        status: 'local',
        isLocal: true,
        createdAt: new Date()
      };

      games.set(gameId, game);

      console.log(`[Local] Created local game ${gameId} with players ${localPlayer1Name} vs ${localPlayer2Name}`);

      return reply.code(201).send({
        id: gameId,
        player1_id: localPlayer1Id,
        player2_id: localPlayer2Id,
        player1_name: localPlayer1Name,
        player2_name: localPlayer2Name,
        status: 'local',
        isLocal: true,
        message: 'Local game created with temporary players',
        websocketUrl: `ws://localhost:3002/ws/pong/game-ws/${gameId}`
      });

    } catch (error) {
      console.error('[Local] Error creating local game:', error);
      return reply.code(500).send({ error: 'Failed to create local game' });
    }
  });

  /**
   * Get all local games
   * GET /ws/pong/local
   */
  fastify.get('/ws/pong/local', async (request, reply) => {
    try {
      const localGames = [];
      
      for (const [gameId, game] of games.entries()) {
        if (game.isLocal) {
          localGames.push({
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
        localGames,
        total: localGames.length,
        message: `Found ${localGames.length} local games`
      });

    } catch (error) {
      console.error('[Local] Error fetching local games:', error);
      return reply.code(500).send({ error: 'Failed to fetch local games' });
    }
  });

  /**
   * Delete a local game
   * DELETE /ws/pong/local/:gameId
   */
  fastify.delete('/ws/pong/local/:gameId', async (request, reply) => {
    try {
      const gameId = parseInt(request.params.gameId, 10);
      const game = games.get(gameId);

      if (!game) {
        return reply.code(404).send({ error: 'Local game not found' });
      }

      if (!game.isLocal) {
        return reply.code(400).send({ error: 'Game is not a local game' });
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
          ws.close(1000, 'Local game ended');
        }
      }

      // Remove the game
      games.delete(gameId);

      console.log(`[Local] Deleted local game ${gameId} (${game.player1_name} vs ${game.player2_name})`);

      return reply.send({
        message: `Local game ${gameId} deleted successfully`,
        deletedGame: {
          id: gameId,
          player1_name: game.player1_name,
          player2_name: game.player2_name
        }
      });

    } catch (error) {
      console.error('[Local] Error deleting local game:', error);
      return reply.code(500).send({ error: 'Failed to delete local game' });
    }
  });

  /**
   * Delete all local games
   * DELETE /games/local
   */
  fastify.delete('/ws/pong/local', async (request, reply) => {
    try {
      const deletedGames = [];
      const gamesToDelete = [];

      // Find all local games
      for (const [gameId, game] of games.entries()) {
        if (game.isLocal) {
          gamesToDelete.push({ gameId, game });
        }
      }

      // Delete each local game
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
            ws.close(1000, 'Local games cleanup');
          }
        }

        games.delete(gameId);
        deletedGames.push({
          id: gameId,
          player1_name: game.player1_name,
          player2_name: game.player2_name
        });
      }

      console.log(`[Local] Deleted ${deletedGames.length} local games`);

      return reply.send({
        message: `${deletedGames.length} local games deleted successfully`,
        deletedGames
      });

    } catch (error) {
      console.error('[Local] Error deleting local games:', error);
      return reply.code(500).send({ error: 'Failed to delete local games' });
    }
  });

  /**
   * POST /ws/pong/local/:gameId/move
   * Move player paddle in local game
   */
  fastify.post('/ws/pong/local/:gameId/move', async (request, reply) => {
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

      if (!game.isLocal) {
        return reply.code(400).send({ error: 'This endpoint is for local games only' });
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
      console.error('[Local] Error moving paddle:', error);
      return reply.code(500).send({ error: 'Failed to move paddle' });
    }
  });
}