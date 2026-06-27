import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../index'
import { requireAuth, requireBusinessOwner } from '../middleware/auth'

export default async function companyRoutes(app: FastifyInstance) {

  app.get('/', async (request, reply) => {
    const query = z.object({
      category: z.string().optional(),
      country: z.string().optional(),
      city: z.string().optional(),
      search: z.string().optional(),
      plan: z.enum(['FREE', 'PROFESSIONAL', 'PREMIUM']).optional(),
      verified: z.string().optional(),
      page: z.string().default('1'),
      limit: z.string().default('20'),
    }).parse(request.query)

    const page = Math.max(1, parseInt(query.page))
    const limit = Math.min(50, parseInt(query.limit))
    const skip = (page - 1) * limit

    const where: any = {}
    if (query.category) where.category = { slug: query.category }
    if (query.country) where.country = query.country
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' }
    if (query.verified === 'true') where.isVerified = true
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const now = new Date()
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where, skip, take: limit,
        orderBy: [{ ratingAvg: 'desc' }, { reviewCount: 'desc' }],
        include: {
          category: { select: { name: true, slug: true, emoji: true } },
          medals: { where: { visible: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } },
          _count: { select: { reviews: true } },
        },
      }),
      prisma.company.count({ where }),
    ])

    return reply.send({ companies, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  })

  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const now = new Date()

    const company = await prisma.company.findUnique({
      where: { slug },
      include: {
        category: true,
        medals: { where: { visible: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } },
        aiSummary: true,
        reviews: {
          where: { status: 'APPROVED' },
          orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
          take: 10,
          include: { user: { select: { name: true, avatarUrl: true, country: true } }, response: true },
        },
        _count: { select: { reviews: true } },
      },
    })

    if (!company) return reply.status(404).send({ error: true, message: 'Empresa no encontrada' })

    const ads = await prisma.ad.findMany({
      where: {
        status: 'ACTIVE',
        targetCategories: { some: { categoryId: company.categoryId } },
        targetCountries: { has: company.country },
        adAccount: { balance: { gt: 0 } },
      },
      take: 2,
      orderBy: { cpcUsd: 'desc' },
      include: { adAccount: { select: { companyName: true } } },
    })

    return reply.send({ company, ads })
  })

  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      categoryId: z.string().uuid(),
      country: z.string(),
      city: z.string(),
      address: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().url().optional(),
      email: z.string().email().optional(),
      description: z.string().optional(),
      taxId: z.string().optional(),
      taxIdType: z.string().optional(),
    })

    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos', details: body.error.issues })

    const slug = generateSlug(body.data.name, body.data.city)
    const company = await prisma.company.create({ data: { ...body.data, slug }, include: { category: true } })

    return reply.status(201).send({ company })
  })

  app.post('/:id/claim', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      taxId: z.string().min(5),
      taxIdType: z.string(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    })

    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos' })

    const company = await prisma.company.findUnique({ where: { id } })
    if (!company) return reply.status(404).send({ error: true, message: 'Empresa no encontrada' })
    if (company.claimedById) return reply.status(409).send({ error: true, message: 'Esta empresa ya fue reclamada' })

    const existingClaim = await prisma.company.findFirst({ where: { claimedById: request.user.userId } })
    if (existingClaim) return reply.status(409).send({ error: true, message: 'Ya tenés una empresa reclamada' })

    const updated = await prisma.company.update({
      where: { id },
      data: {
        claimedById: request.user.userId, claimedAt: new Date(),
        taxId: body.data.taxId, taxIdType: body.data.taxIdType,
        phone: body.data.phone, email: body.data.email,
      },
    })

    await prisma.user.update({ where: { id: request.user.userId }, data: { role: 'BUSINESS' } })

    return reply.send({ company: updated, message: 'Perfil reclamado. Revisaremos la verificación en 24hs.' })
  })

  app.patch('/:id', { preHandler: requireBusinessOwner }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const company = await prisma.company.findUnique({ where: { id } })
    if (!company || company.claimedById !== request.user.userId) {
      return reply.status(403).send({ error: true, message: 'Sin permiso para editar esta empresa' })
    }

    const schema = z.object({
      description: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().url().optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
    })

    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos' })

    const updated = await prisma.company.update({ where: { id }, data: body.data })
    return reply.send({ company: updated })
  })

  app.get('/:id/stats', { preHandler: requireBusinessOwner }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const company = await prisma.company.findUnique({ where: { id } })
    if (!company || company.claimedById !== request.user.userId) {
      return reply.status(403).send({ error: true, message: 'Sin permiso' })
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const [totalReviews, verifiedReviews, recentReviews, leads, ratingDistribution] = await Promise.all([
      prisma.review.count({ where: { companyId: id, status: 'APPROVED' } }),
      prisma.review.count({ where: { companyId: id, status: 'APPROVED', isVerified: true } }),
      prisma.review.count({ where: { companyId: id, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.lead.count({ where: { companyId: id, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.review.groupBy({ by: ['rating'], where: { companyId: id, status: 'APPROVED' }, _count: true }),
    ])

    return reply.send({
      totalReviews, verifiedReviews,
      verifiedPct: totalReviews > 0 ? Math.round((verifiedReviews / totalReviews) * 100) : 0,
      recentReviews, leads, ratingDistribution, ratingAvg: company.ratingAvg,
    })
  })
}

function generateSlug(name: string, city: string): string {
  const base = `${name}-${city}`.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}
