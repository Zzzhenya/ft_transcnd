import fastify from 'fastify';
import { generateBracket } from './createBracket';

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


export function startServer() {
fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Tournament service listening at ${address}`);
});
}