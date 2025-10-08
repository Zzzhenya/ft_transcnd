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
import firstRoute from './routes.js'
import healthRoute from './routes/health.route.js'
import wsRoute from './routes/ws-proxy.route.js'
import userRoute from './routes/user.route.js'
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
  await Fastify.register(cors, {  });
  console.log('here\n');
}

setupcors();
console.log("port: " + PORT);
Fastify.register(firstRoute);
Fastify.register(healthRoute);
Fastify.register(wsRoute, { prefix: '/ws' })
Fastify.register(userRoute, { prefix: '/user-service' })
// Fastify.register(wsRoute)
Fastify.log.info('Something important happened!');
start();