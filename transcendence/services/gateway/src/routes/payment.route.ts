import type { FastifyInstance } from 'fastify' 
export default async function paymentRoute(fastify: FastifyInstance) {

	fastify.post<{ Params: { username: string } }>(
		'/payment/coffee/:username',
		async (request, reply) => {
			const { username } = request.params

			if (!process.env.SUMUP_API_KEY || !process.env.SUMUP_MERCHANT_CODE) {
				return reply.code(503).send({ error: 'Payment not configured' })
			}

			try {
				const response = await fetch('https://api.sumup.com/v0.1/checkouts', {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${process.env.SUMUP_API_KEY}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						checkout_reference: `coffee-${username}-${Date.now()}`,
						amount: 3.00,
						currency: 'EUR',
						merchant_code: process.env.SUMUP_MERCHANT_CODE,
						description: `☕ Buy ${username} a coffee — Transcendence Pong`,
						redirect_url: `${process.env.FRONT_END_URL}/profile`,
						hosted_checkout: { enabled: true }
					})
				})

				if (!response.ok) {
					const err = await response.json()
					fastify.log.error(`[SumUp] API error: ${JSON.stringify(err)}`)
					return reply.code(502).send({ error: 'Payment provider unavailable' })
				}

				const checkout = await response.json()
				const paymentUrl = checkout.hosted_checkout_url

				return { checkoutId: checkout.id, paymentUrl }

			} catch (err: unknown) {
				fastify.log.error(`[SumUp] Error: ${String(err)}`)
				return reply.code(500).send({ error: 'Failed to create payment' })
			}
		}
	)
}