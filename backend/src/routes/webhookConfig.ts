import { FastifyInstance } from 'fastify'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireBusinessOwner, requirePlan, requireCompanyRank, JwtPayload } from '../middleware/auth'

const VALID_EVENTS = ['review.created', 'lead.created'] as const

export default async function webhookConfigRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireBusinessOwner)
  app.addHook('preHandler', requirePlan('ENTERPRISE'))

  // ─── Listar mis webhooks (sin exponer el secret completo) ──────────────────
  app.get('/', async (request, reply) => {
    const { companyId } = request.user as JwtPayload
    if (!companyId) return reply.status(400).send({ error: true, message: 'Sin empresa asociada' })

    const webhooks = await prisma.webhook.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } })
    return reply.send({
      webhooks: webhooks.map((w: typeof webhooks[number]) => ({ id: w.id, url: w.url, events: w.events, isActive: w.isActive, createdAt: w.createdAt })),
    })
  })

  // ─── Crear un webhook nuevo ──────────────────────────────────────────────────
  app.post('/', { preHandler: requireCompanyRank('ADMIN') }, async (request, reply) => {
    const { companyId } = request.user as JwtPayload
    if (!companyId) return reply.status(400).send({ error: true, message: 'Sin empresa asociada' })

    const body = z.object({
      url: z.string().url(),
      events: z.array(z.enum(VALID_EVENTS)).min(1),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos', details: body.error.issues })

    const secret = crypto.randomBytes(24).toString('hex')
    const webhook = await prisma.webhook.create({ data: { companyId, url: body.data.url, events: body.data.events, secret } })

    // El secret se devuelve UNA SOLA VEZ, igual que la API key — se usa para
    // verificar la firma X-Tratto-Signature en cada pedido que le llega.
    return reply.send({
      webhook: { id: webhook.id, url: webhook.url, events: webhook.events, isActive: webhook.isActive },
      secret,
      warning: 'Guardá este secret ahora — no lo vamos a mostrar de nuevo. Lo necesitás para verificar la firma de cada webhook que te llegue.',
    })
  })

  // ─── Activar/desactivar un webhook ───────────────────────────────────────────
  app.patch('/:id', { preHandler: requireCompanyRank('ADMIN') }, async (request, reply) => {
    const { companyId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const body = z.object({ isActive: z.boolean() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos' })

    const existing = await prisma.webhook.findFirst({ where: { id, companyId } })
    if (!existing) return reply.status(404).send({ error: true, message: 'No encontrado' })

    const webhook = await prisma.webhook.update({ where: { id }, data: { isActive: body.data.isActive } })
    return reply.send({ webhook: { id: webhook.id, url: webhook.url, events: webhook.events, isActive: webhook.isActive } })
  })

  // ─── Borrar un webhook ────────────────────────────────────────────────────────
  app.delete('/:id', { preHandler: requireCompanyRank('ADMIN') }, async (request, reply) => {
    const { companyId } = request.user as JwtPayload
    const { id } = request.params as { id: string }

    const existing = await prisma.webhook.findFirst({ where: { id, companyId } })
    if (!existing) return reply.status(404).send({ error: true, message: 'No encontrado' })

    await prisma.webhook.delete({ where: { id } })
    return reply.send({ ok: true })
  })
}
