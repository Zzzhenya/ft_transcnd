import type { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import fetchPlugin from '../plugins/customFetch.plugin.js'

export async function registerPlugins(fastify: FastifyInstance) {

  // Sensible adds app.httpErrors.*, app.to(), etc.
  await fastify.register(sensible);

  await fastify.register(fetchPlugin);
}