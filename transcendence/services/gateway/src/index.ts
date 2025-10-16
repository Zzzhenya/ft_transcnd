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
import logger from './utils/logger.js'; // log-service
// console.log(services.users);

const Fastify = fastify({logger:true});

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
  await Fastify.register(cors, {  });
  logger.info('here\n');
}

setupcors();
setupWebSocket();
logger.info("port: " + PORT);
Fastify.register(firstRoute);
Fastify.register(healthRoute);
Fastify.register(statsRoute);
Fastify.register(wsRoute, { prefix: '/ws' })
Fastify.register(userRoute, { prefix: '/user-service' })
// Fastify.register(wsRoute)
logger.info('Something important happened!');
start();