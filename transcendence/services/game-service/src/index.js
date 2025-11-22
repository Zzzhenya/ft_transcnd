// src/index.js
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';

import { registerSingleGameRoutes } from './Routes/gameRoute.js';
import { registerWebSocketRoutes } from './websocket/websocket.js';
import { registerStatsRoutes } from './Routes/statsRoute.js';
import { healthCheck } from './Routes/healthRoute.js';
import { broadcastState } from './pong/broadcast.js';
import { games, counters } from './pong/createGame.js';
import { registerRemoteMatchRoutes } from './Routes/remoteGameRoute.js';

// remote / lobby websocket registration
import { setupRemoteWebSocket } from './websocket/remoteWebSocket.js';

// Room manager (singleton)
import { roomManager } from './room/RoomManager.js';

import logger from './utils/logger.js';

const fastify = Fastify({ logger: true });

// register websocket plugin
await fastify.register(websocket);

// cors
await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// wrapper for broadcastState
const wrappedBroadcastState = (gameId) => broadcastState(gameId, games);

// register routes / websockets
registerSingleGameRoutes(fastify, games, counters, wrappedBroadcastState);
registerWebSocketRoutes(fastify, games, wrappedBroadcastState);
registerStatsRoutes(fastify, games);
healthCheck(fastify);
registerRemoteMatchRoutes(fastify);

// IMPORTANT: register the remote/lobby websocket handler
setupRemoteWebSocket(fastify);

// START SERVER
const PORT = parseInt(process.env.GAME_SERVICE_PORT || process.env.PORT || '3002');
const HOST = process.env.HOST || '0.0.0.0';

try {
  const address = await fastify.listen({ port: PORT, host: HOST });
  logger.info(`[game-service] 🚀 Server listening on ${address}`);
  logger.info(`[game-service] 📡 WebSocket endpoints:`);
  logger.info(`  - ws://${HOST}:${PORT}/ws/remote (Remote Players)`);
  logger.info(`  - ws://${HOST}:${PORT}/ws/pong/game-ws/:gameId (Central engine)`);
} catch (err) {
  logger.error('[game-service] Error starting server:', err);
  process.exit(1);
}
