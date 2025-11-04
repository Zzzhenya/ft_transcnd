
import { generateBracket } from './createBracket.js';

export function registercreateTournamentService(fastify, tournaments, getNextTournamentId) {
  fastify.post('/tournaments', async (request, reply) => {
    const { creator, size, name } = request.body;
    
    // Validate required fields
    if (!creator || (size !== 4 && size !== 8)) {
      return reply.code(400).send({ error: 'Missing creator or invalid size (must be 4 or 8)' });
    }

    // Backend generates the tournament ID
    const tournamentId = getNextTournamentId();

    const playerSet = new Set([creator]);

    const tournament = {
      id: tournamentId,
      name: name || `Tournament ${tournamentId}`,
      playerSet,
      size,
      status: 'ready',
      bracket: null,
      clients: new Set(),
    };

    tournaments.set(tournamentId, tournament);
    reply.send({ id: tournamentId });
  });

  fastify.post('/tournaments/:id/join', async (request, reply) => {
    const t = tournaments.get(Number(request.params.id));
    const { player } = request.body;
    if (!t) return reply.code(404).send({ error: 'Tournament not found' });
    if (t.playerSet.has(player)) return reply.code(400).send({ error: 'Already joined' });
    if (t.playerSet.size >= t.size) return reply.code(400).send({ error: 'Tournament full' });

    t.playerSet.add(player);
    if (t.playerSet.size === t.size) {
      t.bracket = generateBracket(Array.from(t.playerSet));
      t.status = 'progressing';
    }
    reply.send({ ok: true, status: t.status, bracket: t.bracket });
  });
}
