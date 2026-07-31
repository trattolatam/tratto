import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { getValidCategorySlugs } from '../services/categories'
import { DEFAULT_CPC_USD, DEFAULT_CPM_USD } from '../constants/adPricing'
import { validateAndNormalizePhone } from '../utils/phone'

const LOW_BALANCE_THRESHOLD = 5
const MAX_IMPRESSIONS_PER_USER_PER_DAY = 3 // tope de repeticiones: no cansar al mismo usuario con el mismo anuncio
// 1x1 gif transparente — para el pixel de conversión, así funciona como <img src="..."> en cualquier sitio externo
const TRANSPARENT_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64')

async function assertIsOwner(id: string, userId: string) {
  const ad = await prisma.ad.findUnique({ where: { id }, include: { adAccount: true } })
  if (!ad || ad.adAccount.userId !== userId) return null
  return ad
}

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
    let viewerId: string | null = null
    let viewer: { ageRange: string | null; gender: string | null; interests: string[]; incomeLevel: string | null } | null = null
    try {
      await request.jwtVerify()
      const payload = request.user as any
      viewerId = payload.userId
      viewer = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { ageRange: true, gender: true, interests: true, incomeLevel: true },
      })
    } catch { /* visitante anónimo — sigue sin datos de segmentación */ }

    const now = new Date()
    const where: any = {
      status: 'ACTIVE',
      adAccount: { balance: { gt: 0 } },
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    }
    if (query.categoryId) where.targetCategories = { some: { categoryId: query.categoryId } }
    if (query.country) where.targetCountries = { has: query.country }

    const limit = parseInt(query.limit)
    const candidates = await prisma.ad.findMany({
      where, take: Math.min(limit * 6, 24), orderBy: { cpcUsd: 'desc' },
      select: {
        id: true, title: true, description: true, imageUrls: true, price: true, ctaText: true, ctaUrl: true,
        whatsappNumber: true, phoneNumber: true, contactEmail: true, websiteUrl: true, instagramUrl: true, facebookUrl: true, cpcUsd: true,
        model: true, cpmUsd: true, adAccountId: true, dailyBudget: true,
        targetAgeRanges: true, targetGenders: true, targetInterests: true, targetIncomeLevels: true,
        adAccount: { select: { companyName: true, balance: true } },
      },
    })

    const matchesDimension = (adValues: string[], viewerValue: string | null | undefined) =>
      adValues.length === 0 || (!!viewerValue && adValues.includes(viewerValue))
    const matchesInterests = (adInterests: string[], viewerInterests: string[]) =>
      adInterests.length === 0 || adInterests.some((i) => viewerInterests.includes(i))

    let demographicMatches = candidates.filter((ad) =>
      matchesDimension(ad.targetAgeRanges, viewer?.ageRange) &&
      matchesDimension(ad.targetGenders, viewer?.gender) &&
      matchesDimension(ad.targetIncomeLevels, viewer?.incomeLevel) &&
      matchesInterests(ad.targetInterests, viewer?.interests || [])
    )

    if (viewerId) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const seenToday = await prisma.adEvent.groupBy({
        by: ['adId'],
        where: { userId: viewerId, type: 'impression', createdAt: { gte: todayStart }, adId: { in: demographicMatches.map((a) => a.id) } },
        _count: { id: true },
      })
      const seenCounts = new Map(seenToday.map((s) => [s.adId, s._count.id]))
      demographicMatches = demographicMatches.filter((ad) => (seenCounts.get(ad.id) || 0) < MAX_IMPRESSIONS_PER_USER_PER_DAY)
    }

    // Relevancia real: cuánto más específicamente un anuncio apunta a ESTE
    // usuario (edad/género/ingresos/intereses que coinciden), más arriba queda
    // — no gana el que más paga, gana el que mejor calza con quien está mirando.
    // Un anuncio sin ningún filtro (le llega a todos) suma 0 puntos extra acá;
    // cpcUsd solo desempata entre anuncios igual de relevantes.
    function relevanceScore(ad: (typeof demographicMatches)[number]): number {
      let score = 0
      if (ad.targetAgeRanges.length > 0 && viewer?.ageRange && ad.targetAgeRanges.includes(viewer.ageRange as any)) score += 1
      if (ad.targetGenders.length > 0 && viewer?.gender && ad.targetGenders.includes(viewer.gender as any)) score += 1
      if (ad.targetIncomeLevels.length > 0 && viewer?.incomeLevel && ad.targetIncomeLevels.includes(viewer.incomeLevel as any)) score += 1
      if (ad.targetInterests.length > 0 && (viewer?.interests || []).some((i) => ad.targetInterests.includes(i))) score += 1
      return score
    }

    demographicMatches.sort((a, b) => {
      const scoreDiff = relevanceScore(b) - relevanceScore(a)
      return scoreDiff !== 0 ? scoreDiff : b.cpcUsd - a.cpcUsd
    })

    const matched = demographicMatches.slice(0, limit)
    const ads = matched.map(({ targetAgeRanges, targetGenders, targetInterests, targetIncomeLevels, cpcUsd, model, cpmUsd, adAccountId, dailyBudget, adAccount, ...ad }) => ({ ...ad, adAccount: { companyName: adAccount.companyName } }))

    if (matched.length > 0) {
      setImmediate(async () => {
        // Para los CPM, decidimos ACÁ (antes de crear el evento) si hay saldo
        // para cobrar esta vista — así el costo queda grabado en el mismo
        // evento desde el principio, y las estadísticas por período después
        // pueden sumar el gasto real sin tener que adivinar.
        const costByAdId = new Map<string, number>()
        for (const ad of matched) {
          if (ad.model !== 'CPM') continue
          const cost = (ad.cpmUsd || 0) / 1000
          if (cost > 0 && ad.adAccount.balance >= cost) costByAdId.set(ad.id, cost)
        }

        await prisma.adEvent.createMany({
          data: matched.map(ad => ({
            adId: ad.id, type: 'impression', country: query.country, userId: viewerId || undefined,
            costUsd: costByAdId.get(ad.id) || null,
          })),
        })
        await prisma.ad.updateMany({ where: { id: { in: matched.map(a => a.id) } }, data: { impressions: { increment: 1 } } })

        // Los anuncios CPM se cobran acá, por cada vista — no en /click.
        // Los CPC no pagan nada por esto, ya se cobran cuando les tocan WhatsApp.
        for (const ad of matched) {
          if (ad.model !== 'CPM') continue
          const cost = (ad.cpmUsd || 0) / 1000
          if (cost <= 0) continue

          if (!costByAdId.has(ad.id)) {
            // No tenía saldo cuando chequeamos arriba — se queda sin cobrar esta vista.
            await prisma.ad.update({ where: { id: ad.id }, data: { status: 'EXHAUSTED' } })
            continue
          }

          const newBalance = ad.adAccount.balance - cost
          await Promise.all([
            prisma.adAccount.update({ where: { id: ad.adAccountId }, data: { balance: { decrement: cost } } }),
            prisma.ad.update({ where: { id: ad.id }, data: { totalSpent: { increment: cost } } }),
          ])

          const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
          const todayImpressions = await prisma.adEvent.count({ where: { adId: ad.id, type: 'impression', createdAt: { gte: todayStart } } })
          if (todayImpressions * cost >= ad.dailyBudget) {
            await prisma.ad.update({ where: { id: ad.id }, data: { status: 'PAUSED' } })
          }

          if (newBalance < LOW_BALANCE_THRESHOLD) {
            const account = await prisma.adAccount.findUnique({ where: { id: ad.adAccountId } })
            if (account && !account.lowBalanceNotifiedAt) {
              await prisma.adAccount.update({ where: { id: ad.adAccountId }, data: { lowBalanceNotifiedAt: new Date() } })
              const { sendNotification } = await import('../services/notifications')
              await sendNotification({
                userId: account.userId, type: 'AD_LOW_BALANCE',
                title: 'Se te está por acabar el saldo de anuncios',
                body: `Te quedan USD ${newBalance.toFixed(2)} en tu cuenta de Tratto Ads. Recargá para que tus anuncios no se pausen solos.`,
              })
            }
          }
        }
      })
    }

    return reply.send({ ads })
  })

  app.post('/:id/click', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({ channel: z.enum(['whatsapp', 'phone', 'email', 'website', 'instagram', 'facebook']).default('whatsapp') }).safeParse(request.body)
    const channel = body.success ? body.data.channel : 'whatsapp'

    let viewerId: string | undefined
    try { await request.jwtVerify(); viewerId = (request.user as any).userId } catch { /* anónimo */ }

    const ad = await prisma.ad.findUnique({ where: { id, status: 'ACTIVE' }, include: { adAccount: true } })
    if (!ad) return reply.status(404).send({ error: true, message: 'Anuncio no encontrado' })

    // Cualquier clic (WhatsApp, teléfono, email, sitio web, Instagram,
    // Facebook) cobra en anuncios CPC — todos son, al final, un contacto real
    // iniciado. En anuncios CPM ningún clic cobra nada, porque ya se cobra
    // por cada vista en /feed — cobrar también el clic ahí sería cobrarle
    // dos veces al anunciante por lo mismo.
    const isBillable = ad.model === 'CPC'

    if (isBillable) {
      const cost = ad.cpcUsd
      if (ad.adAccount.balance < cost) {
        await prisma.ad.update({ where: { id }, data: { status: 'EXHAUSTED' } })
        return reply.status(410).send({ error: true, message: 'Sin saldo disponible' })
      }

      const newBalance = ad.adAccount.balance - cost
      await Promise.all([
        prisma.adAccount.update({ where: { id: ad.adAccountId }, data: { balance: { decrement: cost } } }),
        prisma.ad.update({ where: { id }, data: { clicks: { increment: 1 }, totalSpent: { increment: cost } } }),
        prisma.adEvent.create({ data: { adId: id, type: `click_${channel}`, userId: viewerId, costUsd: cost } }),
      ])

      if (newBalance < LOW_BALANCE_THRESHOLD && !ad.adAccount.lowBalanceNotifiedAt) {
        await prisma.adAccount.update({ where: { id: ad.adAccountId }, data: { lowBalanceNotifiedAt: new Date() } })
        const { sendNotification } = await import('../services/notifications')
        await sendNotification({
          userId: ad.adAccount.userId, type: 'AD_LOW_BALANCE',
          title: 'Se te está por acabar el saldo de anuncios',
          body: `Te quedan USD ${newBalance.toFixed(2)} en tu cuenta de Tratto Ads. Recargá para que tus anuncios no se pausen solos.`,
        })
      }

      const today = new Date(); today.setHours(0, 0, 0, 0)
      const todaySpend = await prisma.adEvent.count({ where: { adId: id, type: { startsWith: 'click_' }, createdAt: { gte: today } } })
      if (todaySpend * cost >= ad.dailyBudget) {
        await prisma.ad.update({ where: { id }, data: { status: 'PAUSED' } })
      }
    } else {
      await prisma.adEvent.create({ data: { adId: id, type: `click_${channel}`, userId: viewerId } })
    }

    const redirectUrls: Record<string, string | undefined> = {
      whatsapp: ad.whatsappNumber ? `https://wa.me/${ad.whatsappNumber.replace('+', '')}?text=${encodeURIComponent(`Hola! Vi tu anuncio "${ad.title}" en Tratto y quería consultar.`)}` : undefined,
      phone: ad.phoneNumber ? `tel:${ad.phoneNumber}` : undefined,
      email: ad.contactEmail ? `mailto:${ad.contactEmail}` : undefined,
      website: ad.websiteUrl || undefined,
      instagram: ad.instagramUrl || undefined,
      facebook: ad.facebookUrl || undefined,
    }

    return reply.send({ success: true, redirectUrl: redirectUrls[channel] })
  })

  app.get('/:id/convert', async (request, reply) => {
    const { id } = request.params as { id: string }
    prisma.ad.update({ where: { id }, data: { conversions: { increment: 1 } } }).catch(() => {})
    prisma.adEvent.create({ data: { adId: id, type: 'conversion' } }).catch(() => {})
    reply.header('Content-Type', 'image/gif')
    reply.header('Cache-Control', 'no-store')
    return reply.send(TRANSPARENT_PIXEL)
  })

  // ─── Alguien abrió la ficha ampliada del anuncio (no cobra nada, solo mide) ──
  app.post('/:id/detail-view', async (request, reply) => {
    const { id } = request.params as { id: string }
    let viewerId: string | undefined
    try { await request.jwtVerify(); viewerId = (request.user as any).userId } catch { /* anónimo */ }
    prisma.adEvent.create({ data: { adId: id, type: 'detail_view', userId: viewerId } }).catch(() => {})
    return reply.send({ ok: true })
  })

  app.get('/my', { preHandler: requireAuth }, async (request, reply) => {
    const account = await prisma.adAccount.findFirst({
      where: { userId: request.user.userId },
      include: { ads: { orderBy: { createdAt: 'desc' }, include: { targetCategories: { include: { category: true } } } } },
    })
    if (!account) return reply.send({ account: null, ads: [] })

    // Desglose de clics por canal + aperturas de ficha ampliada, para cada anuncio.
    const adIds = account.ads.map((a) => a.id)
    const events = adIds.length > 0
      ? await prisma.adEvent.groupBy({ by: ['adId', 'type'], where: { adId: { in: adIds } }, _count: true })
      : []

    const ads = account.ads.map((ad) => {
      const adEvents = events.filter((e) => e.adId === ad.id)
      const clicksByChannel: Record<string, number> = {}
      let detailViews = 0
      for (const e of adEvents) {
        if (e.type === 'detail_view') detailViews = e._count
        else if (e.type.startsWith('click_')) clicksByChannel[e.type.replace('click_', '')] = e._count
      }
      const ctr = ad.impressions > 0 ? Math.round((ad.clicks / ad.impressions) * 1000) / 10 : 0
      return { ...ad, clicksByChannel, detailViews, ctr }
    })

    return reply.send({ account, ads })
  })

  // ─── Panel de estadísticas del anunciante, por período ──────────────────────
  app.get('/my/stats', { preHandler: requireAuth }, async (request, reply) => {
    const query = z.object({
      period: z.enum(['7d', '30d', 'all', 'custom']).default('30d'),
      from: z.string().optional(),
      to: z.string().optional(),
    }).safeParse(request.query)
    if (!query.success) return reply.status(400).send({ error: true, message: 'Parámetros inválidos' })

    const account = await prisma.adAccount.findFirst({ where: { userId: request.user.userId }, include: { ads: true } })
    if (!account) return reply.send({ from: null, to: null, totals: null, byAd: [] })

    let from: Date | undefined
    let to: Date | undefined
    const now = new Date()
    if (query.data.period === '7d') { from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
    else if (query.data.period === '30d') { from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
    else if (query.data.period === 'custom') {
      if (query.data.from) from = new Date(query.data.from)
      if (query.data.to) to = new Date(query.data.to)
    }
    // 'all' deja from/to sin definir — trae toda la campaña, desde siempre.

    const adIds = account.ads.map((a) => a.id)
    if (adIds.length === 0) return reply.send({ from: from || null, to: to || null, totals: { impressions: 0, clicks: 0, detailViews: 0, spend: 0, conversions: 0, ctr: 0 }, byAd: [] })

    const dateFilter: any = {}
    if (from) dateFilter.gte = from
    if (to) dateFilter.lte = to

    const events = await prisma.adEvent.findMany({
      where: { adId: { in: adIds }, ...(from || to ? { createdAt: dateFilter } : {}) },
      select: { adId: true, type: true, costUsd: true },
    })

    const perAd = new Map<string, { impressions: number; clicksByChannel: Record<string, number>; clicks: number; detailViews: number; spend: number; conversions: number }>()
    for (const id of adIds) perAd.set(id, { impressions: 0, clicksByChannel: {}, clicks: 0, detailViews: 0, spend: 0, conversions: 0 })

    for (const e of events) {
      const bucket = perAd.get(e.adId)
      if (!bucket) continue
      if (e.type === 'impression') bucket.impressions++
      else if (e.type === 'detail_view') bucket.detailViews++
      else if (e.type === 'conversion') bucket.conversions++
      else if (e.type.startsWith('click_')) {
        const channel = e.type.replace('click_', '')
        bucket.clicksByChannel[channel] = (bucket.clicksByChannel[channel] || 0) + 1
        bucket.clicks++
      }
      if (e.costUsd) bucket.spend += e.costUsd
    }

    const byAd = account.ads.map((ad) => {
      const bucket = perAd.get(ad.id)!
      const ctr = bucket.impressions > 0 ? Math.round((bucket.clicks / bucket.impressions) * 1000) / 10 : 0
      return {
        adId: ad.id, title: ad.title, status: ad.status, model: ad.model,
        impressions: bucket.impressions, clicks: bucket.clicks, clicksByChannel: bucket.clicksByChannel,
        detailViews: bucket.detailViews, spend: Math.round(bucket.spend * 100) / 100,
        conversions: bucket.conversions, ctr,
      }
    })

    const totals = byAd.reduce((acc, a) => ({
      impressions: acc.impressions + a.impressions,
      clicks: acc.clicks + a.clicks,
      detailViews: acc.detailViews + a.detailViews,
      spend: Math.round((acc.spend + a.spend) * 100) / 100,
      conversions: acc.conversions + a.conversions,
    }), { impressions: 0, clicks: 0, detailViews: 0, spend: 0, conversions: 0 })
    const totalsCtr = totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 1000) / 10 : 0

    return reply.send({ from: from || null, to: to || null, totals: { ...totals, ctr: totalsCtr }, byAd })
  })

  const adInputFields = {
    title: z.string().min(5).max(80),
    description: z.string().min(10).max(300),
    imageUrls: z.array(z.string().url()).min(1).max(3),
    price: z.number().positive().optional(),
    ctaText: z.string().default('Consultar precio'),
    ctaUrl: z.string().url().optional(),
    // Contacto obligatorio — el número "crudo" que escribió el anunciante,
    // se valida y normaliza a E.164 más abajo antes de guardar.
    // Solo WhatsApp es obligatorio — es el único canal que garantiza una
    // acción real (el botón principal del anuncio abre WhatsApp). El resto
    // son canales alternativos, opcionales, para quien quiera dar más datos.
    whatsappCountry: z.string().length(2),
    whatsappNumber: z.string().min(4),
    phoneCountry: z.string().length(2).optional(),
    phoneNumber: z.string().min(4).optional(),
    contactEmail: z.string().email().optional(),
    websiteUrl: z.string().url().optional(),
    instagramUrl: z.string().url().optional(),
    facebookUrl: z.string().url().optional(),
    model: z.enum(['CPC', 'CPM']).default('CPC'),
    dailyBudget: z.number().min(3),
    categoryIds: z.array(z.string().uuid()).min(1),
    targetCountries: z.array(z.string()).min(1),
    targetAgeRanges: z.array(z.enum(['R18_24', 'R25_34', 'R35_44', 'R45_54', 'R55_64', 'R65_PLUS'])).default([]),
    targetGenders: z.array(z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])).default([]),
    targetInterests: z.array(z.string()).default([]),
    targetIncomeLevels: z.array(z.enum(['LOW', 'MEDIUM', 'HIGH', 'PREFER_NOT_TO_SAY'])).default([]),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  }

  // Valida y normaliza WhatsApp/teléfono a E.164 antes de guardar. Se usa
  // tanto al crear como al editar, así los dos caminos quedan consistentes.
  function normalizeContactPhones(data: { whatsappCountry?: string; whatsappNumber?: string; phoneCountry?: string; phoneNumber?: string }) {
    const result: { whatsappNumber?: string; phoneNumber?: string; error?: string } = {}

    if (data.whatsappNumber && data.whatsappCountry) {
      const check = validateAndNormalizePhone(data.whatsappNumber, data.whatsappCountry)
      if (!check.valid) { result.error = `WhatsApp: ${check.message}`; return result }
      result.whatsappNumber = check.e164
    }

    if (data.phoneNumber && data.phoneCountry) {
      const check = validateAndNormalizePhone(data.phoneNumber, data.phoneCountry)
      if (!check.valid) { result.error = `Teléfono: ${check.message}`; return result }
      result.phoneNumber = check.e164
    }

    return result
  }

  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const schema = z.object({ ...adInputFields, companyName: z.string().min(2) })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos', details: body.error.issues })

    if (body.data.targetInterests.length > 0) {
      const validSlugs = await getValidCategorySlugs()
      const invalid = body.data.targetInterests.filter((i) => !validSlugs.includes(i))
      if (invalid.length > 0) return reply.status(400).send({ error: true, message: `Rubro inválido: ${invalid[0]}` })
    }

    const phones = normalizeContactPhones(body.data)
    if (phones.error) return reply.status(400).send({ error: true, message: phones.error })

    let account = await prisma.adAccount.findFirst({ where: { userId: request.user.userId } })
    if (!account) account = await prisma.adAccount.create({ data: { userId: request.user.userId, companyName: body.data.companyName } })

    const { categoryIds, companyName, startsAt, endsAt, ...adData } = body.data
    const ad = await prisma.ad.create({
      data: {
        ...adData, ...phones, cpcUsd: DEFAULT_CPC_USD, cpmUsd: DEFAULT_CPM_USD, adAccountId: account.id, status: 'PENDING',
        startsAt: startsAt ? new Date(startsAt) : null, endsAt: endsAt ? new Date(endsAt) : null,
        targetCategories: { create: categoryIds.map(categoryId => ({ categoryId })) },
      },
      include: { targetCategories: { include: { category: true } } },
    })

    return reply.status(201).send({ ad, message: 'Anuncio enviado a revisión. Activo en menos de 24hs.' })
  })

  app.patch('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await assertIsOwner(id, request.user.userId)
    if (!existing) return reply.status(404).send({ error: true, message: 'Anuncio no encontrado' })

    const schema = z.object(adInputFields).partial()
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos', details: body.error.issues })

    if (body.data.targetInterests && body.data.targetInterests.length > 0) {
      const validSlugs = await getValidCategorySlugs()
      const invalid = body.data.targetInterests.filter((i) => !validSlugs.includes(i))
      if (invalid.length > 0) return reply.status(400).send({ error: true, message: `Rubro inválido: ${invalid[0]}` })
    }

    const phones = normalizeContactPhones(body.data)
    if (phones.error) return reply.status(400).send({ error: true, message: phones.error })

    const { categoryIds, startsAt, endsAt, ...adData } = body.data
    const ad = await prisma.ad.update({
      where: { id },
      data: {
        ...adData, ...phones, status: 'PENDING', rejectionNote: null,
        ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}),
        ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : null } : {}),
        ...(categoryIds ? { targetCategories: { deleteMany: {}, create: categoryIds.map((categoryId) => ({ categoryId })) } } : {}),
      },
      include: { targetCategories: { include: { category: true } } },
    })

    return reply.send({ ad, message: 'Anuncio actualizado. Vuelve a revisión antes de mostrarse.' })
  })

  app.patch('/:id/toggle-status', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const ad = await assertIsOwner(id, request.user.userId)
    if (!ad) return reply.status(404).send({ error: true, message: 'Anuncio no encontrado' })

    if (ad.status !== 'ACTIVE' && ad.status !== 'PAUSED') {
      return reply.status(400).send({ error: true, message: 'Solo se puede pausar o reanudar un anuncio activo' })
    }

    const newStatus = ad.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    const updated = await prisma.ad.update({ where: { id }, data: { status: newStatus } })
    return reply.send({ ad: updated })
  })

  app.post('/:adAccountId/recharge', { preHandler: requireAuth }, async (request, reply) => {
    const { adAccountId } = request.params as { adAccountId: string }
    const body = z.object({ amountUsd: z.number().min(20) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Monto mínimo: USD 20' })

    const account = await prisma.adAccount.update({
      where: { id: adAccountId },
      data: { balance: { increment: body.data.amountUsd }, lowBalanceNotifiedAt: null },
    })
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
