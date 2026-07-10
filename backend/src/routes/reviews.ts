import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../index'
import { requireAuth, requireBusinessOwner, requireAdmin } from '../middleware/auth'
import { createReviewRateLimit } from '../middleware/rateLimits'
import { recalcCompanyRating } from '../services/rating'
import { checkAndAwardMedals } from '../services/medals'
import { sendNotification } from '../services/notifications'

export default async function reviewRoutes(app: FastifyInstance) {

  app.get('/', async (request, reply) => {
    const query = z.object({
      companyId: z.string().uuid(),
      page: z.string().default('1'),
      limit: z.string().default('10'),
      verified: z.string().optional(),
      rating: z.string().optional(),
    }).parse(request.query)

    const page = parseInt(query.page)
    const limit = parseInt(query.limit)
    const where: any = { companyId: query.companyId, status: 'APPROVED' }
    if (query.verified === 'true') where.isVerified = true
    if (query.rating) where.rating = parseInt(query.rating)

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ isVerified: 'desc' }, { helpfulCount: 'desc' }, { createdAt: 'desc' }],
        include: { user: { select: { name: true, avatarUrl: true, country: true } }, response: true },
      }),
      prisma.review.count({ where }),
    ])

    return reply.send({ reviews, pagination: { page, limit, total } })
  })

  // ─── POST /api/reviews — con rate limit (máx 3 cada 10 min) ───────────────
  app.post('/', { preHandler: requireAuth, config: { rateLimit: createReviewRateLimit } }, async (request, reply) => {
    const schema = z.object({
      companyId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      title: z.string().max(100).optional(),
      body: z.string().min(20).max(2000),
      proofUrl: z.string().url().optional(),
      proofType: z.string().optional(),
    })

    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos', details: body.error.issues })

    const company = await prisma.company.findUnique({ where: { id: body.data.companyId } })
    if (!company) return reply.status(404).send({ error: true, message: 'Empresa no encontrada' })
    if (company.claimedById === request.user.userId) return reply.status(403).send({ error: true, message: 'No podés reseñar tu propia empresa' })

    const existing = await prisma.review.findFirst({ where: { companyId: body.data.companyId, userId: request.user.userId } })
    if (existing) return reply.status(409).send({ error: true, message: 'Ya dejaste una reseña para esta empresa' })

    const isVerified = !!body.data.proofUrl

    const review = await prisma.review.create({
      data: { ...body.data, userId: request.user.userId, isVerified, verifiedAt: isVerified ? new Date() : null, status: 'PENDING' },
      include: { user: { select: { name: true, avatarUrl: true } }, company: { select: { name: true, claimedById: true } } },
    })

    if (review.company.claimedById) {
      const owner = await prisma.user.findUnique({ where: { id: review.company.claimedById } })
      if (owner) {
        await sendNotification({
          userId: owner.id, type: 'NEW_REVIEW',
          title: `Nueva reseña en ${review.company.name}`,
          body: `${review.user.name} dejó ${review.rating} estrellas${isVerified ? ' ✓ verificada' : ''}`,
          data: { reviewId: review.id, companyId: body.data.companyId, rating: body.data.rating },
        })
      }
    }

    return reply.status(201).send({
      review,
      message: isVerified
        ? 'Reseña enviada con comprobante. Será publicada en menos de 24hs tras verificación.'
        : 'Reseña enviada. Será publicada tras moderación.',
    })
  })

  app.post('/:id/response', { preHandler: requireBusinessOwner }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({ body: z.string().min(10).max(1000) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Respuesta muy corta o muy larga' })

    const review = await prisma.review.findUnique({ where: { id }, include: { company: true, response: true } })
    if (!review) return reply.status(404).send({ error: true, message: 'Reseña no encontrada' })
    if (review.company.claimedById !== request.user.userId) return reply.status(403).send({ error: true, message: 'Solo el dueño puede responder' })
    if (review.response) return reply.status(409).send({ error: true, message: 'Ya respondiste esta reseña' })

    const response = await prisma.reviewResponse.create({ data: { reviewId: id, body: body.data.body } })
    return reply.status(201).send({ response })
  })

  app.post('/:id/helpful', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await prisma.reviewHelpful.findUnique({ where: { userId_reviewId: { userId: request.user.userId, reviewId: id } } })

    if (existing) {
      await prisma.reviewHelpful.delete({ where: { userId_reviewId: { userId: request.user.userId, reviewId: id } } })
      await prisma.review.update({ where: { id }, data: { helpfulCount: { decrement: 1 } } })
      return reply.send({ helpful: false })
    }

    await prisma.reviewHelpful.create({ data: { userId: request.user.userId, reviewId: id } })
    await prisma.review.update({ where: { id }, data: { helpfulCount: { increment: 1 } } })
    return reply.send({ helpful: true })
  })

  app.patch('/:id/moderate', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({ status: z.enum(['APPROVED', 'REJECTED']), note: z.string().optional() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos' })

    const review = await prisma.review.update({
      where: { id },
      data: { status: body.data.status, moderatedById: request.user.userId, moderatedAt: new Date(), moderationNote: body.data.note },
      include: { company: true },
    })

    if (body.data.status === 'APPROVED') {
      await recalcCompanyRating(review.companyId)
      await checkAndAwardMedals(review.companyId)
    }

    return reply.send({ review, message: `Reseña ${body.data.status === 'APPROVED' ? 'aprobada' : 'rechazada'}` })
  })

  app.post('/:id/report', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({ reason: z.string().min(10) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Indicá el motivo del reporte' })

    await prisma.review.update({ where: { id }, data: { status: 'REPORTED' } })
    return reply.send({ message: 'Reporte enviado. Lo revisaremos en las próximas 24hs.' })
  })
}
