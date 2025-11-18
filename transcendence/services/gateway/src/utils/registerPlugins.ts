import type { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import fetchPlugin from '../plugins/customFetch.plugin.js'
import tokenVerificationPlugin from '../plugins/tokenVerification.plugin.js'
import mustAuthPlugin from '../plugins/mustAuth.plugin.js'

export async function registerPlugins(fastify: FastifyInstance) {

  // Sensible adds app.httpErrors.*, app.to(), etc.
  await fastify.register(sensible);

  await fastify.register(tokenVerificationPlugin);

  await fastify.register(mustAuthPlugin);

  await fastify.register(fetchPlugin);
}