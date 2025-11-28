import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import gatewayError from './gatewayError.js'; // adjust path
import logger from './logger.js';
import type { User } from '../types/user.d.js';

const PROXY_REQUEST_TIMEOUT = parseInt(process.env.PROXY_REQUEST_TIMEOUT || '5000');
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';


export async function proxyRequest(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  upstreamUrl: string,
  method: string = 'GET'
) {
  try {
    logger.info(`Gateway received ${method} request for ${upstreamUrl}`)
    fastify.log.info(`Gateway received ${method} request for ${upstreamUrl}`);

    console.log('🔍 PROXY DEBUG - Authorization header:', request.headers['authorization']);
    console.log('🔍 PROXY DEBUG - Authorization length:', request.headers['authorization']?.length || 0);
    console.log('🔍 PROXY DEBUG - All headers:', JSON.stringify(request.headers, null, 2));

    // Extract token - try multiple sources
    let extractedToken: string | null = null;

    // 1. Try to get from request.user.jwt (set by tokenVerification plugin)
    const user = request.user as User | undefined;
    if (user && typeof user === 'object' && 'jwt' in user && user.jwt) {
      extractedToken = user.jwt;
      console.log('✅ Token extracted from request.user.jwt');
    }

    // 2. If not found, try cookie
    if (!extractedToken && request.cookies?.token) {
      extractedToken = request.cookies.token;
      console.log('✅ Token extracted from cookie');
    }

    // 3. If still not found, try Authorization header
    if (!extractedToken && request.headers['authorization']) {
      const authHeader = request.headers['authorization'];
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        extractedToken = authHeader.substring(7);
        console.log('✅ Token extracted from Authorization header');
      }
    }

    // Debug logging
    if (!extractedToken) {
      console.log('❌ NO TOKEN FOUND!');
      console.log('  - request.user:', request.user);
      console.log('  - cookies:', request.cookies);
      console.log('  - authorization header:', request.headers['authorization']);
    }

    const response = await request.customFetch(
      upstreamUrl,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(extractedToken ? { 'x-token': extractedToken } : {}),
        },
        body: ['POST', 'PUT', 'PATCH'].includes(method)
          ? JSON.stringify(request.body)
          : null,
      },
      PROXY_REQUEST_TIMEOUT
    );

    if (!response.ok) {
      fastify.log.warn(`Upstream returned non-OK response`);
      logger.warn(`Upstream returned non-OK response`);
      // If the response was not successful, try to read the response body text
      // If that fails for any reason, set bodyText to an empty string instead of throwing an error
      const bodyText = await response.text().catch(() => '');

      // If it's a client error (4xx), forward original response body and status to the frontend
      if (response.status >= 400 && response.status < 500) {
        logger.warn(`${upstreamUrl || ''} error : ${response.status} :  ${bodyText}`);
        // Try to parse JSON; if not possible, wrap in an error field
        let parsedBody: any = { error: bodyText };
        try {
          parsedBody = JSON.parse(bodyText || '{}');
        } catch (e) {
          // keep parsedBody as { error: bodyText }
        }
        return reply.status(response.status).send(parsedBody);
      } else if (response.status >= 500) {
        // all 5xx errors from upstream -> redirect to 502 Bad gateway - frontend doesn't need to know specifics
        logger.warn(`${upstreamUrl || ''} error : ${response.status} :  ${bodyText}`);
        throw fastify.httpErrors.createError(502, `Upstream ${upstreamUrl || ''} service error`);
      }
    }

    const data = await response.json();
    reply.status(response.status)
    const token = data.token;
    // if the body has token issued, set is as a cookie
    if (token) {
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: true,  // Only HTTPS in production
        sameSite: 'lax',
        path: '/',
      });
      // remove token from the body
      delete data.token;
    }
    return reply.send(data);

  } catch (error: any) {
    fastify.log.error(error);
    logger.error(`${method} request for ${upstreamUrl} failed`, error);
    if (error instanceof Error && error.name === 'AbortError') {
      // upstream service timed out -> 504
      fastify.log.error('Upstream request timed out');
      logger.error(`Upstream request to ${upstreamUrl || ''} timed out`);
      throw fastify.httpErrors.gatewayTimeout(`${upstreamUrl || 'Upstream'} 'The upstream service timed out. Please try again later.'`);
    }
    if (error.cause?.code === 'ECONNREFUSED') {
      // fetch() failed : network error -> 503 Service unavailable
      logger.error(`Upstream request to ${upstreamUrl || ''} failed, ${error} : ${error.cause?.code}`);
      throw fastify.httpErrors.serviceUnavailable(`The upstream service ${upstreamUrl || ''} is currently unavailable.`)
    }
    if (error.statusCode >= 400 && error.statusCode < 500) {
      // 4xx
      logger.error(`${error}`);
      throw error;
    }
    // fallback case -> 502 Bad gateway
    logger.error(`Failed to fetch from ${upstreamUrl || 'upstream'}`)
    throw fastify.httpErrors.badGateway('The server received an invalid response from an upstream service. Please try again later.')
  }
}