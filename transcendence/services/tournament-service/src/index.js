
import fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';   
import { broadcastTournamentUpdate } from '../tournament/broadcast.js';
import { registergetPlayerList } from './tournamentRoute.js';
import { registeradvanceWinner } from './tournamentRoute.js';
import { registergetBracket } from './tournamentRoute.js';  
import { registergenerateBracket } from './tournamentRoute.js';
import { registerstartserver } from './createTournament.js';
import { registerhealthRoute } from './healthRoute.js';
import { registertournamentStatsRoute } from './tournamentStatsRoute.js';

const fastify = fastify({ logger: true });
await fastify.register(websocket);

const tournaments = new Map();
let nextTournamentId = 1;

registerhealthRoute(fastify);
registerstartserver(fastify, tournaments, () => nextTournamentId++); 
registergetPlayerList(fastify, tournaments);   
registergenerateBracket(fastify, tournaments, () => nextTournamentId++);
registergetBracket(fastify, tournaments);
registeradvanceWinner(fastify, tournaments, broadcastTournamentUpdate);
registerDemoRoutes(fastify, tournaments);
registertournamentStatsRoute(fastify, tournaments);


