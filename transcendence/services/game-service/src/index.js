// server.js
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

const games = new Map(); // gameId -> { state, clients, loop, players }
let nextGameId = 1;
let playerId = 1; // Counter for assigning unique player I

/**
 * Broadcast game state to all connected clients in a given game
 */
// function broadcastState(gameId) {
//   const game = games.get(gameId);
//   if (!game) return;
//   const payload = JSON.stringify({
//     type: 'STATE_UPDATE',
//     gameState: game.state
//   });

//   console.log(
//     `[Broadcast] Sending state to ${game.clients.size} clients in game ${gameId}`
//   );

//   for (const ws of game.clients) {
//     if (ws.readyState === 1) ws.send(payload);
//   }
// }

function broadcastState(gameId) {
  const game = games.get(gameId);
  if (!game) return;

  const payload = JSON.stringify({
    type: 'STATE_UPDATE',
    gameId,               // include gameId
    player1_id: game.player1_id, // include player1_id
    player2_id: game.player2_id, // include player2_id
    player1_name: game.player1_name, // include player1_name
    player2_name: game.player2_name, // include player2_name
    gameState: game.state
  });

  console.log(
    `[Broadcast] Sending state to ${game.clients.size} clients in game ${gameId}`
  );

  for (const ws of game.clients) {
    if (ws.readyState === 1) ws.send(payload);
  }
}


/**
 * Create a new game
 */
fastify.post('/games', async (request, reply) => {
  const { player1_id, player2_id, player1_name, player2_name } = request.body;
  if (!player1_id || !player2_id) {
    return reply
      .code(400)
      .send({ error: 'player1_id and player2_id are required' });
  }

  const id = nextGameId++;
  const state = initialGameState();
  state.gameId = id;
  const clients = new Set();

  // Start a game loop that updates the ball and broadcasts per game
  const loop = startGameLoop(state, () => broadcastState(id), moveBall);

  games.set(id, {
    state,
    clients,
    loop,
    player1_id,
    player2_id,
    player1_name: player1_name || `Player ${player1_id}`,
    player2_name: player2_name || `Player ${player2_id}`,
    status: 'waiting'
  });

  reply.code(201).send({
    id,
    player1_id,
    player2_id,
    player1_name: player1_name || `Player ${player1_id}`,
    player2_name: player2_name || `Player ${player2_id}`,
    status: 'waiting'
  });
});

/**
 * WebSocket route per game
 */
fastify.get('/game-ws/:gameId', { websocket: true }, (connection, request) => {
  const gameId = parseInt(request.params.gameId, 10);
  const game = games.get(gameId);

  if (!game) {
    console.log(`[WS] Invalid game ID: ${gameId}`);
    connection.socket.close();
    return;
  }

  const ws = connection.socket;
  const gameState = game.state;
  const clients = game.clients;
  clients.add(ws);

  console.log(
    `[WS] Client connected to game ${gameId} (total: ${clients.size})`
  );

  // Send initial state
  ws.send(JSON.stringify({ 
    type: 'STATE_UPDATE', 
    gameId,
    player1_id: game.player1_id,
    player2_id: game.player2_id,
    player1_name: game.player1_name,
    player2_name: game.player2_name,
    gameState 
  }));

  // Listen for client messages
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
        default:
          console.log(`[WS] Unknown message type: ${msg.type}`);
      }
    } catch (err) {
      fastify.log.error('WS message parse error:', err);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    clients.delete(ws);
    console.log(
      `[WS] Client disconnected from game ${gameId}. Remaining: ${clients.size}`
    );
  });

  ws.on('error', (err) => {
    fastify.log.error(`Socket error in game ${gameId}:`, err);
    clients.delete(ws);
  });
});

/**
 * Health check
 */
fastify.get('/health', async () => ({ status: 'ok' }));

/**
 * Start the server
 */
const address = await fastify.listen({ port: 3002, host: '0.0.0.0' });
console.log(`Server listening on ${address}`);

