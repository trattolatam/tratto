import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { INTERESTS } from '../constants/targeting'

export default async function adRoutes(app: FastifyInstance) {

  app.get('/feed', async (request, reply) => {
    const query = z.object({
      categoryId: z.string().uuid().optional(),
      country: z.string().optional(),
      limit: z.string().default('2'),
    }).parse(request.query)

    // Segmentación demográfica: si hay un usuario logueado, cruzamos su perfil
    // (cargado opcionalmente en /completar-perfil) contra los filtros del anuncio.
    // Sin login, o sin ese dato cargado, solo entran los anuncios sin restricción
    // en esa dimensión — no le mostramos a nadie un anuncio pensado para un
    // público específico si no sabemos si esa persona entra en ese público.
    let viewer: { ageRange: string | null; gender: string | null; interests: string[]; incomeLevel: string | null } | null = null
    try {
      await request.jwtVerify()
      const payload = request.user as any
      viewer = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { ageRange: true, gender: true, interests: true, incomeLevel: true },
      })
    } catch { /* visitante anónimo — sigue sin datos de segmentación */ }

    const where: any = { status: 'ACTIVE', adAccount: { balance: { gt: 0 } } }
    if (query.categoryId) where.targetCategories = { some: { categoryId: query.categoryId } }
    if (query.country) where.targetCountries = { has: query.country }

    const limit = parseInt(query.limit)
    // Traemos un pool más grande del que pide el caller, porque después de
    // filtrar por perfil puede que varios no califiquen — así igual llegamos al límite pedido.
    const candidates = await prisma.ad.findMany({
      where, take: Math.min(limit * 5, 20), orderBy: { cpcUsd: 'desc' },
      select: {
        id: true, title: true, description: true, imageUrls: true, price: true, ctaText: true, ctaUrl: true,
        targetAgeRanges: true, targetGenders: true, targetInterests: true, targetIncomeLevels: true,
        adAccount: { select: { companyName: true } },
      },
    })

    const matchesDimension = (adValues: string[], viewerValue: string | null | undefined) =>
      adValues.length === 0 || (!!viewerValue && adValues.includes(viewerValue))
    const matchesInterests = (adInterests: string[], viewerInterests: string[]) =>
      adInterests.length === 0 || adInterests.some((i) => viewerInterests.includes(i))

    const matched = candidates.filter((ad) =>
      matchesDimension(ad.targetAgeRanges, viewer?.ageRange) &&
      matchesDimension(ad.targetGenders, viewer?.gender) &&
      matchesDimension(ad.targetIncomeLevels, viewer?.incomeLevel) &&
      matchesInterests(ad.targetInterests, viewer?.interests || [])
    ).slice(0, limit)

    const ads = matched.map(({ targetAgeRanges, targetGenders, targetInterests, targetIncomeLevels, ...ad }) => ad)

    if (ads.length > 0) {
      setImmediate(async () => {
        await prisma.adEvent.createMany({ data: ads.map(ad => ({ adId: ad.id, type: 'impression', country: query.country })) })
        await prisma.ad.updateMany({ where: { id: { in: ads.map(a => a.id) } }, data: { impressions: { increment: 1 } } })
      })
    }

    return reply.send({ ads })
  })

  app.post('/:id/click', async (request, reply) => {
    const { id } = request.params as { id: string }
    const ad = await prisma.ad.findUnique({ where: { id, status: 'ACTIVE' }, include: { adAccount: true } })
    if (!ad) return reply.status(404).send({ error: true, message: 'Anuncio no encontrado' })

    const cost = ad.cpcUsd
    if (ad.adAccount.balance < cost) {
      await prisma.ad.update({ where: { id }, data: { status: 'EXHAUSTED' } })
      return reply.status(410).send({ error: true, message: 'Sin saldo disponible' })
    }

    await Promise.all([
      prisma.adAccount.update({ where: { id: ad.adAccountId }, data: { balance: { decrement: cost } } }),
      prisma.ad.update({ where: { id }, data: { clicks: { increment: 1 }, totalSpent: { increment: cost } } }),
      prisma.adEvent.create({ data: { adId: id, type: 'click' } }),
    ])

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todaySpend = await prisma.adEvent.count({ where: { adId: id, type: 'click', createdAt: { gte: today } } })
    if (todaySpend * cost >= ad.dailyBudget) {
      await prisma.ad.update({ where: { id }, data: { status: 'PAUSED' } })
    }

    return reply.send({ success: true, redirectUrl: ad.ctaUrl })
  })

  app.get('/my', { preHandler: requireAuth }, async (request, reply) => {
    const account = await prisma.adAccount.findFirst({
      where: { userId: request.user.userId },
      include: { ads: { orderBy: { createdAt: 'desc' }, include: { targetCategories: { include: { category: true } } } } },
    })
    if (!account) return reply.send({ account: null, ads: [] })
    return reply.send({ account, ads: account.ads })
  })

  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const schema = z.object({
      title: z.string().min(5).max(80),
      description: z.string().min(10).max(300),
      imageUrls: z.array(z.string().url()).min(1).max(3),
      price: z.number().positive().optional(),
      ctaText: z.string().default('Consultar precio'),
      ctaUrl: z.string().url().optional(),
      model: z.enum(['CPC', 'CPM']).default('CPC'),
      dailyBudget: z.number().min(3),
      categoryIds: z.array(z.string().uuid()).min(1),
      targetCountries: z.array(z.string()).min(1),
      companyName: z.string().min(2),
      // Segmentación demográfica — todos opcionales, array vacío/ausente = sin filtro en esa dimensión
      targetAgeRanges: z.array(z.enum(['R18_24', 'R25_34', 'R35_44', 'R45_54', 'R55_64', 'R65_PLUS'])).default([]),
      targetGenders: z.array(z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])).default([]),
      targetInterests: z.array(z.string()).default([]),
      targetIncomeLevels: z.array(z.enum(['LOW', 'MEDIUM', 'HIGH', 'PREFER_NOT_TO_SAY'])).default([]),
    })

    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos', details: body.error.issues })

    if (body.data.targetInterests.length > 0) {
      const invalid = body.data.targetInterests.filter((i) => !(INTERESTS as readonly string[]).includes(i))
      if (invalid.length > 0) return reply.status(400).send({ error: true, message: `Interés inválido: ${invalid[0]}` })
    }

    let account = await prisma.adAccount.findFirst({ where: { userId: request.user.userId } })
    if (!account) account = await prisma.adAccount.create({ data: { userId: request.user.userId, companyName: body.data.companyName } })

    const { categoryIds, companyName, ...adData } = body.data
    const ad = await prisma.ad.create({
      data: { ...adData, cpcUsd: 0.35, adAccountId: account.id, status: 'PENDING', targetCategories: { create: categoryIds.map(categoryId => ({ categoryId })) } },
      include: { targetCategories: { include: { category: true } } },
    })

    return reply.status(201).send({ ad, message: 'Anuncio enviado a revisión. Activo en menos de 24hs.' })
  })

  app.post('/:adAccountId/recharge', { preHandler: requireAuth }, async (request, reply) => {
    const { adAccountId } = request.params as { adAccountId: string }
    const body = z.object({ amountUsd: z.number().min(20) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Monto mínimo: USD 20' })

    const account = await prisma.adAccount.update({ where: { id: adAccountId }, data: { balance: { increment: body.data.amountUsd } } })
    await prisma.ad.updateMany({ where: { adAccountId, status: 'EXHAUSTED' }, data: { status: 'ACTIVE' } })

    return reply.send({ account, message: `Saldo recargado: USD ${body.data.amountUsd}` })
  })

  app.patch('/:id/moderate', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({ status: z.enum(['ACTIVE', 'REJECTED']), note: z.string().optional() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos' })

    const ad = await prisma.ad.update({
      where: { id },
      data: { status: body.data.status, rejectionNote: body.data.note, approvedAt: body.data.status === 'ACTIVE' ? new Date() : null, approvedById: body.data.status === 'ACTIVE' ? request.user.userId : null },
      include: { adAccount: { include: { user: true } } },
    })

    const { sendNotification } = await import('../services/notifications')
    await sendNotification({
      userId: ad.adAccount.userId, type: body.data.status === 'ACTIVE' ? 'AD_APPROVED' : 'AD_REJECTED',
      title: body.data.status === 'ACTIVE' ? '¡Tu anuncio está activo!' : 'Anuncio no aprobado',
      body: body.data.status === 'ACTIVE' ? `"${ad.title}" ya está visible en Tratto.` : `"${ad.title}" no fue aprobado. ${body.data.note || ''}`,
      data: { adId: id },
    })

    return reply.send({ ad })
  })
}
