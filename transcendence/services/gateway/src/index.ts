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
const TESTDB_URL = process.env.TESTDB_URL || 'http://testdb:3010';
const COOKIE_MAX_AGE = parseInt(process.env.COOKIE_MAX_AGE || '3600');
const Fastify = fastify({logger:true});
const PORT = parseInt(process.env.GATEWAY_PORT || '3000')


function logCookies(request: FastifyRequest): Record<string, string> {
  // Parsed cookies via fastify-cookie
  const cookies = request.cookies as Record<string, string> | undefined;

  if (!cookies || Object.keys(cookies).length === 0) {
    console.log('No cookies received in this request.');
  } else {
    console.log('Parsed cookies:', cookies);
  }

  // Optional: log raw Cookie header
  const rawCookieHeader = request.headers['cookie'];
  console.log('Raw Cookie header:', rawCookieHeader || 'None');

  return cookies || {};
}

Fastify.addHook('onRequest', async (request, reply) => {
  
  try {

    logger.info(`onRequest handler hook`)
    const cookies = logCookies(request)
    // check whether JWT token exists

    logger.info(`Checking for jwt token cookie`)

    const token = cookies?.token ?? null;
    if (token){
      logger.info(`JWT token cookie exists: ${token}`)
      logger.info(`Setting the token as x-token`)
      request.headers['x-token'] = token;
    } else {
      logger.info(`No JWT token`)
      logger.info(`Setting the token as x-token = empty`)
     request.headers['x-token'] = '';
    }

    logger.info(`Checking for sessionId cookie`)

    const sessionId = cookies?.sessionId ?? null;

    if (sessionId){
      logger.info(`sessionId cookie exists: ${sessionId}`)
      logger.info(`Setting sessionId as x-session-id`)
      request.headers['x-session-id'] = sessionId;

      logger.info(`Setting sessionId cookie for reply`)

      reply.setCookie('sessionId',sessionId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: COOKIE_MAX_AGE // 1 hour
      });
    } else {
      logger.info(`sessionId does not exists`)

      logger.info(`Generating new sessionId`)
      const newSessionId = uuidv4();

      logger.info(`Setting new sessionId as x-session-id`)
      request.headers['x-session-id'] = newSessionId;

      logger.info(`Setting new sessionId cookie for reply`)
      reply.setCookie('sessionId',newSessionId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: COOKIE_MAX_AGE // 1 hour
      });

    }

    logger.info(`🍪 uuid: ${request.headers['x-session-id']}`);
  }
  catch (error: any){
    logger.error(`[[Gateway]] An error occured while extracting or setting sessionId/token: ${error.message}`, error);
    if (!request.headers['x-token'] ||  request.headers['x-token'] === ''){
      logger.info(`Setting the token as x-token = empty`)
      request.headers['x-token'] !== '';
    }
    if (!request.headers['x-session-id'] ||  request.headers['x-session-id'] === ''){
      logger.info(`Setting the token as x-session-id = empty`)
      request.headers['x-session-id'] !== '';
    }
  }
});

await registerPlugins(Fastify);

// Fastify.log.info('🎯'+ process.env);
// console.log(process.env)

const setupWebSocket = async () => {
  await Fastify.register(websocket);
  logger.info('WebSocket plugin registered');
}

const start = async () => {
  try {
    logger.info('Starting gateway', { port: PORT });
    await Fastify.listen({ port: PORT, host: '0.0.0.0' })
    logger.info('Gateway listening at port: ', { port: PORT });
  }
  catch (error: any) {
    // Just stringify the whole error object
    logger.error('Failed to start gateway: ', { error: JSON.stringify(error) });
    Fastify.log.error('Failed to start gateway: ' + error)
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
    logger.info('cors settings registered');
}

try {
  setupcors();
}
catch (error: any){
  logger.error('error occured while registering cors settings: ', error);
}

logger.info('registering cookie plugin');
Fastify.register(cookie, {
  // secret: 'my-secret-key', // Optional (for signed cookies)

});
logger.info('cookie registered');


setupWebSocket();
logger.info("port: " + PORT);
try {
  logger.info('register root route');
  Fastify.register(firstRoute);
  logger.info('register health routes');
  Fastify.register(healthRoute);
  logger.info('register stats route');
  Fastify.register(statsRoute);
  logger.info('register ws routes ');
  Fastify.register(wsRoute, { prefix: '/ws' });
  logger.info('register /pong/demo routes ');
  Fastify.register(pongDemoRoute, { prefix: '/pong/demo' });
  logger.info('register /pong/game routes ');
  Fastify.register(pongGameRoute, { prefix: '/pong/game' });
  logger.info('register game routes ');
  Fastify.register(gameRoute)
  logger.info('register user routes ');
  Fastify.register(userRoute, { prefix: '/user-service' });
  logger.info('register tournament routes ');
  Fastify.register(tournamentRoute, { prefix: '/tournaments' });
}
catch (error: any) {
  logger.error('An error occured while registering routes', error);
}


try {
  logger.info('Launching gateway...');
  start(); // await start()?
} catch ( error: any) {
  logger.error('An error occured while launching gateway or at runtime', error);
}
