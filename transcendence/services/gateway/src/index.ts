// main gateway app
/*
Create the Fastify Server (API Gateway Entry Point)
Goal: Create the central HTTP server that handles all incoming traffic.
Fastify Features: fastify(), .listen()
Tasks:
  Initialize a Fastify instance.
  Set logging and error handling options.
  Start listening on a specified port.
*/
import fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import firstRoute from './routes.js'
import healthRoute from './routes/health.route.js'
import wsRoute from './routes/ws-proxy.route.js'
import statsRoute from './routes/stats.route.js'
import userRoute from './routes/user.route.js'
// import cookiePlugin from './plugins/cookie.plugin.js';
// import onRequestHook from './hooks/on-request.hook.js';
import cookie from '@fastify/cookie';
import { v4 as uuidv4 } from 'uuid';
// import cookie from '@fastify/cookie'
import logger from './utils/logger.js'; // log-service
// console.log(services.users);

const FRONT_END_URL = String(process.env.FRONT_END_URL);

const Fastify = fastify({logger:true});

// Fastify.register(cookie, {
//   // secret: 'my-secret-key', // optional, for signed cookies
// });

// Fastify.log.info('🎯'+ process.env);
// console.log(process.env)
const PORT = 3000
// const PORT = services.port;
// const PORT = 5000
// const JWT_SECRET='supersecretkey'

//route -> method, path, handler

// Fastify.register(firstRoute)

// Fastify.get('/', async ( req: FastifyRequest, reply: FastifyReply) => {
//   reply
//     .code(200)
//     .header('Content-Type', 'application/json; charset=utf-8')
//     .send({ 'hello': 'Hello World!' })
// 	// reply.send({ greeting: 'Hello!' })
// })

// console.log(process.env.GAME_SERVICE_URL + '/abc')


const setupWebSocket = async () => {
  await Fastify.register(websocket);
  logger.info('WebSocket plugin registered');
}

function listening(){
    console.log(`App server is up and running on localhost: port 3000`);
};

const start = async () => {
  try {
    logger.info('Starting gateway', { port: PORT });
    await Fastify.listen({ port: PORT, host: '0.0.0.0' })
    logger.info('Gateway listening', { port: PORT });
  }
  catch (error: any) {
    // Just stringify the whole error object
    logger.error('Failed to start gateway', { error: JSON.stringify(error) });
    Fastify.log.error(error)
    process.exit(1)
  }
}

Fastify.addHook('onRequest', async (request, reply) => {
  logger.info('Request received', {
    method: request.method,
    url: request.url,
    ip: request.ip
  });
});

const setupcors = async () => {
  await Fastify.register(cors, {
  // Fastify.register(cors, {
  // origin: ['null'], // to test fetch with a file/ demo
  origin: FRONT_END_URL, // <-- your frontend origin 
  // origin: 'http://localhost:3004', // <-- your frontend origin 
  credentials: true,                   // <-- allow sending cookies cross-origin
    });
  logger.info('here\n');
}


setupcors();

Fastify.register(cookie, {
  // secret: 'my-secret-key', // Optional (for signed cookies)
});

// Fastify.register(cookiePlugin);

// await Fastify.ready();

Fastify.addHook('onRequest', async (request, reply) => {
  // Check if session cookie exists
  const cookies = request.cookies || {};
  const sessionId = cookies.sessionId;
  if (!sessionId) {
    const newSessionId = uuidv4();
    // const newSessionId = 'abcd'
    reply.setCookie('sessionId', newSessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false
    });
    Fastify.log.info(`🆕 New sessionId created: ${newSessionId}`);
  } else {
    Fastify.log.info(`✅ Existing sessionId: ${sessionId}`);
  }
});

// Fastify.register(onRequestHook);
setupWebSocket();
logger.info("port: " + PORT);
Fastify.register(firstRoute);
Fastify.register(healthRoute);
Fastify.register(statsRoute);
Fastify.register(wsRoute, { prefix: '/ws' })
Fastify.register(userRoute, { prefix: '/user-service' })
// Fastify.register(wsRoute)
logger.info('Something important happened!');
start(); // await start() ?
