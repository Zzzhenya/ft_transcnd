import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import logger from '../utils/logger.js'; // log-service
import type { UserContext } from '../types';


// declare module 'fastify' {
//   interface FastifyReply {
//     mustAuth: () => Promise<void>;
//   }
// }

const mustAuthPlugin: FastifyPluginAsync = async (fastify) => {

fastify.decorateReply('mustAuth', async function () {
	const reply = this;
	const request = reply.request as FastifyRequest & { user?: UserContext };

	// internal logic error
	if (!request.user) {
		logger.warn(`This request does not have a user object, this route may not require auth`)
		// throw fastify.httpErrors.badRequest('Missing required parameter: user: Invalid reqiuest');
		// return null;
	}
	const user = request.user;

	// invalid request
	if (user.authState === 'invalid'){
		logger.warn(`invalid token`)
		// throw fastify.httpErrors.badRequest('Invalid request');
		// return null
	}

	// token expired user -> ask to login; guest -> issue new token
	if (user.authState === 'expired'){
		logger.warn(`token is expired`)
		// throw fastify.httpErrors.badRequest('Invalid request');
		// return null
	}

	// new user without token and only sessionId -> register in database and issue a token
	if (user.authState === 'new'){
		// return reply
	}

	// // registred user and guest with token
	// if (user.authState === 'valid' && user.role === 'registered')





});

};


export default fp(mustAuthPlugin);