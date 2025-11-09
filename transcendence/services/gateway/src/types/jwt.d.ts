// // src/types/fastify.d.ts
import 'fastify';

declare module 'fastify' {
//   interface FastifyRequest {
//     user?: {
//       id: string | null;
//       username: string | null;
//       role: 'registered' | 'guest';
//       jwt: string | null;
//     };
//   }

  interface FastifyInstance {
    verifyAuth(request: FastifyRequest, reply: any): Promise<void>;
  }
}


// // src/types/fastify-jwt.d.ts
// import '@fastify/jwt';

// declare module '@fastify/jwt' {
//   interface FastifyJWT {
//     // The shape of your JWT payload when signing
//     payload: {
//       userId: string | number;
//       username: string;
//     };
//     // The shape of what you attach to request.user (optional but nice)
//     user: {
//       id: string | number | null;
//       username: string | null;
//       role: 'registered' | 'guest';
//       jwt: string | null;
//     };
//   }
// }