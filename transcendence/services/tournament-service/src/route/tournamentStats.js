
export function registertournamentStatsRoute(fastify, tournaments) {
  fastify.get('/stats', async (request, reply) => {
    const stats = {
      totalTournaments: tournaments.size,
      activeTournaments: Array.from(tournaments.values()).filter(t => t.status === 'progressing').length,
      finishedTournaments: Array.from(tournaments.values()).filter(t => t.status === 'finished').length,
    };
    reply.send(stats);
  });
}
