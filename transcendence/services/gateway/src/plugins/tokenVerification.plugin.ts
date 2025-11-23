// plugins/tokenVerification.plugin.ts

import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import logger from '../utils/logger.js'; // log-service
import type { User } from '../types/user.d.js';

/* note: for the shape of User object
interface User {
  id: string | number | null;
  username: string | null;
  role: 'registered' | 'guest';
  isGuest?: boolean;
  jwt: string | null;
  authState: 'valid' | 'expired' | 'missing' | 'invalid';
}

This decorator decorates the request with user object -> it does not throw errors 
but it tags errors in the user object in order for the mustAuth prehandler in
strictly authorized routes to pick up.

*/

const tokenVerificationPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('verifyAuth', async (request: FastifyRequest & { user?: User }, reply: FastifyReply) => {
    try {
      fastify.log.info(`verifyAuth: Vefify auth started...`)
      logger.info(`verifyAuth: Vefify auth started...`);
      logger.info(`verifyAuth: 1. Extract x-token`);
      const jwtToken = request.headers['x-token'] as string | undefined;

      if (jwtToken && jwtToken.trim() !== '') {
        logger.info(`verifyAuth: 2. Verifying jwtToken`);
        const decoded = await request.jwtVerify<{ userId: string; username: string; isGuest?: boolean }>();
        logger.info(`verifyAuth: 3. Verification successful.`);

        // Determine if this is a guest or registered user from token
        if (decoded.isGuest) {
          // Returning Guest Valid
          logger.info(`verifyAuth: Registed valid user - Guest user`);
          request.user = {
            id: decoded.userId,
            username: `guest_${decoded.userId}`,
            role: 'guest',
            isGuest: true,
            jwt: jwtToken,
            authState: 'valid'
          };
        } else {
          // Registered Valid
          logger.info(`verifyAuth: Registed valid user - Auth user`);
          request.user = {
            id: decoded.userId,
            username: decoded.username,
            role: 'registered',
            isGuest: false,
            jwt: jwtToken,
            authState: 'valid'
          };
        }
        return;
      }

      // No JWT → check for new guest via sessionId
      const sessionId = request.headers['x-session-id'] as string | undefined;
      if (sessionId && sessionId.trim() !== '') {
        // New Guest (temporary)
        logger.info(`verifyAuth: sessionId id exists - Guest`);
        request.user = {
          id: sessionId,
          username: null,
          role: 'guest',
          isGuest: true,
          jwt: null,
          authState: 'valid'
        };
        return;
      }

      // No token or sessionId → Registered Missing
      logger.info(`verifyAuth: Token and sessionId are missing - Something went wrong/ anAuthorized user`);
      request.user = {
        id: null,
        username: null,
        role: 'registered',
        isGuest: false,
        jwt: null,
        authState: 'missing'
      };
      return;

    } catch (error: any) {
      logger.error(`verifyAuth: An error occurred while verifying token: ${error}`);

      const expired = error.name === 'TokenExpiredError' || error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED';

      if (expired) {
        // Expired token
        logger.info(`verifyAuth: Expired token`);
        request.user = {
          id: null,
          username: null,
          role: 'registered',
          isGuest: false,
          jwt: null,
          authState: 'expired'
        };
      } else {
        // Invalid token
        logger.info(`verifyAuth: Invalid token`);
        request.user = {
          id: null,
          username: null,
          role: 'registered',
          isGuest: false,
          jwt: null,
          authState: 'invalid'
        };
      }
      return;
    }
  });
};

export default fp(tokenVerificationPlugin, {
  name: 'token-verification-plugin',
});
