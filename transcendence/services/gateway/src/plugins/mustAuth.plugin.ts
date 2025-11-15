import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import logger from '../utils/logger.js'; // log-service
import type { UserContext } from '../types';
import { proxyRequest } from '../utils/proxyHandler.js';
import { intermediateRequest } from '../utils/intermediateRequest.js';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
import { queueAwareIntermediateRequest } from '../utils/queueAwareIntermediateRequest.js';


// declare module 'fastify' {
//   interface FastifyReply {
//     mustAuth: () => Promise<void>;
//   }
// }

const mustAuthPlugin: FastifyPluginAsync = async (fastify) => {

fastify.decorateReply('body', null);

fastify.decorateReply('mustAuth', async function () {

	console.log(`🐱 mustAuth: start`)
	const reply = this;
	const request = reply.request as FastifyRequest;

	// internal logic error
	if (!request.user) {
		console.log(`🐱This request does not have a user object, this route may not require auth`)
		// throw fastify.httpErrors.badRequest('Missing required parameter: user: Invalid reqiuest');
		// return null;
	}// else {


// const response = await app.inject({
//   method: "GET",
//   url: "http://users-service.local/profile",
//   headers: {
//     "x-user-id": request.user!.id,
//     "x-user-role": request.user!.role,
//     "x-user-status": request.user!.status,
//   }
// });

// id: decoded.userId,
// username: decoded.username,
// role: 'registered',
// isGuest: decoded.isGuest,
// jwt: jwtToken,
// authState: 'valid'
	// 	request.headers['x-user-id'] !== req;


	// }

	const user: UserContext = request.user;

	request.headers['x-user-id'] = user.id ?? undefined;
	request.headers['x-user-name'] = user.username ?? undefined;
	request.headers['x-user-role'] = user.role ?? undefined;
	request.headers['x-isGuest'] = user.isGuest === undefined || user.isGuest === null ? undefined : `${user.isGuest}`;
	request.headers['x-auth-status'] = user.authState?? undefined;

	// invalid request
	if (user.authState === 'invalid'){
		console.log(`🐱invalid token`)
		// throw fastify.httpErrors.badRequest('Invalid request');
		// return null
	}

	// token expired user -> ask to login; guest -> issue new token
	if (user.authState === 'expired'){
		console.log(`🐱token is expired`)
		// throw fastify.httpErrors.badRequest('Invalid request');
	}

	// new user without token and only sessionId -> register in database and issue a token
	if (user.authState === 'new'){
		console.log(`🐱need to issue a token`)
		// const res = await intermediateRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/guest`, 'POST');
		const res = await queueAwareIntermediateRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/guest`, 'POST');
		if (res.error){
			console.log(`🐞🐞🐞🐞🐞Token issue failed ${res.error} : ${res.error.message || ''} `)
		}
		else {
			console.log(`Token issued: token ${res.token}, sessionId ${res.sessionId}`)
			// reply.body = res;
			if (res.token) {
				console.log('🐞🐞🐞🐞🐞Token yes')
				request.newToken= res.token;
				// reply.setCookie('token', res.token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
			}
			if (res.sessionId) {
				console.log('🐞🐞🐞🐞🐞sessionId yes')
				request.newSessionId = res.sessionId;
				// reply.setCookie('sessionId', res.sessionId, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
			}

		}
		// if (!res){
        //     throw fastify.httpErrors.badRequest('Database failed for storing cookie data');
        // }
		return
	}

	// registered user or registered guest with token --> go ahead
	if (user.authState ==='valid' && user.role === 'registered'){
		console.log(`🐱authentication successful`)
		return;
	}

});

};


export default fp(mustAuthPlugin);