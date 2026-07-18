import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../index'
import { requireAuth, requireBusinessOwner, requireAdmin } from '../middleware/auth'
import { leadRateLimit } from '../middleware/rateLimits'

export async function subscriptionRoutes(app: FastifyInstance) {
  app.get('/my', { preHandler: requireBusinessOwner }, async (request, reply) => {
    const company = await prisma.company.findFirst({ where: { claimedById: request.user.userId } })
    if (!company) return reply.status(404).send({ error: true, message: 'Sin empresa asociada' })
    const sub = await prisma.subscription.findUnique({ where: { companyId: company.id } })
    return reply.send({ subscription: sub })
  })

  app.post('/cancel', { preHandler: requireBusinessOwner }, async (request, reply) => {
    const company = await prisma.company.findFirst({ where: { claimedById: request.user.userId } })
    if (!company) return reply.status(404).send({ error: true, message: 'Sin empresa' })
    const sub = await prisma.subscription.findUnique({ where: { companyId: company.id } })
    if (!sub) return reply.status(404).send({ error: true, message: 'Sin suscripción activa' })
    await prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true } })
    return reply.send({ message: `Plan activo hasta ${sub.currentPeriodEnd.toLocaleDateString()}` })
  })
}

export async function leadRoutes(app: FastifyInstance) {
  // ─── Con rate limit — máximo 5 cada 30 minutos ─────────────────────────────
  app.post('/', { config: { rateLimit: leadRateLimit } }, async (request, reply) => {
    const body = z.object({
      companyId: z.string().uuid(), name: z.string().min(2),
      email: z.union([z.string().email(), z.literal('')]).optional(), phone: z.string().optional(), message: z.string().min(10),
    }).refine((data) => !!(data.email || data.phone), { message: 'Dejá al menos un email o teléfono para que la empresa pueda contactarte' }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: body.error.issues[0]?.message || 'Datos inválidos' })
    if (body.data.email === '') body.data.email = undefined

    const company = await prisma.company.findUnique({ where: { id: body.data.companyId }, include: { owner: { select: { id: true } } } })
    if (!company) return reply.status(404).send({ error: true, message: 'Empresa no encontrada' })
    if (!company.claimedById) return reply.status(400).send({ error: true, message: 'Esta empresa aún no reclamó su perfil' })
    if (company.plan === 'FREE') {
      return reply.status(403).send({ error: true, message: 'Esta empresa no tiene el plan necesario para recibir consultas', upgradeRequired: true })
    }

    const lead = await prisma.lead.create({ data: { ...body.data, source: 'profile' } })

    const { sendNotification } = await import('../services/notifications')
    if (company.owner) {
      await sendNotification({
        userId: company.owner.id, type: 'LEAD_RECEIVED', title: `Nueva consulta en ${company.name}`,
        body: `${body.data.name} quiere contactarte: "${body.data.message.substring(0, 80)}..."`, data: { leadId: lead.id, companyId: body.data.companyId },
      })
    }

    return reply.status(201).send({ message: 'Consulta enviada. La empresa te contactará pronto.' })
  })

  app.get('/my', { preHandler: requireBusinessOwner }, async (request, reply) => {
    const company = await prisma.company.findFirst({ where: { claimedById: request.user.userId } })
    if (!company) return reply.status(404).send({ error: true, message: 'Sin empresa' })
    const leads = await prisma.lead.findMany({ where: { companyId: company.id }, orderBy: { createdAt: 'desc' }, take: 50 })
    return reply.send({ leads })
  })
}

export async function medalRoutes(app: FastifyInstance) {
  app.get('/:companyId', async (request, reply) => {
    const { companyId } = request.params as { companyId: string }
    const now = new Date()
    const medals = await prisma.medal.findMany({ where: { companyId, visible: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, orderBy: { awardedAt: 'desc' } })
    return reply.send({ medals })
  })

  app.post('/run-weekly', { preHandler: requireAdmin }, async (_request, reply) => {
    const { runWeeklyTopCategoryMedals } = await import('../services/medals')
    await runWeeklyTopCategoryMedals()
    return reply.send({ message: 'Job de medallas ejecutado correctamente' })
  })
}

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const notifications = await prisma.notification.findMany({ where: { userId: request.user.userId }, orderBy: { createdAt: 'desc' }, take: 30 })
    return reply.send({ notifications })
  })

  app.patch('/read-all', { preHandler: requireAuth }, async (request, reply) => {
    await prisma.notification.updateMany({ where: { userId: request.user.userId, isRead: false }, data: { isRead: true } })
    return reply.send({ message: 'Todas marcadas como leídas' })
  })
}
