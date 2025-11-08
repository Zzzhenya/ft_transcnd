import type { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import fetchPlugin from '../plugins/customFetch.plugin.js'
import authPreHandlerPlugin from '../plugins/authPreHandler.plugin.js'
import fastifyJwt from '@fastify/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function registerPlugins(fastify: FastifyInstance) {

  // Sensible adds app.httpErrors.*, app.to(), etc.
  await fastify.register(sensible);
  await fastify.register(fetchPlugin);

  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'supersecretkey', // use env variable in production
    cookie: {
      cookieName: 'jwt', // cookie name
      signed: true      // set to true if you want cookie signing
    }
  });

  // // Register preHandler plugin for JWT verification
  // await fastify.register(authPreHandlerPlugin);

}