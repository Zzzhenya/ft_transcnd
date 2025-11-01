
export function registerTournamentRoutes(fastify, tournaments, broadcastTournamentUpdate) {
  // List all tournaments
  fastify.get('/tournaments', async (req, reply) => {
    try {
      const list = Array.from(tournaments.values()).map(t => ({
        id: t.id,
        name: t.name,
        size: t.size,
        status: t.status,
        players: Array.from(t.playerSet || [])
      }));
      return reply.send({ tournaments: list });
    } catch (err) {
      fastify.log.error('[TournamentService] Failed to list tournaments', err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Player list
  fastify.get('/tournaments/:id/players', async (req, reply) => {
    const t = tournaments.get(Number(req.params.id));
    if (!t) return reply.code(404).send({ error: 'Not found' });
    reply.send({ players: Array.from(t.playerSet) });
  });

  // Get bracket
  fastify.get('/tournaments/:id/bracket', async (req, reply) => {
    const t = tournaments.get(Number(req.params.id));
    if (!t) return reply.code(404).send({ error: 'Not found' });
    reply.send({ bracket: t.bracket });
  });

  // Advance winner
  fastify.post('/tournaments/:id/advance', async (req, reply) => {
    const t = tournaments.get(Number(req.params.id));
    if (!t) return reply.code(404).send({ error: 'Not found' });
    const { matchId, winner } = req.body;
    if (!t.playerSet.has(winner)) return reply.code(400).send({ error: 'Invalid winner' });

    // Simulate winner advance
    const round = t.bracket.rounds.find(r => r.some(m => m.matchId === matchId));
    if (round) {
      const match = round.find(m => m.matchId === matchId);
      if (match) match.winner = winner;
    }

    t.status = t.bracket.rounds.at(-1)[0].winner ? 'finished' : 'progressing';
    broadcastTournamentUpdate(t.id);
    reply.send({ ok: true });
  });
}
