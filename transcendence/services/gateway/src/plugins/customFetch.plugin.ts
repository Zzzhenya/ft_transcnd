// import fp from 'fastify-plugin'
// import type { FastifyPluginAsync } from 'fastify'

// // async function customFetch(
// //   url: string,
// //   options: RequestInit = {},
// //   timeoutMs = 5000
// // ): Promise<Response> {
// //   const controller = new AbortController()
// //   const timeout = setTimeout(() => controller.abort(), timeoutMs)

// //   try {
// //     return await fetch(url, { ...options, signal: controller.signal })
// //   } finally {
// //     clearTimeout(timeout)
// //   }
// // }

// const fetchPlugin: FastifyPluginAsync = fp(async (fastify) => {
//   // fastify.decorateRequest('customFetch', null)

//   // fastify.addHook('onRequest', async (req) => {
//   //   req.customFetch = customFetch
//   // })
//   fastify.decorateRequest('customFetch', async function (url: string, options?: RequestInit, timeoutMs?: number) {
//     // Your fetch logic
//     const controller = new AbortController();
//     const timeout = timeoutMs ?? 5000;
//     const timer = setTimeout(() => controller.abort(), timeout);

//     try {
//       const res = await fetch(url, { ...options, signal: controller.signal });
//       return res;
//     } finally {
//       clearTimeout(timer);
//     }
//   });
// })

// // declare module 'fastify' {
// //   interface FastifyRequest {
// //     customFetch: typeof customFetch
// //   }
// // }

// export default fetchPlugin

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
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  });
}

// Wrap with fastify-plugin to allow proper registration
export default fp(fetchPlugin);

