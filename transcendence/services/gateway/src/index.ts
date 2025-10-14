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
import cookie from '@fastify/cookie'
// console.log(services.users);

const Fastify = fastify({logger:true});

Fastify.register(cookie, {
  // secret: 'my-secret-key', // optional, for signed cookies
});

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
  console.log('WebSocket plugin registered');
}

function listening(){
    console.log(`App server is up and running on localhost: port 3000`);
};

const start = async () => { 
	try {
    console.log('here\n');
		await Fastify.listen({port:PORT, host: '0.0.0.0'})
	}
	catch (error) {
		Fastify.log.error(error)
		process.exit(1)
	}

}

const setupcors = async () => {
  await Fastify.register(cors, {
  // origin: 'http://localhost:3004', // <-- your frontend origin // actual frontend
  origin: ['null'], // to test fetch with a file/ demo
  credentials: true                   // <-- allow sending cookies cross-origin
    });
  console.log('here\n');
}

setupcors();
setupWebSocket();
console.log("port: " + PORT);
Fastify.register(firstRoute);
Fastify.register(healthRoute);
Fastify.register(statsRoute);
Fastify.register(wsRoute, { prefix: '/ws' })
Fastify.register(userRoute, { prefix: '/user-service' })
// Fastify.register(wsRoute)
Fastify.log.info('Something important happened!');
start();