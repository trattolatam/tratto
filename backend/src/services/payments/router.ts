import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requireAuth, requireBusinessOwner } from '../../middleware/auth'
import { createCheckoutSession, createAdRechargeSession, cancelSubscription, handleStripeWebhook } from './stripe'
import { createDLPayment, createDLAdRechargePayment, handleDLWebhook } from './dlocalgo'

export async function paymentRoutes(app: FastifyInstance) {

  app.post('/checkout', { preHandler: requireBusinessOwner }, async (request, reply) => {
    const schema = z.object({ plan: z.enum(['PROFESSIONAL', 'PREMIUM']), provider: z.enum(['STRIPE', 'DLOCALGO']) })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos' })

    const user = await prisma.user.findUnique({ where: { id: request.user.userId }, include: { company: true } })
    if (!user?.company) return reply.status(404).send({ error: true, message: 'Sin empresa asociada' })

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001'
    const successUrl = `${baseUrl}/panel?plan_activado=1`
    const cancelUrl = `${baseUrl}/precios`

    let checkoutUrl: string
    if (body.data.provider === 'STRIPE') {
      checkoutUrl = await createCheckoutSession({ companyId: user.company.id, plan: body.data.plan, successUrl, cancelUrl, customerEmail: user.email })
    } else {
      checkoutUrl = await createDLPayment({ companyId: user.company.id, plan: body.data.plan, successUrl, failureUrl: cancelUrl, payerEmail: user.email, payerName: user.name })
    }

    return reply.send({ checkoutUrl, provider: body.data.provider })
  })

  app.post('/ads/recharge', { preHandler: requireAuth }, async (request, reply) => {
    const schema = z.object({ amountUsd: z.number().min(20).max(500), provider: z.enum(['STRIPE', 'DLOCALGO']) })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos' })

    const user = await prisma.user.findUnique({ where: { id: request.user.userId } })
    if (!user) return reply.status(404).send({ error: true, message: 'Usuario no encontrado' })

    let account = await prisma.adAccount.findFirst({ where: { userId: request.user.userId } })
    if (!account) return reply.status(404).send({ error: true, message: 'Sin cuenta de anunciante' })

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001'
    const successUrl = `${baseUrl}/ads?recharged=1`
    const failureUrl = `${baseUrl}/ads?error=1`

    let checkoutUrl: string
    if (body.data.provider === 'STRIPE') {
      checkoutUrl = await createAdRechargeSession({ adAccountId: account.id, amountUsd: body.data.amountUsd, successUrl, cancelUrl: failureUrl, customerEmail: user.email })
    } else {
      checkoutUrl = await createDLAdRechargePayment({ adAccountId: account.id, amountUsd: body.data.amountUsd, successUrl, failureUrl, payerEmail: user.email, payerName: user.name })
    }

    return reply.send({ checkoutUrl, provider: body.data.provider, amountUsd: body.data.amountUsd })
  })

  app.post('/cancel', { preHandler: requireBusinessOwner }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId }, include: { company: true } })
    if (!user?.company) return reply.status(404).send({ error: true, message: 'Sin empresa' })

    const sub = await prisma.subscription.findUnique({ where: { companyId: user.company.id } })
    if (!sub) return reply.status(404).send({ error: true, message: 'Sin suscripción activa' })

    if (sub.provider === 'STRIPE') {
      await cancelSubscription(user.company.id)
    } else {
      await prisma.subscription.update({ where: { companyId: user.company.id }, data: { cancelAtPeriodEnd: true } })
    }

    return reply.send({ message: `Tu plan seguirá activo hasta el ${sub.currentPeriodEnd.toLocaleDateString('es-AR')} y luego se cancelará.` })
  })

  app.get('/subscription', { preHandler: requireBusinessOwner }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId }, include: { company: true } })
    if (!user?.company) return reply.status(404).send({ error: true, message: 'Sin empresa' })
    const sub = await prisma.subscription.findUnique({ where: { companyId: user.company.id } })
    return reply.send({ subscription: sub, company: { plan: user.company.plan, isVerified: user.company.isVerified } })
  })
}

export async function webhookPaymentRoutes(app: FastifyInstance) {
  app.post('/stripe', { config: { rawBody: true } }, async (request, reply) => {
    const signature = request.headers['stripe-signature'] as string
    if (!signature) return reply.status(400).send({ error: true, message: 'Sin firma Stripe' })

    try {
      const rawBody = (request as any).rawBody || Buffer.from(JSON.stringify(request.body))
      await handleStripeWebhook(rawBody, signature)
      return reply.send({ received: true })
    } catch (err: any) {
      app.log.error(`Stripe webhook error: ${err.message}`)
      return reply.status(400).send({ error: true, message: err.message })
    }
  })

  app.post('/dlocalgo', async (request, reply) => {
    try {
      await handleDLWebhook(request.body)
      return reply.send({ received: true })
    } catch (err: any) {
      app.log.error(`dLocal Go webhook error: ${err.message}`)
      return reply.status(400).send({ error: true, message: err.message })
    }
  })
}
