import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import logger from '../utils/logger.js';

const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://game-service:3002';

interface ReadyParams {
  roomId: string;
  playerId: string;
}

export default async function readyRoute(fastify: FastifyInstance) {
  // Accept empty JSON bodies for this route to avoid FST_ERR_CTP_EMPTY_JSON_BODY
  logger.info(`readyRoute: `)
  const tolerantJson = (req: any, body: string, done: any) => {
    try {
      if (!body || (typeof body === 'string' && body.trim() === '')) return done(null, {});
      return done(null, typeof body === 'string' ? JSON.parse(body) : body);
    } catch (err: any) {
      return done(err, undefined);
    }
  };
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, tolerantJson);
  fastify.addContentTypeParser('application/json; charset=utf-8', { parseAs: 'string' }, tolerantJson);

  fastify.post<{
    Params: ReadyParams
  }>('/rooms/:roomId/players/:playerId/ready', { preHandler: fastify.mustAuth }, async (req: FastifyRequest<{ Params: ReadyParams }>, reply: FastifyReply) => {
    const { roomId, playerId } = req.params;
    const upstream = `${GAME_SERVICE_URL}/rooms/${encodeURIComponent(roomId)}/players/${encodeURIComponent(playerId)}/ready`;
    try {
      logger.info('readyRoute: proxy ready -> game-service', { upstream, roomId, playerId });
      const res = await fetch(upstream, {
        method: 'POST'
      });

      const contentType = res.headers.get('content-type') || '';
      reply.status(res.status);
      if (contentType.includes('application/json')) {
        const body = await res.json();
        return reply.send(body);
      } else {
        const text = await res.text();
        return reply.send(text);
      }
    } catch (err: any) {
      logger.error('readyRoute: proxy ready failed', { error: err?.message, upstream });
      return reply.code(502).send({ error: 'Bad Gateway', detail: 'Failed to contact game-service' });
    }
  });
}
