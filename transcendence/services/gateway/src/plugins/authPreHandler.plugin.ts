// ./plugins/authPreHandler.plugin.ts
// ./plugins/authPreHandler.plugin.ts
import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

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
      // const jwtToken = request.cookies?.jwt || null;
      const jwtToken = request.cookies?.token || null;
      const sessionId = request.cookies?.sessionId || null;

      logCookies(request);

      // const authorizationHeader = request.headers['authorization'] || null;

      // if (!authorizationHeader) {
      //   console.log(`prehandler request.headers is unauthorized`)
      //     // return reply.unauthorized('Authorization header is missing');
      // }

      // // The header value is expected to be "Bearer <token>"
      // const jwtToken = authorizationHeader?.split(' ')[1] || null;

      if (request.user){
        console.log(`prehandler request already has a user ${request.user}`)
      } else {
        console.log(`prehandler request doesn't have a user`)
      }

      if (jwtToken) {
        console.log(`prehandler jwtToken: ${jwtToken}`)
        // Provide the correct type for the decoded JWT payload
        const decoded = await request.jwtVerify<{ userId: string; username: string; isGuest?: boolean }>();
        request.user = {
          id: decoded.userId,
          username: decoded.username,
          role: 'registered',
          isGuest: decoded.isGuest,
          jwt: jwtToken,
        };
        return;
      }

      if (sessionId) {
        console.log(`prehandler sessionId: ${sessionId}`)
        request.user = {
          id: sessionId,
          username: null,
          role: 'unregistred',
          jwt: null,
        };
        return;
      }


      console.log(`prehandler: no id`)
      request.user = {
        id: null,
        username: null,
        role: 'unregistred',
        jwt: null,
      };
    } catch (error:any) {
      fastify.log.error(`Prehandler: error: ${error}`)
      console.log(`prehandler: exception`)
      request.user = {
        id: null,
        username: null,
        role: 'unregistred',
        jwt: null,
      };
    }
  });
};

export default fp(authPreHandlerPlugin, {
  name: 'auth-pre-handler-plugin',
});
