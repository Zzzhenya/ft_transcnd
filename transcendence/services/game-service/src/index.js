// server.js
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { registerSingleGameRoutes } from './Routes/gameRoute.js';
import { registerWebSocketRoutes } from './websocket/websocket.js';
import { registerDemoRoutes } from './Routes/demoRoute.js';
import { registerStatsRoutes } from './Routes/statsRoute.js';
import { healthCheck } from './Routes/healthRoute.js';
import { broadcastState } from './pong/broadcast.js';
import { games, counters } from './pong/createGame.js';
import logger from './utils/logger.js'; // log-service

const fastify = Fastify({ logger: true });
await fastify.register(websocket);
// fastify.register(websocket);

//CORS used to development and test with frontend
// In production, configure CORS properly or remove it if not needed
await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Create a wrapped broadcast function that passes the games Map
const wrappedBroadcastState = (gameId) => broadcastState(gameId, games);

// Register single game routes for registered/tournament users
registerSingleGameRoutes(fastify, games, counters, wrappedBroadcastState);

// Register demo routes for temporary games
registerDemoRoutes(fastify, games, counters, wrappedBroadcastState);

// Register WebSocket routes for real-time game communication
registerWebSocketRoutes(fastify, games, wrappedBroadcastState);

// Register stats routes for game statistics
registerStatsRoutes(fastify, games);

healthCheck(fastify);

const address = await fastify.listen({ port: 3002, host: '0.0.0.0' });
console.log(`Server listening on ${address}`);

