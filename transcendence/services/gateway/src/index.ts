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
import remoteOnlyRoute from './routes/remote-only.route.js'
import pongGameRoute from './routes/pong.game.route.js'
import pongDemoRoute from './routes/pong.demo.route.js'
import statsRoute from './routes/stats.route.js'
import userRoute from './routes/user.route.js'
import tournamentRoute from './routes/tournament.route.js'
import gameRoute from './routes/game.route.js'
import readyRoute from './routes/ready.route.js'
// import cookiePlugin from './plugins/cookie.plugin.js';
// import onRequestHook from './hooks/on-request.hook.js';
import cookie from '@fastify/cookie';
import { v4 as uuidv4 } from 'uuid';
import logger from './utils/logger.js'; // log-service
import { registerPlugins } from './utils/registerPlugins.js';
import { proxyRequest } from './utils/proxyHandler.js';
import fastifyJwt from '@fastify/jwt';

const FRONT_END_URL = String(process.env.FRONT_END_URL);
const TESTDB_URL = process.env.TESTDB_URL || 'http://testdb:3010';
const COOKIE_MAX_AGE = parseInt(process.env.COOKIE_MAX_AGE || '3600');
const Fastify = fastify({logger:true});
const PORT = parseInt(process.env.GATEWAY_PORT || '3000')
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
  await setupcors();
}
catch (error: any){
  logger.error('[[Gateway]] error occured while registering cors settings: ', error);
}

logger.info('[[Gateway]] registering cookie plugin');
await Fastify.register(cookie, {
  // secret: 'my-secret-key', // Optional (for signed cookies)

});
logger.info('[[Gateway]] cookie registered');


await Fastify.register(fastifyJwt, {
  secret: JWT_SECRET,
  cookie: {
    cookieName: 'token', 
    signed: false,
  }
});


function logCookies(request: FastifyRequest): Record<string, string> {
  // Parsed cookies via fastify-cookie
  const cookies = request.cookies as Record<string, string> | undefined;

  if (!cookies || Object.keys(cookies).length === 0) {
    console.log('No cookies received in this request.');
    logger.info('No cookies received in this request.');
  } else {
    console.log('Parsed cookies:', cookies);
    logger.info('Parsed cookies:', cookies);
  }

  // log raw Cookie header
  const rawCookieHeader = request.headers['cookie'];
  logger.info('Raw Cookie header:', rawCookieHeader || 'None');

  return cookies || {};
}

Fastify.addHook('onRequest', async (request, reply) => {

  logger.info('Request received', {
    method: request.method,
    url: request.url,
    ip: request.ip
  });

  // Check if session cookie exists
  try {
    logger.info(`1. extract cookies`)
    const cookies = logCookies(request)
    logger.info(`2. token check`)
    const token = cookies?.token ?? null;
    if (token){
      request.headers['x-token'] = token;
    } else {
      request.headers['x-token'] = ''; 
    }
    logger.info(`2. sessionId check`)
    const sessionId = cookies?.sessionId ?? null;
    if (sessionId){
      request.headers['x-session-id'] = sessionId;
      reply.setCookie('sessionId', sessionId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        maxAge: COOKIE_MAX_AGE
      });
      logger.info(`✅ Existing sessionId: ${sessionId}`);
      Fastify.log.info(`✅ Existing sessionId: ${sessionId}`);
    } else {
      const newSessionId = uuidv4();
      request.headers['x-session-id'] = newSessionId;
      reply.setCookie('sessionId', newSessionId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        maxAge: COOKIE_MAX_AGE // 1 hour
      });
      logger.info(`🆕 New sessionId created: ${newSessionId}`);
      Fastify.log.info(`🆕 New sessionId created: ${newSessionId}`);
    }
    console.log(`🌟🌟🌟🌟🌟🌟 token = ${request.headers['x-token']} :: sessionId = ${request.headers['x-session-id']}`)
  }
  catch (error: any){
    logger.error(`An error occured while extracting or setting sessionId/token: ${error.message}`, error);
    Fastify.log.error(`SessionId error: ${error.message}:  ${error}`);
    logger.info(`3. Error: setting values to empty`)
    if (!request.headers['x-token'] ||  request.headers['x-token'] === ''){
      logger.info(`Setting the token as x-token = empty`)
      request.headers['x-token'] = '';
    }
    if (!request.headers['x-session-id'] ||  request.headers['x-session-id'] === ''){
      logger.info(`Setting the token as x-session-id = empty`)
      request.headers['x-session-id'] = '';
    }
  }
});


await registerPlugins(Fastify);

await Fastify.addHook('preHandler', Fastify.verifyAuth);

// // global prehandler hook
// Fastify.addHook('preHandler', async (request, reply) => {
//   await Fastify.verifyAuth(request, reply);
// });

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

setupWebSocket();
logger.info("port: " + PORT);
try {
  logger.info('[[Gateway]] register root route');
  Fastify.register(firstRoute);
  logger.info('[[Gateway]] register health routes');
  Fastify.register(healthRoute);
  logger.info('[[Gateway]] register stats route');
  Fastify.register(statsRoute);
  logger.info('[[Gateway]] register remote-only ws routes ');
  Fastify.register(remoteOnlyRoute);
  logger.info('[[Gateway]] register user-service ws routes ');
  // Register WebSocket for internal calls
  Fastify.register(wsRoute, { prefix: '/user-service/ws' });
  // Register WebSocket for frontend calls  
  Fastify.register(wsRoute, { prefix: '/api/user-service/ws' });
  logger.info('[[Gateway]] ✅ Registered ws route with prefix /user-service/ws');
  logger.info('[[Gateway]] register /pong/demo routes ');
  Fastify.register(pongDemoRoute, { prefix: '/pong/demo' });
  logger.info('[[Gateway]] register /pong/game routes ');
  Fastify.register(pongGameRoute, { prefix: '/pong/game' });
  // Register Ready proxy so it matches /game/rooms/:roomId/players/:playerId/ready
  logger.info('[[Gateway]] register ready fallback route ');
  Fastify.register(readyRoute, { prefix: '/game' })
  logger.info('[[Gateway]] register game routes ');
  Fastify.register(gameRoute)
  logger.info('[[Gateway]] register user routes ');
  // Register for internal service calls (without /api prefix)
  Fastify.register(userRoute, { prefix: '/user-service' });
  // Register for frontend calls (with /api prefix)  
  Fastify.register(userRoute, { prefix: '/api/user-service' });
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
