// server.js
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { moveBall, movePaddle, restartGame, startGame, startGameLoop, initialGameState } from './gameLogic.js';

const fastify = Fastify({ logger: true });
await fastify.register(websocket);

const games = new Map(); // gameId -> { state, clients, loop }
let nextGameId = 1;

// Create a new game
fastify.post('/games', async (request, reply) => {
  const { player1_id, player2_id } = request.body;
  if (!player1_id || !player2_id) {
    return reply.code(400).send({ error: 'player1_id and player2_id are required' });
  }

  const id = nextGameId++;
  const state = initialGameState();
  const clients = new Set();

function broadcastState(gameId) {
  const game = games.get(gameId);
  if (!game) return;
  const payload = JSON.stringify({ type: 'STATE_UPDATE', gameState: game.state });
  for (const ws of game.clients) {
    if (ws.readyState === 1) ws.send(payload);
  }
}


  // Start the loop for this game
  const loop = startGameLoop(state, broadcastState, moveBall);

  games.set(id, { state, clients, loop, player1_id, player2_id, status: 'waiting' });
  reply.code(201).send({ id, player1_id, player2_id, status: 'waiting' });
});

// WebSocket route per game
fastify.get('/game-ws/:gameId', { websocket: true }, (connection, request) => {
  const gameId = parseInt(request.params.gameId, 10);
  const game = games.get(gameId);
  if (!game) {
    connection.socket.close();
    return;
  }

  const gameState = game.state;
  const clients = game.clients;
  const ws = connection.socket;
  clients.add(ws);
  console.log('Client connected to game:', gameId, 'total clients:', clients.size);

  // Send initial state
  ws.send(JSON.stringify({ type: 'STATE_UPDATE', gameState }));

  // Listen for messages
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      switch (msg.type) {
        case 'MOVE_PADDLE':
          movePaddle(gameState, msg.player, msg.direction);
          broadcastState(gameId);
          break;
        case 'RESTART_GAME':
          restartGame(gameState);
          broadcastState(gameId);
          break;
        case 'START_GAME':
          startGame(gameState);
          broadcastState(gameId);
          break;
      }
    } catch (err) {
      fastify.log.error('WS message parse error:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Client disconnected from game ${gameId}. Remaining: ${clients.size}`);
  });

  ws.on('error', (err) => {
    fastify.log.error(`Socket error in game ${gameId}:`, err);
    game.clients.delete(ws);
  });
});

// Health check
fastify.get('/health', async () => ({ status: 'ok' }));

// Start server
const address = await fastify.listen({ port: 3002, host: '0.0.0.0' });
console.log(`Server listening on ${address}`);
