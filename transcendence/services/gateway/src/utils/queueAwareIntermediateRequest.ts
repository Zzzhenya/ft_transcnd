// Queue-aware proxy handler with dynamic timeout adjustment
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import logger from './logger.js';

const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://database-service:3006';
const BASE_TIMEOUT = parseInt(process.env.PROXY_REQUEST_TIMEOUT || '5000');
const MAX_TIMEOUT = parseInt(process.env.PROXY_MAX_TIMEOUT || '15000');
const QUEUE_CHECK_ENABLED = process.env.GATEWAY_QUEUE_CHECK_ENABLED === 'true';
const DYNAMIC_TIMEOUT_ENABLED = process.env.GATEWAY_DYNAMIC_TIMEOUT === 'true';

function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      result[key] = value.join(',');
    } else {
      result[key] = value;
    }
  }
  return result;
}

interface QueueStatus {
  success: boolean;
  queue: {
    size: number;
    pending: number;
    isPaused: boolean;
    maxSize: number;
    timeout: number;
    utilization: number;
  };
  timestamp: string;
}

let lastQueueStatus: QueueStatus | null = null;
let lastQueueCheck = 0;
const QUEUE_CHECK_CACHE_TTL = 1000;

async function getQueueStatus(fastify: FastifyInstance): Promise<QueueStatus | null> {
  if (!QUEUE_CHECK_ENABLED) return null;

  const now = Date.now();
  if (lastQueueStatus && (now - lastQueueCheck) < QUEUE_CHECK_CACHE_TTL) {
    return lastQueueStatus;
  }

  try {
    const response = await fetch(`${DATABASE_SERVICE_URL}/internal/queue-status`, {
      method: 'GET',
      signal: AbortSignal.timeout(1000),
    });

    if (response.ok) {
      lastQueueStatus = await response.json();
      lastQueueCheck = now;
      return lastQueueStatus;
    }
  } catch (error) {
    logger.warn('[[Gateway]] Failed to get queue status:', error);
  }

  return null;
}

function calculateDynamicTimeout(queueStatus: QueueStatus | null): number {
  if (!DYNAMIC_TIMEOUT_ENABLED || !queueStatus) return BASE_TIMEOUT;

  const { queue } = queueStatus;
  const utilizationMultiplier = Math.max(1, queue.utilization / 20);
  const queueSizeMultiplier = Math.max(1, queue.size / 10);
  const calculatedTimeout = BASE_TIMEOUT * utilizationMultiplier * queueSizeMultiplier;
  const finalTimeout = Math.min(calculatedTimeout, MAX_TIMEOUT);

  logger.info(`[[Gateway]] Dynamic timeout: ${finalTimeout}ms (queue: ${queue.size}/${queue.maxSize}, utilization: ${queue.utilization.toFixed(1)}%)`);
  return finalTimeout;
}

export async function queueAwareIntermediateRequest(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  upstreamUrl: string,
  method: string = 'GET'
): Promise<any> {
  let queueStatus: QueueStatus | null = null;
  let dynamicTimeout = BASE_TIMEOUT;

  try {
    queueStatus = await getQueueStatus(fastify);
    dynamicTimeout = calculateDynamicTimeout(queueStatus);

    if (queueStatus && queueStatus.queue.utilization > 90) {
      // Update reply status, but don't send
      reply.code(503);
      return {
        error: 'Service Unavailable',
        message: 'Database service is currently overloaded. Please try again later.',
      };
    }

    logger.info(`[[Gateway]] ${method} request for ${upstreamUrl} (timeout: ${dynamicTimeout}ms)`);

    // Merge body with user info if needed
    // const mergedPayload = {
    //   ...(request.body || {}),
    //   user: (request as any).user || null,
    // };

    const response = await request.customFetch(
      upstreamUrl,
      {
        method,
        headers: { ...normalizeHeaders(request.headers) },
        // body: ['POST', 'PUT', 'PATCH'].includes(method) ? JSON.stringify(mergedPayload) : null,
        body: ['POST', 'PUT', 'PATCH'].includes(method) ? JSON.stringify(request.body) : null,
      },
      dynamicTimeout
    );

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = await response.text().catch(() => null);
    }

    if (!response.ok) {
      console.log(`response: ${response.status} : ${data} : ${response}`)
      const statusCode = response.status >= 500 ? 502 : response.status;
      reply.code(statusCode);
      return {
        error: response.status >= 500 ? 'Bad Gateway' : 'Upstream Error',
        message: response.status >= 500
          ? `Upstream ${upstreamUrl} service error`
          : `Upstream ${upstreamUrl} error: ${JSON.stringify(data)}`,
      };
    }

    // Commented-out cookie handling
    // reply.setCookie('token', data.token, {
    //   httpOnly: true,
    //   secure: true,           
    //   sameSite: 'lax',       
    //   path: '/',              
    // });

    // reply.setCookie('sessionId', data.sessionId, {
    //   httpOnly: true,
    //   secure: true,           
    //   sameSite: 'lax',       
    //   path: '/',              
    // });

    // For successful responses, set the status code
    reply.status(response.status);
    console.log(`🌟Queue-aware Intermediate request returned data: sessionId: ${data?.sessionId} token: ${data?.token}`);
    return data;

  } catch (error: any) {
    let errorObj = {
      error: 'Bad Gateway',
      message: 'The server received an invalid response from an upstream service. Please try again later.',
      statusCode: 502,
    };

    if (error instanceof Error && error.name === 'AbortError') {
      errorObj = {
        error: 'Gateway Timeout',
        message: `The upstream service timed out after ${dynamicTimeout}ms.`,
        statusCode: 504,
      };
    } else if (error.cause?.code === 'ECONNREFUSED') {
      errorObj = {
        error: 'Service Unavailable',
        message: `The upstream service ${upstreamUrl} is currently unavailable.`,
        statusCode: 503,
      };
    } else if (error.statusCode && error.message) {
      errorObj = error;
    }

    reply.code(errorObj.statusCode);
    return errorObj;
  }
}
