import { FastifyReply } from 'fastify';

interface GatewayErrorPayload {
  service: string;
  statusCode: number;
  message: string;
  timestamp?: string;
}

export function gatewayError(
  reply: FastifyReply,
  statusCode: number
) {
  const payload: GatewayErrorPayload = {
    service: 'gateway',
    statusCode,
    error: 'Service Unavailable',
    message: 'The upstream service is currently unavailable.',
    timestamp: new Date().toISOString(),
  };

  return reply.code(statusCode).send(payload);
}
