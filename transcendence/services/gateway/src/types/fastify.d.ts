// types/fastify-jwt.d.ts
import 'fastify';
import { User } from './user.d.js';

declare module 'fastify' {

  interface FastifyInstance {
    verifyAuth(request: FastifyRequest, reply: any): Promise<void>;
  };

  interface FastifyRequest {
    jwtVerify<T = any>(): Promise<T>;
    user?: User;
  };
}
