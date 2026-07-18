import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../index'
import { requireAdmin } from '../middleware/auth'

export default async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)

  app.get('/dashboard', async (_request, reply) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [totalCompanies, newCompaniesMonth, totalUsers, newUsersMonth, pendingReviews, reportedReviews, pendingAds, activeSubscriptions, totalReviews, verifiedReviews] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.review.count({ where: { status: 'PENDING' } }),
      prisma.review.count({ where: { status: 'REPORTED' } }),
      prisma.ad.count({ where: { status: 'PENDING' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.review.count({ where: { status: 'APPROVED' } }),
      prisma.review.count({ where: { status: 'APPROVED', isVerified: true } }),
    ])

    const subscriptions = await prisma.subscription.findMany({ where: { status: 'ACTIVE' }, select: { amountUsd: true } })
    const mrr = subscriptions.reduce((sum, s) => sum + s.amountUsd, 0)

    const recentActivity = await prisma.review.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: 'desc' }, take: 10,
      include: { company: { select: { name: true, id: true } }, user: { select: { name: true } } },
    })

    return reply.send({
      stats: {
        totalCompanies, newCompaniesMonth, totalUsers, newUsersMonth, pendingReviews, reportedReviews, pendingAds, activeSubscriptions,
        totalReviews, verifiedReviews, verifiedPct: totalReviews > 0 ? Math.round((verifiedReviews / totalReviews) * 100) : 0, mrr: Math.round(mrr),
      },
      recentActivity,
    })
  })

  app.get('/reviews', async (request, reply) => {
    const query = z.object({
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REPORTED']).default('PENDING'),
      page: z.string().default('1'), limit: z.string().default('20'),
    }).parse(request.query)

    const page = parseInt(query.page), limit = parseInt(query.limit)
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { status: query.status }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: { company: { select: { id: true, name: true, city: true, country: true } }, user: { select: { id: true, name: true, email: true } }, response: true },
      }),
      prisma.review.count({ where: { status: query.status } }),
    ])

    return reply.send({ reviews, pagination: { page, limit, total } })
  })

  app.get('/companies', async (request, reply) => {
    const query = z.object({
      plan: z.enum(['FREE', 'PROFESSIONAL', 'PREMIUM', 'ENTERPRISE']).optional(),
      verified: z.string().optional(), country: z.string().optional(), search: z.string().optional(), page: z.string().default('1'),
    }).parse(request.query)

    const page = parseInt(query.page), limit = 25
    const where: any = {}
    if (query.plan) where.plan = query.plan
    if (query.verified === 'true') where.isVerified = true
    if (query.verified === 'false') where.isVerified = false
    if (query.country) where.country = query.country
    if (query.search) where.OR = [{ name: { contains: query.search, mode: 'insensitive' } }, { taxId: { contains: query.search } }]

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: { category: { select: { name: true, emoji: true } }, owner: { select: { name: true, email: true } }, _count: { select: { reviews: true } } },
      }),
      prisma.company.count({ where }),
    ])

    return reply.send({ companies, pagination: { page, limit, total } })
  })

  app.patch('/companies/:id/verify', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({ verified: z.boolean() }).parse(request.body)
    const company = await prisma.company.update({
      where: { id },
      data: { isVerified: body.verified, verifiedAt: body.verified ? new Date() : null, plan: body.verified ? 'PROFESSIONAL' : undefined },
    })
    return reply.send({ company, message: body.verified ? 'Empresa verificada' : 'Verificación removida' })
  })

  app.patch('/companies/:id/suspend', async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.review.updateMany({ where: { companyId: id, status: 'APPROVED' }, data: { status: 'REJECTED' } })
    const company = await prisma.company.update({ where: { id }, data: { isVerified: false, plan: 'FREE' } })
    return reply.send({ company, message: 'Empresa suspendida' })
  })

  // ─── Denuncias de reclamo falso ────────────────────────────────────────
  app.get('/claim-disputes', async (request, reply) => {
    const query = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional() }).parse(request.query)
    const disputes = await prisma.claimDispute.findMany({
      where: query.status ? { status: query.status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, slug: true, taxId: true, taxIdType: true, verificationDocUrl: true, personalIdNumber: true, phone: true, email: true, owner: { select: { id: true, name: true, email: true } } } },
        disputedBy: { select: { id: true, name: true, email: true } },
      },
    })
    return reply.send({ disputes })
  })

  app.post('/claim-disputes/:id/resolve', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({ action: z.enum(['approve', 'reject']), note: z.string().optional() }).parse(request.body)

    const dispute = await prisma.claimDispute.findUnique({ where: { id } })
    if (!dispute) return reply.status(404).send({ error: true, message: 'Denuncia no encontrada' })
    if (dispute.status !== 'PENDING') return reply.status(400).send({ error: true, message: 'Esta denuncia ya fue resuelta' })

    if (body.action === 'approve') {
      // Se revoca el reclamo actual — el perfil vuelve a quedar libre para que
      // el reclamante real lo reclame por el proceso normal de verificación.
      await prisma.company.update({
        where: { id: dispute.companyId },
        data: {
          claimedById: null, claimedAt: null, isVerified: false, verifiedAt: null, plan: 'FREE',
          taxId: null, taxIdType: null, taxIdChecksumValid: null, personalIdNumber: null,
          verificationDocUrl: null, verificationDocType: null,
        },
      })
    }

    const updated = await prisma.claimDispute.update({
      where: { id },
      data: { status: body.action === 'approve' ? 'APPROVED' : 'REJECTED', resolvedById: request.user.userId, resolvedAt: new Date(), resolutionNote: body.note },
    })

    return reply.send({ dispute: updated })
  })

  app.get('/revenue', async (_request, reply) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [subscriptionsByPlan, adsRevenue, leadsRevenue, boostsRevenue] = await Promise.all([
      prisma.subscription.groupBy({ by: ['plan'], where: { status: 'ACTIVE' }, _count: true, _sum: { amountUsd: true } }),
      prisma.adEvent.count({ where: { type: 'click', createdAt: { gte: startOfMonth } } }),
      prisma.lead.aggregate({ where: { chargedAt: { gte: startOfMonth } }, _sum: { amountUsd: true }, _count: true }),
      prisma.profileBoost.count({ where: { createdAt: { gte: startOfMonth }, isActive: true } }),
    ])

    const mrr = subscriptionsByPlan.reduce((sum, s) => sum + (s._sum.amountUsd || 0), 0)
    const adsMonthRevenue = adsRevenue * 0.35

    return reply.send({
      subscriptions: subscriptionsByPlan, mrr: Math.round(mrr), arr: Math.round(mrr * 12), adsRevenue: Math.round(adsMonthRevenue),
      leadsRevenue: leadsRevenue._sum.amountUsd || 0, leadsCount: leadsRevenue._count, boostsCount: boostsRevenue,
      totalMonthRevenue: Math.round(mrr + adsMonthRevenue + (leadsRevenue._sum.amountUsd || 0)),
    })
  })
}
