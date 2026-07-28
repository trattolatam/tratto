import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { authRateLimit, passwordResetRateLimit } from '../middleware/rateLimits'
import { sendVerificationEmail, verifyEmailToken, resendVerificationEmail } from '../services/emailVerification'
import { requestPasswordReset, resetPasswordWithToken } from '../services/passwordReset'
import { INTERESTS } from '../constants/targeting'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  country: z.string().min(2),
  city: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['USER', 'BUSINESS']).default('USER'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export default async function authRoutes(app: FastifyInstance) {

  app.post('/register', { config: { rateLimit: authRateLimit } }, async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: true, message: 'Datos inválidos', details: body.error.issues })
    }

    const { email, password, name, country, city, phone, role } = body.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({ error: true, message: 'El email ya está registrado' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { email, passwordHash, name, country, city, phone, role },
      select: { id: true, email: true, name: true, role: true, country: true, createdAt: true, targetingAskedAt: true },
    })

    sendVerificationEmail(user.id, user.email, user.name).catch(err =>
      app.log.error(`Error enviando email de verificación: ${err.message}`)
    )

    // Si alguien lo había invitado a un equipo antes de que tuviera cuenta,
    // lo asociamos automáticamente ahora que se registró con ese mismo email.
    const pendingInvites = await prisma.teamInvite.findMany({ where: { email, status: 'PENDING' } })
    let joinedCompany: { id: string; name: string; slug: string; plan: string; isVerified: boolean; ratingAvg: number; reviewCount: number; logoUrl: string | null } | null = null
    let finalRole = user.role
    let companyRole: 'ADMIN' | 'EDITOR' | 'VIEWER' | undefined

    if (pendingInvites.length > 0) {
      for (const invite of pendingInvites) {
        await prisma.$transaction([
          prisma.companyMember.create({ data: { companyId: invite.companyId, userId: user.id, role: invite.role } }),
          prisma.teamInvite.update({ where: { id: invite.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } }),
        ])
      }
      // Necesita role BUSINESS para poder entrar al panel de la empresa, sin importar qué haya elegido al registrarse.
      if (user.role !== 'BUSINESS') {
        await prisma.user.update({ where: { id: user.id }, data: { role: 'BUSINESS' } })
        finalRole = 'BUSINESS'
      }
      const firstCompany = await prisma.company.findUnique({
        where: { id: pendingInvites[0].companyId },
        select: { id: true, name: true, slug: true, plan: true, isVerified: true, ratingAvg: true, reviewCount: true, logoUrl: true },
      })
      joinedCompany = firstCompany
      companyRole = pendingInvites[0].role
    }

    const token = app.jwt.sign(
      { userId: user.id, role: finalRole, companyId: joinedCompany?.id, companyRole },
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    return reply.status(201).send({
      user: { ...user, role: finalRole, company: joinedCompany },
      token,
      message: joinedCompany
        ? `Cuenta creada y sumada al equipo de ${joinedCompany.name}. Te enviamos un email para confirmar tu cuenta.`
        : 'Cuenta creada. Te enviamos un email para confirmar tu cuenta.',
    })
  })

  app.post('/login', { config: { rateLimit: authRateLimit } }, async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: true, message: 'Datos inválidos' })
    }

    const { email, password } = body.data

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: { select: { id: true, name: true, slug: true, plan: true, isVerified: true, ratingAvg: true, reviewCount: true, logoUrl: true } },
      },
    })

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(401).send({ error: true, message: 'Credenciales incorrectas' })
    }

    // Si no es dueño de ninguna empresa, puede ser un miembro de equipo invitado
    // (plan Enterprise) — en ese caso, su acceso es a la empresa que lo invitó,
    // con el rol que le hayan asignado (no acceso total como el dueño).
    let effectiveCompany = user.company
    let companyRole: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | undefined = user.company ? 'OWNER' : undefined
    if (!effectiveCompany) {
      const membership = await prisma.companyMember.findFirst({
        where: { userId: user.id },
        include: { company: { select: { id: true, name: true, slug: true, plan: true, isVerified: true, ratingAvg: true, reviewCount: true, logoUrl: true } } },
      })
      if (membership) { effectiveCompany = membership.company; companyRole = membership.role }
    }

    const token = app.jwt.sign(
      { userId: user.id, role: user.role, companyId: effectiveCompany?.id, companyRole },
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    return reply.send({
      user: {
        id: user.id, email: user.email, name: user.name, role: user.role,
        country: user.country, city: user.city, phone: user.phone, avatarUrl: user.avatarUrl,
        isVerified: user.isVerified, isPro: user.isPro, company: effectiveCompany, companyRole, targetingAskedAt: user.targetingAskedAt,
      },
      token,
    })
  })

  app.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    const me = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: {
        id: true, email: true, name: true, role: true,
        country: true, city: true, phone: true, avatarUrl: true,
        isVerified: true, isPro: true, createdAt: true, targetingAskedAt: true,
        company: {
          select: { id: true, name: true, slug: true, plan: true, isVerified: true, ratingAvg: true, reviewCount: true, logoUrl: true },
        },
      },
    })

    if (!me) return reply.status(404).send({ error: true, message: 'Usuario no encontrado' })

    // Mismo fallback que en /login: si no es dueño, puede ser miembro de un equipo Enterprise
    let company = me.company
    let companyRole: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | undefined = me.company ? 'OWNER' : undefined
    if (!company) {
      const membership = await prisma.companyMember.findFirst({
        where: { userId: me.id },
        include: { company: { select: { id: true, name: true, slug: true, plan: true, isVerified: true, ratingAvg: true, reviewCount: true, logoUrl: true } } },
      })
      if (membership) { company = membership.company; companyRole = membership.role }
    }

    return reply.send({ user: { ...me, company, companyRole } })
  })

  app.get('/verify-email', async (request, reply) => {
    const query = z.object({ token: z.string() }).safeParse(request.query)
    if (!query.success) return reply.status(400).send({ error: true, message: 'Token requerido' })

    const result = await verifyEmailToken(query.data.token)
    if (!result.success) return reply.status(400).send({ error: true, message: result.message })

    return reply.send({ message: result.message })
  })

  app.post('/resend-verification', { config: { rateLimit: passwordResetRateLimit } }, async (request, reply) => {
    const body = z.object({ email: z.string().email() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Email inválido' })

    const result = await resendVerificationEmail(body.data.email)
    return reply.send({ message: result.message })
  })

  app.post('/forgot-password', { config: { rateLimit: passwordResetRateLimit } }, async (request, reply) => {
    const body = z.object({ email: z.string().email() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Email inválido' })

    const result = await requestPasswordReset(body.data.email)
    return reply.send({ message: result.message })
  })

  app.post('/reset-password', { config: { rateLimit: passwordResetRateLimit } }, async (request, reply) => {
    const body = z.object({ token: z.string().min(1), newPassword: z.string().min(8) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos', details: body.error.issues })

    const result = await resetPasswordWithToken(body.data.token, body.data.newPassword)
    if (!result.success) return reply.status(400).send({ error: true, message: result.message })

    return reply.send({ message: result.message })
  })

  app.patch('/me', { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(2).optional(),
      phone: z.string().optional(),
      city: z.string().optional(),
      country: z.string().min(2).optional(),
    }).safeParse(request.body)

    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos', details: body.error.issues })

    const updated = await prisma.user.update({
      where: { id: request.user.userId },
      data: body.data,
      select: {
        id: true, email: true, name: true, role: true,
        country: true, city: true, phone: true, avatarUrl: true,
        isVerified: true, isPro: true, createdAt: true,
      },
    })

    return reply.send({ user: updated })
  })

  // ─── Datos de segmentación para publicidad (opcionales, post-registro) ─────
  // Se guarda "targetingAskedAt" siempre que se llame, aunque el usuario no
  // haya completado ningún campo — así "saltear" también cuenta como visto
  // y no le volvemos a mostrar la pantalla la próxima vez que entre.
  app.patch('/targeting', { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({
      ageRange: z.enum(['R18_24', 'R25_34', 'R35_44', 'R45_54', 'R55_64', 'R65_PLUS']).optional(),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
      interests: z.array(z.string()).max(INTERESTS.length).optional(),
      incomeLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'PREFER_NOT_TO_SAY']).optional(),
    }).safeParse(request.body)

    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos', details: body.error.issues })

    if (body.data.interests) {
      const invalid = body.data.interests.filter((i) => !(INTERESTS as readonly string[]).includes(i))
      if (invalid.length > 0) return reply.status(400).send({ error: true, message: `Interés inválido: ${invalid[0]}` })
    }

    const updated = await prisma.user.update({
      where: { id: request.user.userId },
      data: { ...body.data, targetingAskedAt: new Date() },
      select: { id: true, ageRange: true, gender: true, interests: true, incomeLevel: true },
    })

    return reply.send({ user: updated })
  })

  // ─── Solo marcar como "ya visto" sin guardar nada — para cuando el usuario saltea todo ──
  app.post('/targeting/skip', { preHandler: requireAuth }, async (request, reply) => {
    await prisma.user.update({ where: { id: request.user.userId }, data: { targetingAskedAt: new Date() } })
    return reply.send({ ok: true })
  })

  app.post('/change-password', { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8),
    }).safeParse(request.body)

    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos' })

    const existingUser = await prisma.user.findUnique({ where: { id: request.user.userId } })
    if (!existingUser || !(await bcrypt.compare(body.data.currentPassword, existingUser.passwordHash))) {
      return reply.status(401).send({ error: true, message: 'Contraseña actual incorrecta' })
    }

    const newHash = await bcrypt.hash(body.data.newPassword, 12)
    await prisma.user.update({ where: { id: existingUser.id }, data: { passwordHash: newHash } })

    return reply.send({ message: 'Contraseña actualizada correctamente' })
  })
}
