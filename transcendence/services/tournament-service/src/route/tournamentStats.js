export function statsRoute(fastify, options, done) {
  fastify.get('/stats', async (request, reply) => {
    // Example stats data
    const stats = {
      totalTournaments: tournaments.size,
      activeTournaments: Array.from(tournaments.values()).filter(t => t.status === 'in_progress').length,
      finishedTournaments: Array.from(tournaments.values()).filter(t => t.status === 'finished').length,
    };
    reply.send(stats);
  });
  done();
}