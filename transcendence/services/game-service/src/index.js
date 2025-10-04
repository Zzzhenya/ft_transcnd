// server.js
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { moveBall, movePaddle, restartGame, startGame, startGameLoop} from './gameLogic.js';


const fastify = Fastify({ logger: true });

// Register websocket plugin first
await fastify.register(websocket);

// Track connected clients
const clients = new Set();

// Game state
let gameState = {
  score: { player1: 0, player2: 0 },
  ball: { x: 0, y: 0, dx: 0.2, dy: 0.2 },
  paddles: { player1: 0, player2: 0 },
  tournament: {
    currentRound: 1,
    maxRounds: 3,
    scoreLimit: 5,
    roundsWon: { player1: 0, player2: 0 },
    gameStatus: 'waiting', // 'waiting', 'playing', 'roundEnd', 'gameEnd'
    winner: null,
    lastPointWinner: null
  }
};

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

      if (msg.type === 'RESTART_GAME') {
        restartGame(gameState);
        broadcastState();
      }

      if (msg.type === 'START_GAME') {
        startGame(gameState);
        broadcastState();
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


startGameLoop(gameState, broadcastState, moveBall);

// Health check
fastify.get('/health', async () => ({ status: 'ok' }));


// Start server
const address = await fastify.listen({ port: 3002, host: '0.0.0.0' });
console.log(`Server listening on ${address}`);
