import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../index'
import { requireAuth, requireVerifiedEmail, requireBusinessOwner, requirePlan } from '../middleware/auth'
import { generateCertificatePdf } from '../services/certificate'
import { validateTaxId, validatePersonalId } from '../services/taxIdValidation'
import { contactRevealRateLimit } from '../middleware/rateLimits'

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
        orderBy: [{ plan: 'desc' }, { ratingAvg: 'desc' }, { reviewCount: 'desc' }],
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

  // ─── Revelar teléfono / sitio web / dirección (con tracking para el incentivo Pro) ───
  app.post('/:id/contact-reveal', { config: { rateLimit: contactRevealRateLimit } }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const company = await prisma.company.findUnique({
      where: { id },
      select: { id: true, phone: true, website: true, address: true },
    })
    if (!company) return reply.status(404).send({ error: true, message: 'Empresa no encontrada' })

    // Auth opcional: si el visitante está logueado, guardamos quién fue. Si no, queda anónimo.
    let userId: string | undefined
    try { await request.jwtVerify(); userId = (request.user as any)?.userId } catch { /* visitante anónimo, sigue igual */ }

    await prisma.contactReveal.create({ data: { companyId: id, userId } })

    return reply.send({ phone: company.phone, website: company.website, address: company.address })
  })

  // ─── Listado de quiénes pidieron el contacto (plan Premium) ──────────────
  app.get('/:id/contact-reveals', { preHandler: [requireBusinessOwner, requirePlan('PREMIUM')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const revealsRaw = await prisma.contactReveal.findMany({
      where: { companyId: id, createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })
    const reveals = revealsRaw.map((r: typeof revealsRaw[number]) => ({
      id: r.id, createdAt: r.createdAt,
      user: r.user ? { id: r.user.id, name: r.user.name, avatarUrl: r.user.avatarUrl } : null,
    }))
    return reply.send({ reveals })
  })

  app.post('/', { preHandler: requireVerifiedEmail }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      categoryId: z.string().uuid().optional(),
      categorySuggestion: z.string().min(2).optional(),
      country: z.string(),
      city: z.string(),
      address: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().url().optional(),
      email: z.string().email().optional(),
      description: z.string().optional(),
      taxId: z.string().optional(),
      taxIdType: z.string().optional(),
    }).refine(d => d.categoryId || d.categorySuggestion, {
      message: 'Elegí un rubro de la lista o sugerí uno nuevo',
    })

    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos', details: body.error.issues })

    const existingClaim = await prisma.company.findFirst({ where: { claimedById: request.user.userId } })
    if (existingClaim) return reply.status(409).send({ error: true, message: 'Ya tenés una empresa registrada' })

    const { categorySuggestion, ...companyData } = body.data
    let categoryId = companyData.categoryId

    if (!categoryId && categorySuggestion) {
      const placeholder = await prisma.category.upsert({
        where: { slug: 'pendiente-clasificacion' },
        update: {},
        create: { name: 'Pendiente de clasificación', slug: 'pendiente-clasificacion', emoji: '🕓', isHidden: true },
      })
      categoryId = placeholder.id
    }

    if (!categoryId) return reply.status(400).send({ error: true, message: 'Rubro inválido' })

    const slug = generateSlug(companyData.name, companyData.city)
    const company = await prisma.company.create({
      data: { ...companyData, categoryId, slug, claimedById: request.user.userId, claimedAt: new Date() },
      include: { category: true },
    })

    if (categorySuggestion) {
      await prisma.categorySuggestion.create({ data: { companyId: company.id, suggestedName: categorySuggestion } })
    }

    await prisma.user.update({ where: { id: request.user.userId }, data: { role: 'BUSINESS' } })

    const token = app.jwt.sign(
      { userId: request.user.userId, role: 'BUSINESS', companyId: company.id },
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    return reply.status(201).send({ company, token })
  })

  app.post('/:id/claim', { preHandler: requireVerifiedEmail }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      country: z.string().length(2),
      taxId: z.string().min(5).optional(),
      taxIdType: z.string().optional(),
      personalIdNumber: z.string().min(5).optional(),
      verificationDocUrl: z.string().url().optional(),
      phone: z.string().min(6),
      email: z.string().email().optional(),
    }).refine((d) => !!d.taxId || !!d.personalIdNumber, { message: 'Ingresá tu RUT/registro de empresa, o tu número de documento si sos independiente' })

    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: body.error.issues[0]?.message || 'Datos inválidos' })

    const company = await prisma.company.findUnique({ where: { id } })
    if (!company) return reply.status(404).send({ error: true, message: 'Empresa no encontrada' })
    if (company.claimedById) return reply.status(409).send({ error: true, message: 'Esta empresa ya fue reclamada' })

    const existingClaim = await prisma.company.findFirst({ where: { claimedById: request.user.userId } })
    if (existingClaim) return reply.status(409).send({ error: true, message: 'Ya tenés una empresa reclamada' })

    let taxIdChecksumValid: boolean | null = null
    if (body.data.taxId) {
      const result = validateTaxId(body.data.country, body.data.taxId)
      if (!result.formatValid) return reply.status(400).send({ error: true, message: 'El formato del RUT/número no parece correcto para el país seleccionado' })
      if (result.checksumValid === false) return reply.status(400).send({ error: true, message: 'Ese RUT/número no es válido — revisá los dígitos' })
      taxIdChecksumValid = result.checksumValid
      // Si no se pudo validar con dígito verificador (ej. México), pedimos un documento de respaldo
      if (taxIdChecksumValid === null && !body.data.verificationDocUrl) {
        return reply.status(400).send({ error: true, message: 'Para este país no podemos validar el RUT automáticamente — adjuntá una factura como respaldo' })
      }
    } else if (body.data.personalIdNumber && !body.data.verificationDocUrl) {
      return reply.status(400).send({ error: true, message: 'Adjuntá una foto de tu documento de identidad' })
    } else if (body.data.personalIdNumber) {
      const result = validatePersonalId(body.data.country, body.data.personalIdNumber)
      if (result.checksumValid === false) return reply.status(400).send({ error: true, message: 'Ese número de documento no es válido — revisá los dígitos' })
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        claimedById: request.user.userId, claimedAt: new Date(),
        taxId: body.data.taxId, taxIdType: body.data.taxId ? body.data.taxIdType : undefined,
        taxIdChecksumValid, personalIdNumber: body.data.personalIdNumber,
        verificationDocUrl: body.data.verificationDocUrl,
        verificationDocType: body.data.personalIdNumber ? 'personal_id' : (taxIdChecksumValid === null ? 'invoice' : undefined),
        phone: body.data.phone, email: body.data.email,
      },
    })

    await prisma.user.update({ where: { id: request.user.userId }, data: { role: 'BUSINESS' } })

    const token = app.jwt.sign(
      { userId: request.user.userId, role: 'BUSINESS', companyId: updated.id },
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    return reply.send({ company: updated, token, message: 'Perfil reclamado. Revisaremos la verificación en 24hs.' })
  })

  // ─── Denunciar que el reclamo actual de una empresa es falso ─────────────
  app.post('/:id/dispute-claim', { preHandler: requireVerifiedEmail, config: { rateLimit: contactRevealRateLimit } }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({ reason: z.string().min(20).max(1000), evidenceDocUrl: z.string().url().optional() })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Contanos con más detalle por qué creés que el reclamo es falso (mínimo 20 caracteres)' })

    const company = await prisma.company.findUnique({ where: { id } })
    if (!company) return reply.status(404).send({ error: true, message: 'Empresa no encontrada' })
    if (!company.claimedById) return reply.status(400).send({ error: true, message: 'Esta empresa no está reclamada por nadie' })
    if (company.claimedById === request.user.userId) return reply.status(400).send({ error: true, message: 'No podés denunciar tu propio reclamo' })

    const existing = await prisma.claimDispute.findFirst({ where: { companyId: id, disputedById: request.user.userId, status: 'PENDING' } })
    if (existing) return reply.status(409).send({ error: true, message: 'Ya tenés una denuncia pendiente para esta empresa' })

    const dispute = await prisma.claimDispute.create({
      data: { companyId: id, disputedById: request.user.userId, reason: body.data.reason, evidenceDocUrl: body.data.evidenceDocUrl },
    })

    return reply.status(201).send({ dispute, message: 'Denuncia recibida. La vamos a revisar en las próximas 48hs.' })
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
      taxId: z.string().min(5).optional(),
      taxIdType: z.string().optional(),
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
    const [totalReviews, verifiedReviews, recentReviews, leads, contactReveals, ratingDistribution] = await Promise.all([
      prisma.review.count({ where: { companyId: id, status: 'APPROVED' } }),
      prisma.review.count({ where: { companyId: id, status: 'APPROVED', isVerified: true } }),
      prisma.review.count({ where: { companyId: id, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.lead.count({ where: { companyId: id, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.contactReveal.count({ where: { companyId: id, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.review.groupBy({ by: ['rating'], where: { companyId: id, status: 'APPROVED' }, _count: true }),
    ])

    return reply.send({
      totalReviews, verifiedReviews,
      verifiedPct: totalReviews > 0 ? Math.round((verifiedReviews / totalReviews) * 100) : 0,
      recentReviews, leads, contactReveals, ratingDistribution, ratingAvg: company.ratingAvg,
    })
  })

  // ─── Inteligencia competitiva (plan Premium+) ─────────────────────────────
  app.get('/:id/competitive-intel', { preHandler: [requireBusinessOwner, requirePlan('PREMIUM')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const company = await prisma.company.findUnique({ where: { id } })
    if (!company || company.claimedById !== request.user.userId) {
      return reply.status(403).send({ error: true, message: 'Sin permiso' })
    }

    // Grupo de comparación: misma categoría + ciudad. Si hay pocos pares, se amplía a toda la categoría en el país.
    let peers = await prisma.company.findMany({
      where: { categoryId: company.categoryId, city: company.city, country: company.country },
      select: { id: true, name: true, plan: true, ratingAvg: true, reviewCount: true },
    })
    let scope: 'city' | 'country' = 'city'
    if (peers.length < 3) {
      peers = await prisma.company.findMany({
        where: { categoryId: company.categoryId, country: company.country },
        select: { id: true, name: true, plan: true, ratingAvg: true, reviewCount: true },
      })
      scope = 'country'
    }

    const peerCount = peers.length
    const avgRating = peerCount > 0 ? peers.reduce((sum, p) => sum + p.ratingAvg, 0) / peerCount : 0
    const avgReviews = peerCount > 0 ? peers.reduce((sum, p) => sum + p.reviewCount, 0) / peerCount : 0

    // Mismo orden que el ranking público: plan primero, después rating, después cantidad de reseñas
    const planRank = { FREE: 0, PROFESSIONAL: 1, PREMIUM: 2, ENTERPRISE: 3 } as const
    const sorted = [...peers].sort((a, b) => {
      if (planRank[b.plan] !== planRank[a.plan]) return planRank[b.plan] - planRank[a.plan]
      if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg
      return b.reviewCount - a.reviewCount
    })
    const myPosition = sorted.findIndex((p) => p.id === id) + 1
    const above = sorted.slice(0, Math.max(0, myPosition - 1)).slice(-3).reverse()

    return reply.send({
      scope,
      peerCount,
      myStats: { ratingAvg: company.ratingAvg, reviewCount: company.reviewCount },
      categoryAvg: { ratingAvg: Math.round(avgRating * 10) / 10, reviewCount: Math.round(avgReviews) },
      rank: { position: myPosition, total: sorted.length },
      companiesAbove: above.map((c) => ({ name: c.name, plan: c.plan, ratingAvg: c.ratingAvg, reviewCount: c.reviewCount })),
    })
  })

  // ─── Certificado PDF descargable (plan Profesional+) ─────────────────────
  app.get('/:id/certificate', { preHandler: [requireBusinessOwner, requirePlan('PROFESSIONAL')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const company = await prisma.company.findUnique({ where: { id }, include: { category: { select: { name: true } } } })

    if (!company || company.claimedById !== request.user.userId) {
      return reply.status(403).send({ error: true, message: 'Sin permiso' })
    }

    const pdf = await generateCertificatePdf({
      name: company.name, slug: company.slug, city: company.city, country: company.country,
      categoryName: company.category.name, ratingAvg: company.ratingAvg, reviewCount: company.reviewCount,
      verifiedReviewCount: company.verifiedReviewCount, isVerified: company.isVerified,
    })

    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="certificado-${company.slug}.pdf"`)
      .send(pdf)
  })
}

function generateSlug(name: string, city: string): string {
  const base = `${name}-${city}`.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}
