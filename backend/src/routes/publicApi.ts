import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { hashKey } from './apiKeys'

/**
 * API pública (plan Premium): "API para integrar calificaciones".
 * Las empresas Premium generan una key desde su panel y la usan para traer
 * su rating de Tratto a su propia web (widget, footer, lo que sea), sin login.
 *
 * Auth: header  Authorization: Bearer <key>   (o  X-API-Key: <key>)
 */
export default async function publicApiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers.authorization
    const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    const rawKey = bearerKey || (request.headers['x-api-key'] as string | undefined)

    if (!rawKey) {
      return reply.status(401).send({ error: true, message: 'Falta la API key (header Authorization: Bearer <key>)' })
    }

    const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hashKey(rawKey) } })
    if (!apiKey || !apiKey.isActive) {
      return reply.status(401).send({ error: true, message: 'API key inválida o revocada' })
    }

    // Reseteamos el contador si ya pasó un mes desde el último reset —
    // así el límite mensual es real y no se acumula para siempre.
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    let usageCount = apiKey.usageCount
    if (apiKey.usageResetAt < oneMonthAgo) {
      usageCount = 0
      await prisma.apiKey.update({ where: { id: apiKey.id }, data: { usageCount: 0, usageResetAt: new Date() } })
    }

    if (usageCount >= apiKey.monthlyLimit) {
      return reply.status(429).send({ error: true, message: `Límite mensual de ${apiKey.monthlyLimit} solicitudes alcanzado` })
    }

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
    })

    ;(request as any).apiKeyCompanyId = apiKey.companyId
    ;(request as any).apiKeyPlanTier = apiKey.planTier
  })

  // ─── Rating de MI empresa (la asociada a la key que estoy usando) ──────────
  app.get('/rating', async (request, reply) => {
    const companyId = (request as any).apiKeyCompanyId as string
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, slug: true, ratingAvg: true, reviewCount: true, isVerified: true, plan: true },
    })
    if (!company) return reply.status(404).send({ error: true, message: 'Empresa no encontrada' })

    return reply.send({
      company: company.name,
      slug: company.slug,
      rating: company.ratingAvg,
      reviewCount: company.reviewCount,
      verified: company.isVerified,
      profileUrl: `${process.env.FRONTEND_URL || 'https://tratto.lat'}/empresa/${company.slug}`,
    })
  })

  // ─── Reseñas y consultas — solo para keys de plan Enterprise ───────────────
  // La API "básica" (Premium) solo da el rating agregado; el detalle de reseñas
  // y consultas es más sensible/valioso, así que va con el escalón de arriba.
  app.addHook('preHandler', async (request, reply) => {
    const path = request.url.split('?')[0]
    if (path.endsWith('/reviews') || path.endsWith('/leads')) {
      if ((request as any).apiKeyPlanTier !== 'enterprise') {
        return reply.status(403).send({ error: true, message: 'Este endpoint requiere una API key de plan Enterprise' })
      }
    }
  })

  app.get('/reviews', async (request, reply) => {
    const companyId = (request as any).apiKeyCompanyId as string
    const reviews = await prisma.review.findMany({
      where: { companyId, status: 'APPROVED' },
      select: { id: true, rating: true, title: true, body: true, isVerified: true, createdAt: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return reply.send({ reviews })
  })

  app.get('/leads', async (request, reply) => {
    const companyId = (request as any).apiKeyCompanyId as string
    const leads = await prisma.lead.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, phone: true, message: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return reply.send({ leads })
  })
}
