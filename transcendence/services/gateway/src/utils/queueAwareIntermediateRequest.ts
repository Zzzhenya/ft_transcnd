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
    if (!value) continue;           // skip undefined
    if (Array.isArray(value)) {
      result[key] = value.join(','); // join arrays with commas
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
const QUEUE_CHECK_CACHE_TTL = 1000; // Cache queue status for 1 second

async function getQueueStatus(fastify: FastifyInstance): Promise<QueueStatus | null> {
  if (!QUEUE_CHECK_ENABLED) return null;
  
  const now = Date.now();
  if (lastQueueStatus && (now - lastQueueCheck) < QUEUE_CHECK_CACHE_TTL) {
    return lastQueueStatus;
  }

  try {
    const response = await fetch(`${DATABASE_SERVICE_URL}/internal/queue-status`, {
      method: 'GET',
      signal: AbortSignal.timeout(1000) // Quick check, 1 second timeout
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
  if (!DYNAMIC_TIMEOUT_ENABLED || !queueStatus) {
    return BASE_TIMEOUT;
  }

  const { queue } = queueStatus;
  
  // Base calculation: add time based on queue utilization
  const utilizationMultiplier = Math.max(1, queue.utilization / 20); // 20% utilization = 1x, 100% = 5x
  const queueSizeMultiplier = Math.max(1, queue.size / 10); // Every 10 items in queue adds 1x
  
  const calculatedTimeout = BASE_TIMEOUT * utilizationMultiplier * queueSizeMultiplier;
  
  // Cap at maximum timeout
  const finalTimeout = Math.min(calculatedTimeout, MAX_TIMEOUT);
  
  logger.info(`[[Gateway]] Dynamic timeout calculated: ${finalTimeout}ms (base: ${BASE_TIMEOUT}ms, queue: ${queue.size}/${queue.maxSize}, utilization: ${queue.utilization.toFixed(1)}%)`);
  
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

    logger.info(`[[Gateway]] Gateway received ${method} request for ${upstreamUrl} (timeout: ${dynamicTimeout}ms)`);

    const response = await request.customFetch(
      upstreamUrl,
      {
        method,
        headers: normalizeHeaders(request.headers),
        body: ['POST', 'PUT', 'PATCH'].includes(method) ? JSON.stringify(request.body) : null,
      },
      dynamicTimeout
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errBody = data || (await response.text().catch(() => ''));
      const statusCode = response.status >= 500 ? 502 : response.status;
      reply.code(statusCode); // update reply status

      return {
        error: response.status >= 500 ? 'Bad Gateway' : 'Upstream Error',
        message: response.status >= 500
          ? `Upstream ${upstreamUrl} service error`
          : `Upstream ${upstreamUrl} error: ${errBody}`,
      };
    }

    reply.setCookie('token', data.token, {
          httpOnly: true,
          secure: true,           // ✅ Only HTTPS for production
          sameSite: 'lax',       // ✅ Required for cross-origin if frontend is on another domain
          path: '/',              // ✅ Valid across all routes
        })  
    // For successful responses, set the status code
    reply.status(response.status);
    // return data;
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

    reply.code(errorObj.statusCode); // update reply status
    return errorObj;
  }
}