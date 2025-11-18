import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import logger from "../utils/logger.js";
import type { User } from "../types/user.d.js";
import type { preHandlerHookHandler } from 'fastify';

const mustAuthHandler: preHandlerHookHandler = async (request: FastifyRequest , reply: FastifyReply) => {
  console.log(`⚡ mustAuth started...`)
  const user = request.user as User | undefined;

  if (!user || !user.authState) {
    return reply.code(401).send({ error: "Unauthorized", reason: "missing-user-context" });
  }

  switch (user.authState) {
    case "valid":
      if (user.role === "registered") return;
      return reply.code(401).send({ error: "Unauthorized", reason: "guest-not-allowed" });
    case "expired":
      return reply.code(401).send({ error: "Unauthorized", reason: "token-expired" });
    case "invalid":
      return reply.code(401).send({ error: "Unauthorized", reason: "token-invalid" });
    case "missing":
      return reply.code(401).send({ error: "Unauthorized", reason: "token-missing" });
    default:
      return reply.code(401).send({ error: "Unauthorized", reason: "auth-state-unknown" });
  }
};

const mustAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('mustAuth', mustAuthHandler);
};

export default fp(mustAuthPlugin, { name: 'must-auth-plugin' });
