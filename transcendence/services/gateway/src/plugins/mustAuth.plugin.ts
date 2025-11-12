// import fp from 'fastify-plugin'
// import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
// import logger from '../utils/logger.js'; // log-service


// declare module 'fastify' {
//   interface FastifyReply {
//     mustAuth: () => Promise<void>;
//   }
// }

// const mustAuthPlugin: FastifyPluginAsync = async (fastify) => {

// fastify.decorateReply('mustAuth', async function () {
// 	const reply = this;
// 	const request = reply.request as FastifyRequest & { user?: UserContext };

// 	if (!request.user) {
// 		logger.warn(`This request does not have a user object, it may not require auth`)
// 	}

// }

// }


// export default fp(mustAuthPlugin);