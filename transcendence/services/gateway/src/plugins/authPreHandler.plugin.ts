// ./plugins/authPreHandler.plugin.ts
// ./plugins/authPreHandler.plugin.ts
import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

const authPreHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate Fastify with a reusable per-route preHandler
  fastify.decorate('verifyAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const jwtToken = request.cookies?.jwt || null;
      const sessionId = request.cookies?.sessionId || null;

      if (jwtToken) {
        // Provide the correct type for the decoded JWT payload
        const decoded = await request.jwtVerify<{ userId: string; username: string }>();
        request.user = {
          id: decoded.userId,
          username: decoded.username,
          role: 'registered',
          jwt: jwtToken,
        };
        return;
      }

      if (sessionId) {
        request.user = {
          id: sessionId,
          username: null,
          role: 'guest',
          jwt: null,
        };
        return;
      }

      request.user = {
        id: null,
        username: null,
        role: 'guest',
        jwt: null,
      };
    } catch {
      request.user = {
        id: null,
        username: null,
        role: 'guest',
        jwt: null,
      };
    }
  });
};

export default fp(authPreHandlerPlugin, {
  name: 'auth-pre-handler-plugin',
});
