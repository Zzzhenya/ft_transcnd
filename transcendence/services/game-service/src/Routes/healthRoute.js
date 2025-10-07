
export function healthCheck(fastify) {
fastify.get('/health', async () => {
  return {
    status: 'ok',
    service: 'game-service',
    timestamp: new Date(),
    uptime: Math.floor(process.uptime())
  };
});
}
