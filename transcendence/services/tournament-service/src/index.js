import Fastify from 'fastify';
const fastify = Fastify({ logger: true });

import { generateBracket, advanceWinner } from './tournamentLogic.js';
import websocket from '@fastify/websocket';
await fastify.register(websocket);

// Health check endpoint    
fastify.get('/health', async (request, reply) => {
  return { service: 'tournament-service', status: 'healthy', timestamp: new Date() };
});

// Create tournament endpoint
fastify.post('/tournaments', async (request, reply) => {
  const { players } = request.body;
  if (!players || !Array.isArray(players) || players.length < 2) {
    return reply.status(400).send({ error: 'At least two players are required to create a tournament.' });
  }

  const bracket = generateBracket(players);
  return reply.status(201).send(bracket);
});

// Advance winner endpoint
fastify.post('/tournaments/advance', async (request, reply) => {
  const { bracket, roundIdx, matchIdx, winnerId } = request.body;
  if (!bracket || roundIdx === undefined || matchIdx === undefined || !winnerId) {
    return reply.status(400).send({ error: 'Invalid request data.' });
  }

  const updatedBracket = advanceWinner(bracket, roundIdx, matchIdx, winnerId);
  return reply.status(200).send(updatedBracket);
}
);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3005, host: '0.0.0.0' });
    console.log('tournament-service running on port 3005');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
