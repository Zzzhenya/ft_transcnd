
export function registerTournamentRoutes(fastify, tournaments, broadcastTournamentUpdate) {
  // List all tournaments (exclude finished tournaments)
  fastify.get('/tournaments', async (req, reply) => {
    try {
      const list = Array.from(tournaments.values())
        .filter(t => t.status !== 'finished') // Filter out finished tournaments
        .map(t => ({
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
    reply.send({ 
      bracket: t.bracket,
      size: t.size,
      status: t.status 
    });
  });

  // Start tournament
  fastify.post('/tournaments/:id/start', async (req, reply) => {
    const t = tournaments.get(Number(req.params.id));
    if (!t) return reply.code(404).send({ error: 'Not found' });
    
    const { players, size } = req.body;
    if (!players || !Array.isArray(players)) {
      return reply.code(400).send({ error: 'Players array required' });
    }
    
    if (players.length !== size) {
      return reply.code(400).send({ error: `Need exactly ${size} players to start` });
    }

    // Add all players to tournament
    players.forEach(player => t.playerSet.add(player));
    
    // Generate bracket and start tournament
    const { generateBracket } = await import('../tournament/createBracket.js');
    t.bracket = generateBracket(Array.from(t.playerSet));
    t.status = 'progressing';
    
    broadcastTournamentUpdate(t.id);
    reply.send({ ok: true, status: t.status, bracket: t.bracket });
  });

  // Advance winner
  fastify.post('/tournaments/:id/advance', async (req, reply) => {
    const t = tournaments.get(Number(req.params.id));
    if (!t) {
      fastify.log.error(`Tournament ${req.params.id} not found`);
      return reply.code(404).send({ error: 'Not found' });
    }
    
    const { matchId, winner } = req.body;
    fastify.log.info(`Advance request: Tournament ${req.params.id}, Match ${matchId}, Winner ${winner}`);
    
    if (!t.playerSet.has(winner)) {
      fastify.log.error(`Invalid winner: ${winner} not in tournament`);
      return reply.code(400).send({ error: 'Invalid winner' });
    }

    // Find and update the match with the winner
    let currentMatch = null;
    let currentRoundIndex = -1;
    for (let i = 0; i < t.bracket.rounds.length; i++) {
      const match = t.bracket.rounds[i].find(m => m.matchId === matchId);
      if (match) {
        match.winner = winner;
        match.status = 'completed';
        currentMatch = match;
        currentRoundIndex = i;
        fastify.log.info(`Match ${matchId} found in round ${i}, setting winner to ${winner}`);
        break;
      }
    }

    if (!currentMatch) {
      fastify.log.error(`Match ${matchId} not found in tournament bracket`);
      return reply.code(404).send({ error: 'Match not found' });
    }

    // Advance winner to next round
    if (currentRoundIndex < t.bracket.rounds.length - 1) {
      const nextRound = t.bracket.rounds[currentRoundIndex + 1];
      for (const nextMatch of nextRound) {
        if (nextMatch.prevMatch1 === matchId) {
          nextMatch.player1 = winner;
          fastify.log.info(`Advanced ${winner} to match ${nextMatch.matchId} as player1`);
        } else if (nextMatch.prevMatch2 === matchId) {
          nextMatch.player2 = winner;
          fastify.log.info(`Advanced ${winner} to match ${nextMatch.matchId} as player2`);
        }
      }
    }

    // Check if tournament is finished (final match has a winner)
    const finalMatch = t.bracket.rounds.at(-1)[0];
    if (finalMatch.winner) {
      t.status = 'finished';
      fastify.log.info(`🏆 Tournament ${req.params.id} FINISHED! Winner: ${finalMatch.winner}`);
    } else {
      t.status = 'progressing';
    }
    fastify.log.info(`Tournament status: ${t.status}`);
    broadcastTournamentUpdate(t.id);
    reply.send({ ok: true, bracket: t.bracket, status: t.status });
  });
}
