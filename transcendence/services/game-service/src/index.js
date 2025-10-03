// server.js
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { movePaddle, moveBall } from './gameLogic.js';
import { readFileSync } from 'fs';
import path from 'path';

const fastify = Fastify({ logger: true });

// Register websocket plugin first
await fastify.register(websocket);

// Game state
let gameState = {
  score: { player1: 0, player2: 0 },
  ball: { x: 0, y: 0, dx: 1, dy: 1 },
  paddles: { player1: 0, player2: 0 }
};

// Track connected clients
const clients = new Set();

// Helper: send state to all clients
function broadcastState() {
  const payload = JSON.stringify({ type: 'STATE_UPDATE', gameState });
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

// WebSocket route
fastify.get('/game-ws', { websocket: true }, (conn) => {
  const ws = conn.socket;
  clients.add(ws);
  console.log('Client connected, total clients:', clients.size);

  // Send initial state
  ws.send(JSON.stringify({ type: 'STATE_UPDATE', gameState }));

  // Handle messages from this client
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'MOVE_PADDLE') {
        const oldPaddle = gameState.paddles[msg.player];
        gameState = movePaddle(gameState, msg.player, msg.direction);

        // Only broadcast if paddle actually moved
        if (oldPaddle !== gameState.paddles[msg.player]) {
          broadcastState();
        }
      }
    } catch (err) {
      console.error('WS message parse error', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected, total clients:', clients.size);
  });

  ws.on('error', (err) => {
    console.error('Socket error:', err);
    clients.delete(ws);
  });
});

// Server-side game loop (ball updates)
setInterval(() => {
  const oldBall = { ...gameState.ball };
  const oldScore = { ...gameState.score };

  gameState = moveBall(gameState);

  // Only broadcast if ball position changed significantly or score changed
  const ballMoved = oldBall.x !== gameState.ball.x || oldBall.y !== gameState.ball.y;
  const scoreChanged = oldScore.player1 !== gameState.score.player1 || oldScore.player2 !== gameState.score.player2;

  if (ballMoved || scoreChanged) {
    broadcastState();
  }
}, 1000 / 60); // 60 FPS update rate for smooth movement

// Health check
fastify.get('/health', async () => ({ status: 'ok' }));

// Serve client.html
fastify.get('/client.html', async (request, reply) => {
  try {
    const clientPath = path.join(process.cwd(), 'src', 'client.html');
    const content = readFileSync(clientPath, 'utf8');
    reply.type('text/html').send(content);
  } catch (error) {
    reply.code(404).send({ error: 'Client file not found' });
  }
});

// Start server
const address = await fastify.listen({ port: 3002, host: '0.0.0.0' });
console.log(`Server listening on ${address}`);
