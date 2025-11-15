import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import logger from "../utils/logger.js";
import type { User } from "../types/user.d.js";

const mustAuthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    "mustAuth",
    async function (request: FastifyRequest & { user?: User }, reply: FastifyReply) {
      const user = request.user;

      if (!user) {
        return reply.code(401).send({ error: "Unauthorized", reason: "missing-user-context" });
      }

      logger.info(`🔐 mustAuth → role=${user.role}, authState=${user.authState}, isGuest=${user.isGuest}`);

      switch (user.authState) {
        case "valid":
          if (user.role === "registered")
            return;
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
    }
  );
};

export default fp(mustAuthPlugin, { name: "must-auth-plugin" });
