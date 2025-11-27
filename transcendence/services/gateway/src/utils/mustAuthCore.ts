import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import logger from "./logger.js";
import type { User } from "../types/user.d.js";


export async function mustAuthCore(request: FastifyRequest, reply?: FastifyReply) {

	logger.info(`mustAuthCore started...`);

	const user = request.user as User | undefined;

	if (!user || !user.authState) {
		logger.info(`no user or no user authState`)
		return { ok: false, reason: "missing-user-context" };
	}

	logger.info(`check user authState`)
	switch (user.authState) {
	case "valid":
	  if (user.role === "registered") {
	    logger.info(`valid & registered`)
	    return { ok: true };
	  }
	  return { ok: false, reason: "guest-not-allowed" };

	case "expired":  return { ok: false, reason: "token-expired" };
	case "invalid":  return { ok: false, reason: "token-invalid" };
	case "missing":  return { ok: false, reason: "token-missing" };
	default:         return { ok: false, reason: "auth-state-unknown" };
	}

}