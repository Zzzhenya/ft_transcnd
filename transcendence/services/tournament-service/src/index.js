
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';   
import { broadcastTournamentUpdate } from './tournament/broadcast.js';
import { registergetPlayerList } from './route/tournamentRoute.js';
import { registeradvanceWinner } from './route/tournamentRoute.js';
import { registergetBracket } from './route/tournamentRoute.js';  
import { registergenerateBracket } from './tournament/createBracket.js';
import { registercreateTournamentService } from './tournament/createTournament.js';
import { healthRoute } from './route/healthRoute.js';
// import { registerhealthRoute } from './route/healthRoute.js';
// import { registertournamentStatsRoute } from './route/tournamentStats.js';

const fastify = Fastify({ logger: true });
// await fastify.register(websocket);

// const tournaments = new Map();
// let nextTournamentId = 1;

// registerhealthRoute(fastify);
fastify.register(healthRoute);
registercreateTournamentService(fastify, tournaments, () => nextTournamentId++);
registergetPlayerList(fastify, tournaments);   
registergenerateBracket(fastify, tournaments, () => nextTournamentId++);
registergetBracket(fastify, tournaments);
registeradvanceWinner(fastify, tournaments, broadcastTournamentUpdate);
registerDemoRoutes(fastify, tournaments);
registertournamentStatsRoute(fastify, tournaments);

fastify.listen({ port: 3005, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Tournament service listening at ${address}`);
});


