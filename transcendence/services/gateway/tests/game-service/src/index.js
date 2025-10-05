const Fastify = require('fastify');
const websocket = require('@fastify/websocket');

const fastify = Fastify({ logger: true });

// ✅ Register WebSocket plugin *before* routes
fastify.register(websocket);

// 🟢 Health check route
fastify.get('/health', async (request, reply) => {
  return {
    service: 'game-service',
    status: 'healthy',
    timestamp: new Date(),
  };
});

// 🎮 Game state
const players = {};
let ball = { x: 300, y: 200, dx: 2, dy: 2 };

// ✅ WebSocket endpoint
fastify.get('/ws/pong', { websocket: true }, (connection, req) => {
  console.log("Here\n")
  const client = connection.socket;
  const playerId = Math.random().toString(36).substring(2);

  // Register new player
  players[playerId] = {
    y: 200, // initial paddle Y position
    socket: client,
  };

  fastify.log.info(`🟢 Player connected: ${playerId}`);

  // Handle incoming messages from client
client.on('message', (raw) => {
  try {
    const msg = JSON.parse(raw.toString());
    console.log(msg)
    if (msg.type === 'move' && typeof msg.y === 'number') {
      players[playerId].y = msg.y;
    } else {
      // fastify.log.warn('⚠️ Received unknown message type or invalid data:', msg);
    }
  } catch (err) {
    // fastify.log.warn('❌ Invalid WebSocket message received, ignoring', err);
    // Do NOT throw or close connection here, just ignore malformed input
  }
});


  // Handle disconnection
  client.on('close', () => {
    delete players[playerId];
    fastify.log.info(`🔴 Player disconnected: ${playerId}`);
  });
});

// 📡 Broadcast game state to all clients
function broadcastGameState() {
  const state = {
    type: 'state',
    ball,
    paddles: Object.fromEntries(
      Object.entries(players).map(([id, p]) => [id, { y: p.y }])
    ),
  };

  const json = JSON.stringify(state);
  console.log(json)
  for (const { socket } of Object.values(players)) {
    try {
      socket.send(json);
    } catch (err) {
      // fastify.log.error('❌ Error sending game state', err);
    }
  }
}

// 🕹️ Update game logic
function updateGame() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Bounce ball vertically
  if (ball.y <= 0 || ball.y >= 400) {
    ball.dy *= -1;
  }

  // TODO: Add collision detection with paddles & scoring

  broadcastGameState();
}

// 🎮 Start game loop: 30 FPS
setInterval(updateGame, 1000 / 30);

// 🚀 Start Fastify server
fastify.listen({ port: 3002, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`✅ Pong server running at ${address}/ws/pong`);
});
