// plugins/tokenVerification.plugin.ts

import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import logger from '../utils/logger.js'; // log-service
import type { User } from '../types/user.d.js';

// interface User {
//   id: string | number | null;
//   username: string | null;
//   role: 'registered' | 'guest';
//   isGuest?: boolean;
//   jwt: string | null;
//   authState: 'valid' | 'expired' | 'missing' | 'invalid';
// }

const tokenVerificationPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('verifyAuth', async (request: FastifyRequest & { user?: User }, reply: FastifyReply) => {
    try {
      console.log(`🐞 Verify auth started...`);
      logger.info(`1. Extract x-token`);
      const jwtToken = request.headers['x-token'] as string | undefined;

      if (jwtToken && jwtToken.trim() !== '') {
        console.log(`🐞 token exists`);
        logger.info(`2. Verifying jwtToken`);
        const decoded = await request.jwtVerify<{ userId: string; username: string; isGuest?: boolean }>();
        logger.info(`3. Verification successful.`);

        // Determine if this is a guest or registered user from token
        if (decoded.isGuest) {
          // Returning Guest Valid
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
          request.user = {
            id: decoded.userId,
            username: decoded.username,
            role: 'registered',
            isGuest: false,
            jwt: jwtToken,
            authState: 'valid'
          };
        }

        console.log(`🌟Profile: ${request.user.id}, ${request.user.username}, ${request.user.role}, ${request.user.isGuest}, ${request.user.jwt}`);
        return;
      }

      // No JWT → check for new guest via sessionId
      const sessionId = request.headers['x-session-id'] as string | undefined;
      if (sessionId && sessionId.trim() !== '') {
        // New Guest (temporary)
        request.user = {
          id: sessionId,
          username: null,
          role: 'guest',
          isGuest: true,
          jwt: null,
          authState: 'valid'
        };
        console.log(`🌟Profile (new guest): ${request.user.id}, ${request.user.username}, ${request.user.role}, ${request.user.isGuest}, ${request.user.jwt}`);
        return;
      }

      // No token or sessionId → Registered Missing
      console.log(`Token and sessionId are missing`);
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
      logger.error(`An error occurred while verifying token: ${error}`);

      const expired = error.name === 'TokenExpiredError' || error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED';

      if (expired) {
        // Expired token
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
