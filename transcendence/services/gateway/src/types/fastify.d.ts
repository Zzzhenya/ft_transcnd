// types/fastify-jwt.d.ts
import 'fastify';
import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { User } from './user.d.js';

declare module 'fastify' {

  interface FastifyRequest {
    jwtVerify<T = any>(): Promise<T>;
    user?: User;
  };

  interface FastifyInstance {
    verifyAuth(
      request: FastifyRequest,
      reply: any): Promise<void>;
    
    mustAuth: preHandlerHookHandler;
    
  };
}
