// ./plugins/authPreHandler.plugin.ts
// ./plugins/authPreHandler.plugin.ts
import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import logger from '../utils/logger.js'; // log-service

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

/*
    const res = await queueAwareIntermediateRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/register`, 'POST');
    if (!res)
      throw fastify.httpErrors.badRequest('Database failed for storing cookie data');
    reply.setCookie('token', res.token, {
      httpOnly: true,
      secure: true,           // ✅ Only HTTPS for production
      sameSite: 'lax',       // ✅ Required for cross-origin if frontend is on another domain
      path: '/',              // ✅ Valid across all routes
    })
    // return proxyRequest(fastify, request, reply, `${USER_SERVICE_URL}/auth/register`, 'POST');
    reply.send(res);
  });

*/


const authPreHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate Fastify with a reusable per-route preHandler
  fastify.decorate('verifyAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info(`Checking for x-token`)
      const jwtToken = request.headers['x-token'] as string | undefined;;
      // if (Array.isArray(jwtToken)) {
      // // Pick the first header value
      //   jwtToken = jwtToken[0];
      // }
      logger.info(`Checking for x-session-id`)
      const sessionId = request.headers['x-session-id'] as string | undefined;;
      logger.info(`Logging cookies: debug step`)
      logCookies(request);

      if (jwtToken && jwtToken.trim() !== '') {
        logger.info(`jwtToken exists: ${jwtToken}`)

        logger.info(`Verifying jwtToken`)
        const decoded = await request.jwtVerify<{ userId: string; username: string; isGuest?: boolean }>();
        logger.info(`Creating registered user profile`)
        request.user = {
          id: decoded.userId,
          username: decoded.username,
          role: 'registered',
          isGuest: decoded.isGuest,
          jwt: jwtToken,
          authState: 'valid'
        };
        logger.info(`Profile: ${request.user.id},  ${request.user.username},  ${request.user.role},  ${request.user.isGuest},  ${request.user.jwt}`)
        return;
      }

      if (sessionId &&  sessionId.trim() !== '') {
        logger.info(`sessionId exists: ${sessionId}`)
        logger.info(`Creating unregistered user profile`)
        request.user = {
          id: sessionId,
          username: null,
          role: 'unregistered',
          jwt: null,
          authState: 'new'
        };
        logger.info(`Profile: ${request.user.id},  ${request.user.username},  ${request.user.role},  ${request.user.jwt}`)
        return;
      }

      logger.info(`sessionId and jwt token does not exist`)
      logger.info(`Creating unregistered user profile`)
      request.user = {
        id: null,
        username: null,
        role: 'unregistered',
        jwt: null,
        authState: 'invalid'
      };
      logger.info(`Profile: ${request.user.id},  ${request.user.username},  ${request.user.role},  ${request.user.jwt}`)
      return;
    } catch (error:any ) {
      logger.error(`An error occured while verifying token: ${error}`);
      if (error.name === 'TokenExpiredError' || error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED'){
        logger.error(`jwt Token is expired: ${error.code? error.code : ''} : ${error.name? error.name : ''}`)
        request.user = {
          id: null,
          username: null,
          role: 'unregistered',
          jwt: null,
          authState: 'expired'
        };
        return;
      } else {
        logger.error(`jwt Token is invalid: ${error.code? error.code : ''} : ${error.name? error.name : ''}`)
        request.user = {
          id: null,
          username: null,
          role: 'unregistered',
          jwt: null,
          authState: 'invalid'
        };
        return;
      }
    }
  });
};

export default fp(authPreHandlerPlugin, {
  name: 'auth-pre-handler-plugin',
});
