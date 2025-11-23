import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import logger from "../utils/logger.js";
import type { User } from "../types/user.d.js";
import type { preHandlerHookHandler } from 'fastify';

const mustAuthHandler: preHandlerHookHandler = async (request: FastifyRequest , reply: FastifyReply) => {
  logger.info(`mustAuth started...`)
  const user = request.user as User | undefined;

  if (!user || !user.authState) {
    logger.info(`no user or no user authState`)
    return reply.code(401).send({ error: "Unauthorized", reason: "missing-user-context" });
  }

  logger.info(`check user authState`)
  switch (user.authState) {
    case "valid":
      logger.info(`valid user`)
      if (user.role === "registered") {
        logger.info(`valid user && registered`)
        return;
      }
      logger.info(`valid user && NOT registered`)
      return reply.code(401).send({ error: "Unauthorized", reason: "guest-not-allowed" });
    case "expired":
      logger.info(`expired token`)
      return reply.code(401).send({ error: "Unauthorized", reason: "token-expired" });
    case "invalid":
      logger.info(`invalid token`)
      return reply.code(401).send({ error: "Unauthorized", reason: "token-invalid" });
    case "missing":
      logger.info(`missing token`)
      return reply.code(401).send({ error: "Unauthorized", reason: "token-missing" });
    default:
      logger.info(`exceptional case`)
      return reply.code(401).send({ error: "Unauthorized", reason: "auth-state-unknown" });
  }
};

const mustAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('mustAuth', mustAuthHandler);
};

export default fp(mustAuthPlugin, { name: 'must-auth-plugin' });
