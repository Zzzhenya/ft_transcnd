// Queue-aware proxy handler with dynamic timeout adjustment
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import logger from './logger.js';

const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://database-service:3006';
const BASE_TIMEOUT = parseInt(process.env.PROXY_REQUEST_TIMEOUT || '5000');
const MAX_TIMEOUT = parseInt(process.env.PROXY_MAX_TIMEOUT || '15000');
const QUEUE_CHECK_ENABLED = process.env.GATEWAY_QUEUE_CHECK_ENABLED === 'true';
const DYNAMIC_TIMEOUT_ENABLED = process.env.GATEWAY_DYNAMIC_TIMEOUT === 'true';

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

export async function queueAwareProxyRequest(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  upstreamUrl: string,
  method: string = 'GET'
) {
  // Declare variables at function scope
  let queueStatus: QueueStatus | null = null;
  let dynamicTimeout = BASE_TIMEOUT;
  
  try {
    // Check if this is a database operation (write operations that might use the queue)
    // Note: Currently no DELETE endpoints exist in database-service
    const isDatabaseOperation = upstreamUrl.includes('database-service') && 
                               ['POST', 'PUT', 'PATCH'].includes(method);

    if (isDatabaseOperation && QUEUE_CHECK_ENABLED) {
      queueStatus = await getQueueStatus(fastify);
      dynamicTimeout = calculateDynamicTimeout(queueStatus);

      // If queue is too full, reject early
      if (queueStatus && queueStatus.queue.utilization > 90) {
        logger.warn(`[[Gateway]] Queue utilization too high: ${queueStatus.queue.utilization}%, rejecting request`);
        return reply.code(503).send({ 
          error: 'Service Unavailable',
          message: 'Database service is currently overloaded. Please try again later.' 
        });
      }
    }

    logger.info(`[[Gateway]] Gateway received ${method} request for ${upstreamUrl} (timeout: ${dynamicTimeout}ms)`);
    fastify.log.info(`Gateway received ${method} request for ${upstreamUrl} (timeout: ${dynamicTimeout}ms)`);

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
      dynamicTimeout
    );

    if (!response.ok) {
      fastify.log.warn(`[[Gateway]] Upstream returned non-OK response`);
      logger.warn(`[[Gateway]] Upstream returned non-OK response`);
      
      const body = await response.text().catch(() => '');

      if (response.status >= 400 && response.status < 500) {
        logger.warn(`[[Gateway]] ${upstreamUrl || ''} error : ${response.status} :  ${body}`);
        return reply.code(response.status).send({
          error: 'Upstream Error',
          message: `Upstream ${upstreamUrl || ''} error: ${body}`
        });
      } else if (response.status >= 500) {
        logger.warn(`[[Gateway]] ${upstreamUrl || ''} error : ${response.status} :  ${body}`);
        return reply.code(502).send({
          error: 'Bad Gateway',
          message: `Upstream ${upstreamUrl || ''} service error`
        });
      }
    }

    const data = await response.json();

    reply.setCookie('token', data.token, {
      httpOnly: true,
      secure: true,           // ✅ Only HTTPS for production
      sameSite: 'lax',       // ✅ Required for cross-origin if frontend is on another domain
      path: '/',              // ✅ Valid across all routes
    })

    reply.setCookie('sessionId', data.sessionId, {
      httpOnly: true,
      secure: true,           // ✅ Only HTTPS for production
      sameSite: 'lax',       // ✅ Required for cross-origin if frontend is on another domain
      path: '/',              // ✅ Valid across all routes
    })

    return reply.status(response.status).send(data);

  } catch (error: any) {
    fastify.log.error(error);
    logger.error(`[[Gateway]] ${method} request for ${upstreamUrl} failed`, error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      fastify.log.error('[[Gateway]] Upstream request timed out');
      logger.error(`[[Gateway]] Upstream request to ${upstreamUrl || ''} timed out after ${dynamicTimeout}ms`);
      
      // Include queue status in timeout error for debugging
      const timeoutDetails = queueStatus ? 
        `Queue status: ${queueStatus.queue.size}/${queueStatus.queue.maxSize} (${queueStatus.queue.utilization.toFixed(1)}% utilization)` :
        'Queue status unavailable';
        
      return reply.code(504).send({
        error: 'Gateway Timeout',
        message: `The upstream service timed out after ${dynamicTimeout}ms. ${timeoutDetails}`
      });
    }
    
    if (error.cause?.code === 'ECONNREFUSED'){
      logger.error(`[[Gateway]] Upstream request to ${upstreamUrl || ''} failed, ${error} : ${error.cause?.code}`);
      return reply.code(503).send({
        error: 'Service Unavailable',
        message: `The upstream service ${upstreamUrl || ''} is currently unavailable.`
      });
    }
    
    if (error.statusCode >= 400 && error.statusCode < 500){
      logger.error(`[[Gateway]] ${error}`);
      return reply.code(error.statusCode).send({
        error: 'Client Error',
        message: error.message
      });
    }
    
    logger.error(`Failed to fetch from ${upstreamUrl || 'upstream'}`);
    return reply.code(502).send({
      error: 'Bad Gateway',
      message: 'The server received an invalid response from an upstream service. Please try again later.'
    });
  }
}