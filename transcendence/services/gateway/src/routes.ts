import type { FastifyHttpOptions, FastifyInstance, FastifyServerOptions } from "fastify"

async function routes (fastify: FastifyInstance, options: FastifyServerOptions) {

    fastify.get('/', async (request , reply) => {
        reply.code(200).header('Content-Type', 'application/json; charset=utf-8')
    return { hello: 'Hello from API Gateway!' }
  })

    fastify.get('/users', async (request , reply) => {
        try
        {
            fastify.log.error("Gateway received GET request for /users")
            const response = await fetch('http://user-service:3001', {
            method: 'GET',
            headers: {
            'Authorization': request.headers['authorization'] || '',
        }})
        const data = await response.json();
        reply.status(response.status).send(data);
        }
        catch (error) {
		    fastify.log.error(error)
		    reply.status(404);
	}
    // reply.code(200).header('Content-Type', 'application/json; charset=utf-8')
    // return { hello: 'Users' }
  })
}

export default routes;