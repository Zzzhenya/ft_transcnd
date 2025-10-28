export function healthRoute(fastify, options, done) {
  fastify.get('/health', async (request, reply) => {
    reply.send({ status: 'ok' });
  });
  done();
}