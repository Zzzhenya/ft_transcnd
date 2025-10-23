/*// hooks/on-request.hook.ts
import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply, FastifyPluginCallback } from 'fastify';

// export async function onRequestHook(req: FastifyRequest, reply: FastifyReply) {
//   // Authentication, logging, etc.
// }
// export default onRequestHook;

// src/middleware/sessionId.middleware.ts
// import { FastifyPluginCallback } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

const onRequestHook: FastifyPluginCallback = (fastify: FastifyInstance, opts: FastifyPluginOptions, done) => {
  // fastify.addHook('preHandler', async (request, reply) => {
  //   fastify.log.info(request);
  //   fastify.log.info(`✅ onRequest hook triggered for ${request.url}`);
  //   const haveCookie = request.cookies;
  //   const existingSessionId = request.cookies.sessionId;
  //   var wantNew = false;
  //   if (!haveCookie)
  //     wantNew = true;
  //   if (!existingSessionId)
  //     wantNew = true;
  //   if (wantNew) {
  //       const newSessionId = uuidv4();
  //       // const newSessionId = '1233312';

  //       reply.setCookie('sessionId', newSessionId, {
  //           path: '/',           // cookie available on all routes
  //           httpOnly: true,      // not accessible via client-side JS
  //           secure: false,        // true send only over HTTPS
  //           sameSite: 'lax',   // none for HTTPS
  //           // maxAge: 3600         // 1 hour
  //     });
  //       fastify.log.info('newSessionId: '+ newSessionId)
  //   } else {
  //       fastify.log.info('existingSessionId: '+ existingSessionId)
  //   }
  // });
  // done();
};
*/

/*

        // reply.setCookie('sessionId', newSessionId, {
        //     path: '/',
        //     httpOnly: true,
        //     sameSite: 'lax',
        //     secure: process.env.NODE_ENV === 'production',
        //     maxAge: 60 * 60 * 24 * 7, // 7 days
        // });

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

//export default onRequestHook;
