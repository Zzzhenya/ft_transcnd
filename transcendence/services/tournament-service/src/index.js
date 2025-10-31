
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';

import { broadcastTournamentUpdate } from '../tournament/broadcast.js';
import { registerTournamentRoutes } from '../route/tournamentRoute.js';
import { registercreateTournamentService } from '../tournament/createTournament.js';
import { registertournamentStatsRoute } from '../route/tournamentStats.js';
import { registerhealthRoute } from '../route/healthRoute.js';
import { registerWebSocketRoute } from '../websocket/tournamentwebsocket.js';

const fastify = Fastify({ logger: true });
await fastify.register(websocket);
await fastify.register(cors, { origin: '*' });

// const tournaments = new Map();
// let nextTournamentId = 1;

// --- Route registrations ---
registerhealthRoute(fastify);
registercreateTournamentService(fastify, tournaments, () => nextTournamentId++);
registerTournamentRoutes(fastify, tournaments, broadcastTournamentUpdate);
registertournamentStatsRoute(fastify, tournaments);
registerWebSocketRoute(fastify, tournaments);

// --- Start server ---
const start = async () => {
  try {
    await fastify.listen({ port: 3005, host: '0.0.0.0' });
    fastify.log.info('Tournament service running on port 3005');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();

