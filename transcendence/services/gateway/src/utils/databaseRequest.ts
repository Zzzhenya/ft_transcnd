import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import gatewayError from './gatewayError.js'; // adjust path
import logger from './logger.js';

const PROXY_REQUEST_TIMEOUT = parseInt(process.env.PROXY_REQUEST_TIMEOUT || '5000');
const DB_SERVICE_TOKEN = process.env.DB_SERVICE_TOKEN || 'super_secret_internal_token';

        //   request body:: 
    	//	{
    	//	 table: 'Users',
        //   action: 'insert',
        //   values: {
        //     username: userData.username,
        //     email: userData.email,
        //     password_hash: userData.password_hash || userData.password,
        //     is_guest: userData.is_guest ? 1 : 0
        //   } }

export async function databaseRequest(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  upstreamUrl: string,
  method: string = 'GET'
) {
  try {
    logger.info(`Gateway initiated ${method} request for ${upstreamUrl}`)
    fastify.log.info(`Gateway initiated ${method} request for ${upstreamUrl}`);

    const response = await request.customFetch(
      upstreamUrl,
      {
        method,
        headers: {
          'Authorization': request.headers['authorization'] || '',
          'Content-Type': 'application/json',
          'x-service-auth': DB_SERVICE_TOKEN
        },
        body: ['POST', 'PUT', 'PATCH'].includes(method)
          ? JSON.stringify(request.body)
          : null,
          // ? JSON.stringify(request.body)
          // : null,
      },
      PROXY_REQUEST_TIMEOUT
    );

    if (!response.ok) {
      fastify.log.warn(`[[Gateway]] Upstream returned non-OK response`);
      logger.warn(`[[Gateway]] Upstream returned non-OK response`);
      // If the response was not successful, try to read the response body text
      // If that fails for any reason, set body to an empty string instead of throwing an error
      const body = await response.text().catch(() => '');

      if (response.status >= 400 && response.status < 500) {
        // all 4xx errors are forwarded to frontend with details - probably an issue with client call
        logger.warn(`[[Gateway]] ${upstreamUrl || ''} error : ${response.status} :  ${body}`);
        throw fastify.httpErrors.createError(response.status, `Upstream ${upstreamUrl || ''} error: ${body}`);
      } else if (response.status >= 500) {
        // all 5xx errors from upstream -> redirect to 502 Bad gateway - frontend doesn't need to know what is wrong
        logger.warn(`[[Gateway]] ${upstreamUrl || ''} error : ${response.status} :  ${body}`);
        throw fastify.httpErrors.createError(502, `Upstream ${upstreamUrl || ''} service error`);
      }
    }

    const data = await response.json();
    // return reply.status(response.status).send(data);
    // reply.status(response.status);
    return response;

  } catch (error: any) {
    fastify.log.error(error);
    logger.error(`[[Gateway]] ${method} request for ${upstreamUrl} failed`, error);
    if (error instanceof Error && error.name === 'AbortError') {
      // upstream service timed out -> 504
      fastify.log.error('[[Gateway]] Upstream request timed out');
      logger.error(`[[Gateway]] Upstream request to ${upstreamUrl || ''} timed out`);
      return fastify.httpErrors.gatewayTimeout(`${upstreamUrl  || 'Upstream'} 'The upstream service timed out. Please try again later.'`);
    }
    if (error.cause?.code === 'ECONNREFUSED'){
      // fetch() failed : network error -> 503 Service unavailable
      logger.error(`[[Gateway]] Upstream request to ${upstreamUrl || ''} failed, ${error} : ${error.cause?.code}`);
      return fastify.httpErrors.serviceUnavailable(`The upstream service ${upstreamUrl || ''} is currently unavailable.`)
    }
    if (error.statusCode >= 400 && error.statusCode < 500){
      // 4xx
      logger.error(`[[Gateway]] ${error}`);
      return error;
    }
    // fallback case -> 502 Bad gateway
    logger.error(`Failed to fetch from ${upstreamUrl || 'upstream'}`)
    return fastify.httpErrors.badGateway('The server received an invalid response from an upstream service. Please try again later.')
  }
}
