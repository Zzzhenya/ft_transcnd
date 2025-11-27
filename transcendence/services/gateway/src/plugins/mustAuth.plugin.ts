import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import logger from "../utils/logger.js";
import type { User } from "../types/user.d.js";
import type { preHandlerHookHandler } from 'fastify';
import { mustAuthCore } from '../utils/mustAuthCore.js';

const mustAuthHandler: preHandlerHookHandler = async (request: FastifyRequest , reply: FastifyReply) => {
  logger.info(`mustAuth started...`)

  const result = await mustAuthCore(request, reply);

    if (!result.ok) {
      logger.info(`mustAuth: Unauthorized`);
      return reply.code(401).send({ error: "Unauthorized", reason: result.reason });
    }
    else {
      logger.info(`mustAuth: Authorized`);
      // silently proceed when authorized
    }
};

const mustAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('mustAuth', mustAuthHandler);
};

export default fp(mustAuthPlugin, { name: 'must-auth-plugin' });
