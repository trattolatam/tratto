import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { requireAdmin, requireStaff } from '../middleware/auth'
import { cancelSubscriptionImmediately } from '../services/payments/stripe'
import { notifyStaff } from '../services/notifications'
import { sendStaffInviteEmail } from '../services/staffInvite'

export default async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireStaff)

  app.get('/dashboard', async (request, reply) => {
    const isFullAdmin = request.user.role === 'ADMIN'
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [totalCompanies, newCompaniesMonth, totalUsers, newUsersMonth, pendingReviews, reportedReviews, pendingAds, activeSubscriptions, totalReviews, verifiedReviews, pendingDisputes, pendingCategorySuggestions] = await Promise.all([
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
      prisma.claimDispute.count({ where: { status: 'PENDING' } }),
      prisma.categorySuggestion.count({ where: { status: 'PENDING' } }),
    ])

    const subscriptions = await prisma.subscription.findMany({ where: { status: 'ACTIVE' }, select: { amountUsd: true } })
    const mrr = subscriptions.reduce((sum, s) => sum + s.amountUsd, 0)

    const recentReviews = await prisma.review.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: 'desc' }, take: 10,
      include: { company: { select: { name: true, id: true } }, user: { select: { name: true } } },
    })

    const recentClaims = await prisma.company.findMany({
      where: { claimedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { claimedAt: 'desc' }, take: 10,
      select: { id: true, name: true, claimedAt: true, owner: { select: { name: true, email: true } } },
    })

    const recentActivity = [
      ...recentReviews.map((r) => ({ type: 'review' as const, id: r.id, date: r.createdAt, user: r.user, company: r.company })),
      ...recentClaims.map((c) => ({ type: 'claim' as const, id: c.id, date: c.claimedAt as Date, user: c.owner, company: { id: c.id, name: c.name } })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10)

    return reply.send({
      stats: {
        pendingReviews, reportedReviews, pendingAds, totalReviews, verifiedReviews,
        verifiedPct: totalReviews > 0 ? Math.round((verifiedReviews / totalReviews) * 100) : 0,
        pendingDisputes, pendingCategorySuggestions, newUsersMonth,
        // MRR, suscripciones y datos de empresas son solo para administradores plenos —
        // los colaboradores tienen acceso de moderación, sin ver ingresos ni gestionar empresas.
        ...(isFullAdmin ? { totalCompanies, newCompaniesMonth, totalUsers, activeSubscriptions, mrr: Math.round(mrr) } : {}),
      },
      recentActivity,
    })
  })

  // Conteos livianos para mostrar badges (navbar, pestañas) sin traer todo el dashboard.
  app.get('/pending-counts', async (_request, reply) => {
    const [pendingReviews, reportedReviews, pendingAds, pendingDisputes, pendingCategorySuggestions] = await Promise.all([
      prisma.review.count({ where: { status: 'PENDING' } }),
      prisma.review.count({ where: { status: 'REPORTED' } }),
      prisma.ad.count({ where: { status: 'PENDING' } }),
      prisma.claimDispute.count({ where: { status: 'PENDING' } }),
      prisma.categorySuggestion.count({ where: { status: 'PENDING' } }),
    ])
    const total = pendingReviews + reportedReviews + pendingAds + pendingDisputes + pendingCategorySuggestions
    return reply.send({ pendingReviews, reportedReviews, pendingAds, pendingDisputes, pendingCategorySuggestions, total })
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

  app.get('/companies', { preHandler: requireAdmin }, async (request, reply) => {
    const query = z.object({
      plan: z.enum(['FREE', 'PROFESSIONAL', 'PREMIUM', 'ENTERPRISE']).optional(),
      verified: z.string().optional(), country: z.string().optional(), search: z.string().optional(), page: z.string().default('1'),
      sort: z.enum(['recent', 'claimed']).optional().default('recent'),
      boosted: z.string().optional(), leadsMonth: z.string().optional(),
    }).parse(request.query)

    const page = parseInt(query.page), limit = 25
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const where: any = {}
    if (query.plan) where.plan = query.plan
    if (query.verified === 'true') where.isVerified = true
    if (query.verified === 'false') where.isVerified = false
    if (query.country) where.country = query.country
    if (query.search) where.OR = [{ name: { contains: query.search, mode: 'insensitive' } }, { taxId: { contains: query.search } }]
    if (query.sort === 'claimed') where.claimedById = { not: null }
    if (query.boosted === 'true') where.boosts = { some: { isActive: true } }
    if (query.leadsMonth === 'true') where.leads = { some: { chargedAt: { gte: startOfMonth } } }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: query.sort === 'claimed' ? { claimedAt: 'desc' } : { createdAt: 'desc' },
        include: {
          category: { select: { name: true, emoji: true } }, owner: { select: { name: true, email: true } },
          _count: {
            select: {
              reviews: true,
              leads: query.leadsMonth === 'true' ? { where: { chargedAt: { gte: startOfMonth } } } : true,
              boosts: query.boosted === 'true' ? { where: { isActive: true } } : true,
            },
          },
        },
      }),
      prisma.company.count({ where }),
    ])

    return reply.send({ companies, pagination: { page, limit, total } })
  })

  app.patch('/companies/:id/verify', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({ verified: z.boolean() }).parse(request.body)
    const existing = await prisma.company.findUnique({ where: { id }, select: { claimedById: true } })
    if (!existing) return reply.status(404).send({ error: true, message: 'Empresa no encontrada' })
    if (body.verified && !existing.claimedById) {
      return reply.status(400).send({ error: true, message: 'No se puede verificar una empresa que nadie reclamó todavía' })
    }
    const company = await prisma.company.update({
      where: { id },
      data: { isVerified: body.verified, verifiedAt: body.verified ? new Date() : null, plan: body.verified ? 'PROFESSIONAL' : undefined },
    })
    return reply.send({ company, message: body.verified ? 'Empresa verificada' : 'Verificación removida' })
  })

  app.patch('/companies/:id/suspend', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.review.updateMany({ where: { companyId: id, status: 'APPROVED' }, data: { status: 'REJECTED' } })

    // Si tenía una suscripción paga activa, la cortamos acá mismo — no tiene sentido
    // suspender a una empresa en la plataforma y seguir cobrándole por atrás.
    const sub = await prisma.subscription.findUnique({ where: { companyId: id } })
    if (sub && sub.status !== 'CANCELLED') {
      if (sub.provider === 'STRIPE') {
        await cancelSubscriptionImmediately(id)
      } else {
        await prisma.subscription.update({ where: { companyId: id }, data: { status: 'CANCELLED' } })
      }
    }

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

  // ─── Rubros sugeridos por empresas (categoría nueva que no existía) ───────
  app.get('/category-suggestions', async (request, reply) => {
    const query = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING') }).parse(request.query)
    const suggestions = await prisma.categorySuggestion.findMany({
      where: { status: query.status },
      orderBy: { createdAt: 'asc' },
      include: { company: { select: { id: true, name: true, slug: true, city: true, country: true, category: { select: { name: true, slug: true } } } } },
    })
    return reply.send({ suggestions })
  })

  app.post('/category-suggestions/:id/resolve', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({ action: z.enum(['approve', 'reject']), categoryId: z.string().uuid().optional(), emoji: z.string().min(1).max(4).optional() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos' })

    const suggestion = await prisma.categorySuggestion.findUnique({ where: { id } })
    if (!suggestion) return reply.status(404).send({ error: true, message: 'Sugerencia no encontrada' })
    if (suggestion.status !== 'PENDING') return reply.status(400).send({ error: true, message: 'Esta sugerencia ya fue resuelta' })

    if (body.data.action === 'approve') {
      let categoryId = body.data.categoryId

      if (!categoryId) {
        // Sin elegir una categoría existente: se crea una nueva con el nombre
        // que sugirió la empresa. Reutiliza el slug si por casualidad ya
        // existe una igual (evita duplicados con el mismo nombre).
        const slug = suggestion.suggestedName.toLowerCase().normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const category = await prisma.category.upsert({
          where: { slug },
          update: {},
          create: { name: suggestion.suggestedName, slug, emoji: body.data.emoji || '🏷️', isHidden: false },
        })
        categoryId = category.id
      }

      await prisma.company.update({ where: { id: suggestion.companyId }, data: { categoryId } })
    }

    const updated = await prisma.categorySuggestion.update({
      where: { id },
      data: { status: body.data.action === 'approve' ? 'APPROVED' : 'REJECTED', reviewedAt: new Date() },
    })

    return reply.send({ suggestion: updated })
  })

  // ─── Gestión de categorías (activar fase 2, ícono, etc.) — solo ADMIN ───
  app.get('/categories', { preHandler: requireAdmin }, async (_request, reply) => {
    const categories = await prisma.category.findMany({
      orderBy: [{ phase: 'asc' }, { priority: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { companies: true } } },
    })
    return reply.send({ categories })
  })

  app.post('/categories', { preHandler: requireAdmin }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(2), emoji: z.string().min(1).max(4),
      phase: z.number().int().min(1).max(9).default(1),
      isHidden: z.boolean().default(false), priority: z.boolean().default(false),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: body.error.issues[0]?.message || 'Datos inválidos' })

    const { name, emoji, phase, isHidden, priority } = body.data
    const baseSlug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    if (!baseSlug) return reply.status(400).send({ error: true, message: 'Ese nombre no genera una URL válida — probá con otro' })

    // Si el slug ya existe (nombre repetido o muy parecido), le suma un número
    // en vez de fallar con un error de la base que no diría nada al admin.
    let slug = baseSlug
    let n = 2
    while (await prisma.category.findUnique({ where: { slug } })) { slug = `${baseSlug}-${n}`; n++ }

    const category = await prisma.category.create({ data: { name, slug, emoji, phase, isHidden, priority } })
    return reply.send({ category: { ...category, _count: { companies: 0 } } })
  })

  app.patch('/categories/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({
      emoji: z.string().min(1).max(4).optional(),
      isHidden: z.boolean().optional(),
      phase: z.number().int().min(1).max(9).optional(),
      priority: z.boolean().optional(),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos' })

    const updated = await prisma.category.update({ where: { id }, data: body.data })
    return reply.send({ category: updated })
  })

  app.get('/revenue', { preHandler: requireAdmin }, async (_request, reply) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [subscriptionsByPlan, adsMonthRevenueAgg, leadsRevenue, boostsRevenue] = await Promise.all([
      prisma.subscription.groupBy({ by: ['plan'], where: { status: 'ACTIVE' }, _count: true, _sum: { amountUsd: true } }),
      prisma.adEvent.aggregate({ where: { createdAt: { gte: startOfMonth }, costUsd: { not: null } }, _sum: { costUsd: true } }),
      prisma.lead.aggregate({ where: { chargedAt: { gte: startOfMonth } }, _sum: { amountUsd: true }, _count: true }),
      prisma.profileBoost.count({ where: { createdAt: { gte: startOfMonth }, isActive: true } }),
    ])

    const mrr = subscriptionsByPlan.reduce((sum, s) => sum + (s._sum.amountUsd || 0), 0)
    const adsMonthRevenue = adsMonthRevenueAgg._sum.costUsd || 0

    return reply.send({
      subscriptions: subscriptionsByPlan, mrr: Math.round(mrr), arr: Math.round(mrr * 12), adsRevenue: Math.round(adsMonthRevenue),
      leadsRevenue: leadsRevenue._sum.amountUsd || 0, leadsCount: leadsRevenue._count, boostsCount: boostsRevenue,
      totalMonthRevenue: Math.round(mrr + adsMonthRevenue + (leadsRevenue._sum.amountUsd || 0)),
    })
  })

  // ─── Administradores y colaboradores del panel (solo un ADMIN puede tocar esto) ───
  app.get('/staff', { preHandler: requireAdmin }, async (_request, reply) => {
    const staff = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'COLLABORATOR'] } },
      select: { id: true, name: true, email: true, role: true, createdAt: true, staffInviteExpiresAt: true, staffActivatedAt: true },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    })
    // "Pendiente" = todavía tiene una invitación sin consumir (le mandamos el
    // email de activación y no entró todavía). Se limpia sola al activar.
    const withStatus = staff.map((s) => ({ ...s, pending: !!s.staffInviteExpiresAt }))
    return reply.send({ staff: withStatus })
  })

  app.post('/staff', { preHandler: requireAdmin }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(2), email: z.string().email(), role: z.enum(['ADMIN', 'COLLABORATOR']),
      country: z.string().min(2), phone: z.string().optional(),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: body.error.issues[0]?.message || 'Datos inválidos' })

    const { name, email, role, country, phone } = body.data
    const roleLabel = role === 'ADMIN' ? 'administrador' : 'colaborador'

    const existing = await prisma.user.findUnique({ where: { email } })

    if (existing) {
      if (existing.role === 'ADMIN' || existing.role === 'COLLABORATOR') {
        return reply.status(409).send({ error: true, message: 'Esa persona ya es administrador o colaborador' })
      }
      // Ya tenía cuenta en Tratto (como usuario o empresa) — le damos acceso directo,
      // ya puede entrar con su contraseña de siempre, sin necesitar activación.
      const updated = await prisma.user.update({ where: { id: existing.id }, data: { role } })
      notifyStaff(
        `Te agregaron como ${roleLabel} en Tratto`,
        `<p style="font-size:16px;color:#0f172a;margin:0 0 12px;">Ahora sos ${roleLabel} de Tratto</p>
         <p style="font-size:14px;color:#475569;margin:0 0 20px;">Ya podés entrar al panel de administrador con tu cuenta (${existing.email}) y empezar a moderar.</p>`,
        { onlyEmails: [existing.email] }
      ).catch(() => {})
      return reply.send({
        user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, pending: false },
        message: `${updated.name} ya tenía cuenta en Tratto — le dimos acceso directo, ya puede entrar al panel.`,
      })
    }

    // No tenía cuenta — la creamos con los datos que cargaste, sin contraseña
    // utilizable todavía (nadie la conoce), y le mandamos el link para que
    // active la cuenta eligiendo la suya propia.
    const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12)
    const created = await prisma.user.create({
      data: { name, email, country, phone, role, passwordHash: placeholderHash, isVerified: true, staffInvitedById: request.user.userId },
    })

    await sendStaffInviteEmail(created.id, created.email, created.name, roleLabel).catch((err) => app.log.error(`Error enviando invitación de staff: ${err.message}`))

    return reply.send({
      user: { id: created.id, name: created.name, email: created.email, role: created.role, pending: true },
      message: `Le mandamos un email a ${created.email} para que active su cuenta.`,
    })
  })

  app.post('/staff/:id/resend-invite', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || (target.role !== 'ADMIN' && target.role !== 'COLLABORATOR')) {
      return reply.status(404).send({ error: true, message: 'No encontrado' })
    }
    if (!target.staffInviteExpiresAt) {
      return reply.status(400).send({ error: true, message: 'Esa cuenta ya está activa, no tiene una invitación pendiente' })
    }
    const roleLabel = target.role === 'ADMIN' ? 'administrador' : 'colaborador'
    await sendStaffInviteEmail(target.id, target.email, target.name, roleLabel)
    return reply.send({ message: `Invitación reenviada a ${target.email}` })
  })

  app.patch('/staff/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({ role: z.enum(['ADMIN', 'COLLABORATOR']) }).parse(request.body)

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || (target.role !== 'ADMIN' && target.role !== 'COLLABORATOR')) {
      return reply.status(404).send({ error: true, message: 'No encontrado' })
    }
    if (target.role === 'ADMIN' && body.role === 'COLLABORATOR') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) return reply.status(400).send({ error: true, message: 'No podés dejar a Tratto sin ningún administrador' })
    }

    const updated = await prisma.user.update({ where: { id }, data: { role: body.role } })
    return reply.send({ user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role } })
  })

  app.delete('/staff/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || (target.role !== 'ADMIN' && target.role !== 'COLLABORATOR')) {
      return reply.status(404).send({ error: true, message: 'No encontrado' })
    }
    if (target.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) return reply.status(400).send({ error: true, message: 'No podés dejar a Tratto sin ningún administrador' })
    }

    await prisma.user.update({ where: { id }, data: { role: 'USER' } })
    return reply.send({ message: 'Acceso removido' })
  })
}
