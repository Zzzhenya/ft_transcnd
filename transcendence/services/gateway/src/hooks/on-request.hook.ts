// hooks/on-request.hook.ts
import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply, FastifyPluginCallback } from 'fastify';

// export async function onRequestHook(req: FastifyRequest, reply: FastifyReply) {
//   // Authentication, logging, etc.
// }
// export default onRequestHook;

// src/middleware/sessionId.middleware.ts
// import { FastifyPluginCallback } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

const onRequestHook: FastifyPluginCallback = (fastify: FastifyInstance, opts: FastifyPluginOptions, done) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const existingSessionId = request.cookies.sessionId;
    
    if (!existingSessionId) {
        const newSessionId = uuidv4();
        // const newSessionId = '1233312';

        reply.setCookie('sessionId', newSessionId, {
            path: '/',           // cookie available on all routes
            httpOnly: true,      // not accessible via client-side JS
            secure: false,        // true send only over HTTPS
            sameSite: 'none',   // none for HTTPS
            maxAge: 3600         // 1 hour
      });
        
        // reply.setCookie('sessionId', newSessionId, {
        //     path: '/',
        //     httpOnly: true,
        //     sameSite: 'lax',
        //     secure: process.env.NODE_ENV === 'production',
        //     maxAge: 60 * 60 * 24 * 7, // 7 days
        // });
        fastify.log.info('newSessionId: '+ newSessionId)
    //   (request as any).sessionId = newSessionId;
    } else {
        fastify.log.info('existingSessionId: '+ existingSessionId)
    //   (request as any).sessionId = existingSessionId;
    }
  });

  done();
};


/*

      reply
      .setCookie('sessionId', sessionId, {
        path: '/',           // cookie available on all routes
        httpOnly: true,      // not accessible via client-side JS
        secure: false,        // true send only over HTTPS
        sameSite: 'none',   // none for HTTPS
        // sameSite: 'Strict',  // CSRF protection
        maxAge: 3600         // 1 hour
      })

*/

export default onRequestHook;
