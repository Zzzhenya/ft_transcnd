// main gateway app
/*
Create the Fastify Server (API Gateway Entry Point)
Goal: Create the central HTTP server that handles all incoming traffic.
Fastify Features: fastify(), .listen()
Tasks:
  Initialize a Fastify instance.
  Set logging and error handling options.
  Set sessionId handling hooks
  Start listening on a specified port.
*/
import fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import firstRoute from './routes.js'
import healthRoute from './routes/health.route.js'
import wsRoute from './routes/ws-proxy.route.js'
import pongGameRoute from './routes/pong.game.route.js'
import pongDemoRoute from './routes/pong.demo.route.js'
import statsRoute from './routes/stats.route.js'
import userRoute from './routes/user.route.js'
import tournamentRoute from './routes/tournament.route.js'
import gameRoute from './routes/game.route.js'
// import cookiePlugin from './plugins/cookie.plugin.js';
// import onRequestHook from './hooks/on-request.hook.js';
import cookie from '@fastify/cookie';
import { v4 as uuidv4 } from 'uuid';
import logger from './utils/logger.js'; // log-service
import { registerPlugins } from './utils/registerPlugins.js';
import { proxyRequest } from './utils/proxyHandler.js';

const FRONT_END_URL = String(process.env.FRONT_END_URL);
const Fastify = fastify({logger:true});
const PORT = 3000


await registerPlugins(Fastify);

// Fastify.log.info('🎯'+ process.env);
// console.log(process.env)

const setupWebSocket = async () => {
  await Fastify.register(websocket);
  logger.info('[[Gateway]] WebSocket plugin registered');
}

const start = async () => {
  try {
    logger.info('[[Gateway]] Starting gateway', { port: PORT });
    await Fastify.listen({ port: PORT, host: '0.0.0.0' })
    logger.info('[[Gateway]] Gateway listening at port: ', { port: PORT });
  }
  catch (error: any) {
    // Just stringify the whole error object
    logger.error('[[Gateway]] Failed to start gateway: ', { error: JSON.stringify(error) });
    Fastify.log.error('[[Gateway]] Failed to start gateway: ' + error)
    process.exit(1)
  }
}

Fastify.addHook('onRequest', async (request, reply) => {
  logger.info('[[Gateway]] Request received', {
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
    logger.info('[[Gateway]] cors settings registered');
}

try {
  setupcors();
}
catch (error: any){
  logger.error('[[Gateway]] error occured while registering cors settings: ', error);
}

logger.info('[[Gateway]] registering cookie plugin');
Fastify.register(cookie, {
  // secret: 'my-secret-key', // Optional (for signed cookies)

});
logger.info('[[Gateway]] cookie registered');

Fastify.addHook('onRequest', async (request, reply) => {
  // Check if session cookie exists
  try {
    const cookies = request.cookies || {};
    const sessionId = cookies.sessionId;
    if (!sessionId) {
      const newSessionId = uuidv4();
      // call your own POST /sessions route internally

      const res = await fetch(`http://testdb:3010/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: newSessionId, 
          time: new Date().toString(),
          status: 1 })
      });

      // if (res.statusCode >= 400) {
      //   Fastify.log.error(`[[Gateway]] Failed to create session: ${res.statusCode}`);
      // }

      // const newSessionId = 'abcd'
      reply.setCookie('sessionId', newSessionId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 3600 // 1 hour
      });
      logger.info(`[[Gateway]] New sessionId created: ${newSessionId}`);
      Fastify.log.info(`[[Gateway]] 🆕 New sessionId created: ${newSessionId}`);
    } else {
      logger.info(`[[Gateway]] Existing sessionId: ${sessionId}`);
      Fastify.log.info(`[[Gateway]] ✅ Existing sessionId: ${sessionId}`);
    }
  }
  catch (error: any){
    logger.error(`[[Gateway]] An error occured while extracting or setting sessionId`);
  }
});

setupWebSocket();
logger.info("port: " + PORT);
try {
  logger.info('[[Gateway]] register root route');
  Fastify.register(firstRoute);
  logger.info('[[Gateway]] register health routes');
  Fastify.register(healthRoute);
  logger.info('[[Gateway]] register stats route');
  Fastify.register(statsRoute);
  logger.info('[[Gateway]] register ws routes ');
  Fastify.register(wsRoute, { prefix: '/ws' });
  logger.info('[[Gateway]] register /pong/demo routes ');
  Fastify.register(pongDemoRoute, { prefix: '/pong/demo' });
  logger.info('[[Gateway]] register /pong/game routes ');
  Fastify.register(pongGameRoute, { prefix: '/pong/game' });
  logger.info('[[Gateway]] register game routes ');
  Fastify.register(gameRoute, { prefix: '/api' })
  logger.info('[[Gateway]] register auth routes ');
  Fastify.register(userRoute, { prefix: '/user-service' });
  logger.info('[[Gateway]] register tournament routes ');
  Fastify.register(tournamentRoute, { prefix: '/tournaments' });
}
catch (error: any) {
  logger.error('[[Gateway]] an error occured while registering routes', error);
}


try {
  logger.info('[[Gateway]] Launching gateway...');
  start(); // await start()?
} catch ( error: any) {
  logger.error('[[Gateway]] an error occured while launching gateway or at runtime', error);
}
