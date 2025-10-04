// Run with: node server.js
// wscat -c ws://localhost:3002/game-ws  for test websocket
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { 
  moveBall, 
  movePaddle, 
  restartGame, 
  startGame, 
  startGameLoop, 
  initialGameState
} from './gameLogic.js';

const fastify = Fastify({ logger: true });
await fastify.register(websocket);

// Connected clients
const clients = new Set();
let gameState = initialGameState();
startGameLoop(gameState, broadcastState, moveBall);

// Health check
fastify.get('/health', async () => ({ status: 'ok' }));

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

      switch (msg.type) {
        case 'MOVE_PADDLE': {
          const oldPaddle = gameState.paddles[msg.player];
          movePaddle(gameState, msg.player, msg.direction);
          if (oldPaddle !== gameState.paddles[msg.player]) {
            broadcastState();
          }
          break;
        }

        case 'RESTART_GAME':
          restartGame(gameState);
          broadcastState();
          break;

        case 'START_GAME':
          startGame(gameState);
          broadcastState();
          break;

        default:
          fastify.log.warn(`Unknown message type: ${msg.type}`);
      }
    } catch (err) {
      fastify.log.error('WS message parse error:', err);
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

// Helper: send state to all clients
function broadcastState() {
  const payload = JSON.stringify({ type: 'STATE_UPDATE', gameState });
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

// Start server
const address = await fastify.listen({ port: 3002, host: '0.0.0.0' });
console.log(`Server listening on ${address}`);
