import fastify from 'fastify';
import { generateBracket } from './createBracket';

const tournaments = new Map();
let nextTournamentId = 1;
const playersSet = new Set();

fastify.post('/tournaments', async (request, reply) => {
  const { creator, size, name } = request.body;
  if (!creator || (size !== 4 && size !== 8)) {
    return reply.code(400).send({ error: "Missing creator or invalid size (must be 4 or 8)" });
  }
  const tournamentId = nextTournamentId++;
  const playerSet = new Set([creator]);
  const tournament = {
    id: tournamentId,
    name: name || `Tournament ${tournamentId}`,
    playerSet,
    size, // 4 or 8
    status: 'ready', // 'ready' | 'progressing' | 'finished'
    bracket: null,   // Will be generated when full
    clients: new Set(),
  };
  tournaments.set(tournamentId, tournament);
  reply.send({ id: tournamentId });
});

// Endpoint to join a tournament
fastify.post('/tournaments/:id/join', async (request, reply) => {
  const t = tournaments.get(Number(request.params.id));
  const { player } = request.body;
  if (!t) return reply.code(404).send({ error: "Tournament not found" });
  if (t.playerSet.has(player)) return reply.code(400).send({ error: "Player already joined" });
  if (t.playerSet.size >= t.size) return reply.code(400).send({ error: "Tournament is full" });

  t.playerSet.add(player);

  // If full, generate bracket and set status to progressing
  if (t.playerSet.size === t.size) {
    t.bracket = generateBracket(Array.from(t.playerSet));
    t.status = 'progressing';
  }
  reply.send({ ok: true, status: t.status, bracket: t.bracket });
});

export function startServer() {
fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Tournament service listening at ${address}`);
});
}

// List all tournaments (for lobby)
fastify.get('/tournaments', async (request, reply) => {
  const list = Array.from(tournaments.values()).map(t => ({
    id: t.id,
    name: t.name,
    size: t.size,
    status: t.status,
    players: Array.from(t.playerSet),
  }));
  reply.send(list);
});

// Get details for a specific tournament (for waiting room)
fastify.get('/tournaments/:id', async (request, reply) => {
  const t = tournaments.get(Number(request.params.id));
  if (!t) return reply.code(404).send({ error: "Tournament not found" });
  reply.send({
    id: t.id,
    name: t.name,
    size: t.size,
    status: t.status,
    players: Array.from(t.playerSet),
    bracket: t.bracket,
  });
});