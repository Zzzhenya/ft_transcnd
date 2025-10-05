import Fastify from 'fastify';
const fastify = Fastify({ logger: true });

import fetch from 'node-fetch'; // or axios
const GAME_SERVER_URL = process.env.GAME_SERVER_URL || 'http://localhost:3002';

import { generateBracket, advanceWinner } from './tournamentLogic.js';
import websocket from '@fastify/websocket';
await fastify.register(websocket);

// Health check endpoint    
fastify.get('/health', async (request, reply) => {
  return { service: 'tournament-service', status: 'healthy', timestamp: new Date() };
});

fastify.post('/start-tournament', async (req, reply) => {
  try {
    const response = await fetch(`${GAME_SERVER_URL}/api/game/start`, {
      method: 'POST',
    });
    const data = await response.json();
    return { message: 'Match started', game: data };
  } catch (error) {
    fastify.log.error(error);
    reply.code(500).send({ error: 'Failed to start game' });
  }
});


fastify.get('/tournaments/create', async (request, reply) => {
  let players = request.query.players;

  // Parse players if it's a stringified array
  if (typeof players === 'string') {
    try {
      players = JSON.parse(players);
    } catch {
      return reply.status(400).send({ error: 'Invalid players format.' });
    }
  }

  if (!players || !Array.isArray(players) || players.length <= 2) {
    return reply.status(400).send({ error: 'At least three players are required to create a tournament.' });
  }

  const bracket = generateBracket(players);
  return reply.status(201).send(bracket);
});

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
