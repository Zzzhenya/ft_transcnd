import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import gatewayError from './gatewayError.js'; // adjust path
import logger from './logger.js';

export async function proxyRequest(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  upstreamUrl: string,
  method: string = 'GET'
) {
  try {
    logger.info(`[[Gateway]] Gateway received ${method} request for ${upstreamUrl}`)
    fastify.log.info(`Gateway received ${method} request for ${upstreamUrl}`);

    const response = await request.customFetch(
      upstreamUrl,
      {
        method,
        headers: {
          'Authorization': request.headers['authorization'] || '',
          'Content-Type': 'application/json',
        },
        body: ['POST', 'PUT', 'PATCH'].includes(method)
          ? JSON.stringify(request.body)
          : null,
      },
      5000
    );

    if (!response.ok) {
      // fastify.log.warn(`[[Gateway]]`, { status: response.status }, 'Upstream returned non-OK response');
      // logger.warn(`[[Gateway]]`,{ status: response.status }, 'Upstream returned non-OK response');
      fastify.log.warn(`[[Gateway]] Upstream returned non-OK response`);
      logger.warn(`[[Gateway]] Upstream returned non-OK response`);
      return gatewayError(
        reply,
        502,
        'Bad Gateway',
        'The server received an invalid response from an upstream service. Please try again later.'
      );
    }

    const data = await response.json();
    return reply.status(response.status).send(data);

  } catch (error: any) {
    fastify.log.error(error);
    logger.error(`[[Gateway]] ${method} request for ${upstreamUrl} failed`, error);
    if (error instanceof Error && error.name === 'AbortError') {
      fastify.log.error('[[Gateway]] Upstream request timed out');
      logger.error('[[Gateway]] Upstream request timed out');
      return gatewayError(
        reply,
        504,
        'Gateway Timeout',
        'The upstream service took too long to respond. Please try again later.'
      );
    }

    fastify.log.error('[[Gateway]] Upstream service unavailable');
    logger.error('[[Gateway]] Upstream service unavailable');
    return gatewayError(
      reply,
      503,
      'Service Unavailable',
      'The upstream service is currently unavailable.'
    );
  }
}
