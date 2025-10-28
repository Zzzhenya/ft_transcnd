import fastify from 'fastify';
import { generateBracket } from './createBracket.js';

const tournaments = new Map();
let nextTournamentId = 1;   
const playersset = new Set();

// ... server setup and listen code here ...
export { tournaments, nextTournamentId };
fastify.post('/tournaments', async (request, reply) => {
  const { players, name } = request.body;
  if (!players || (players.length !== 4 && players.length !== 8)) {
    return reply.code(400).send({ error: "Player count must be 4 or 8" });
  }
  const tournamentId = nextTournamentId++;
  const bracket = generateBracket(players);
  const playerSet = new Set(players);

  const tournament = {
  id: tournamentId,
  name: name || `Tournament ${tournamentId}`,
  playerSet,
  bracket,
  status: 'ready', // 'ready' | 'progressing' | 'finished'
  clients: new Set(),
};
  tournaments.set(tournamentId, tournament);
    reply.send({ id: tournamentId });
});


// export function startServer() {
// fastify.listen({ port: 3005 }, (err, address) => {
//   if (err) {
//     fastify.log.error(err);
//     process.exit(1);
//   }
//   fastify.log.info(`Tournament service listening at ${address}`);
// });
// }

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

