import type { FastifyReply } from 'fastify';

interface GatewayErrorPayload {
  service: string;
  statusCode: number;
  error: string;
  message: string;
  timestamp?: string;
}

export default function gatewayError(
  reply: FastifyReply,
  statusCode: number,
  error: string,
  message: string
) {
  const payload: GatewayErrorPayload = {
    service: 'gateway',
    statusCode,
    error,
    message,
    timestamp: new Date().toISOString(),
  };

  return reply.code(statusCode).send(payload);
}
