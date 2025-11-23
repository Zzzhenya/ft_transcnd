
import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'

// Extend FastifyRequest to include customFetch
declare module 'fastify' {
  interface FastifyRequest {
    customFetch(url: string, options?: RequestInit, timeoutMs?: number): Promise<Response>
  }
}

// Create the plugin
const fetchPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('customFetch', async function (url: string, options?: RequestInit, timeoutMs?: number) {
    const controller = new AbortController();
    const timeout = timeoutMs ?? 5000;
    const method = options?.method || 'GET';
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } catch (err) {
        // Optional: additional logging for network errors
        if (err instanceof Error && err.name !== 'AbortError') {
          fastify.log.error(
            `Fetch failed for ${method} ${url}: ${err.message}`
          );
        }
        throw err;
    } finally {
      clearTimeout(timer);
    }
  });
}

// Wrap with fastify-plugin to allow proper registration
export default fp(fetchPlugin);

