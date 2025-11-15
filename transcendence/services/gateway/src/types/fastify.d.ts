// // src/types/fastify.d.ts
import 'fastify';
import type {UserContext} from './user.d.js';

declare module 'fastify' {

  // verifyAuth and mustAuth should be used together for auth necessary and expensive routes
  // authPrehandler.plugin.ts
  interface FastifyInstance {
    verifyAuth(request: FastifyRequest, reply: any): Promise<void>;
  };

  // mustAuth.plugin.ts
  interface FastifyReply {
    mustAuth: () => Promise<void>;
    body?: any;

  };

  // customFetch.plugin.ts
  interface FastifyRequest {
    customFetch(url: string, options?: RequestInit, timeoutMs?: number): Promise<Response>
  };

  // user.d.ts
  interface FastifyRequest {
    user: UserContext;
    newToken: any;
    newSessionId: any;
  };
};
