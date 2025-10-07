import { games, counters } from '../pong/createGame.js';

/**
 * Register stats routes with the Fastify instance
 * @param {Object} fastify - Fastify instance
 * @param {Map} games - Games storage map
 */
export function registerStatsRoutes(fastify, games) {           
  /**
   * Get statistics about current games and counters
   * GET /stats
   */               

fastify.get('/stats', async () => {
  const allGames = Array.from(games.values());
  const demoGames = allGames.filter(game => game.isDemo);
  const registeredGames = allGames.filter(game => game.isRegistered);
  const tournamentGames = allGames.filter(game => game.gameType === 'tournament');
  const normalGames = allGames.filter(game => game.gameType === 'normal' || !game.gameType);
  const activeGames = allGames.filter(game => game.clients && game.clients.size > 0);
  
  return {
    totalGames: games.size,
    activeGames: activeGames.length,
    gameTypes: {
      demo: demoGames.length,
      registered: registeredGames.length,
      tournament: tournamentGames.length,
      normal: normalGames.length
    },
    counters: {
      nextGameId: counters.nextGameId,
      nextPlayerId: counters.nextPlayerId
    },
    timestamp: new Date()
  };
});
}