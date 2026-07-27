import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { authRateLimit, passwordResetRateLimit } from '../middleware/rateLimits'
import { sendVerificationEmail, verifyEmailToken, resendVerificationEmail } from '../services/emailVerification'
import { requestPasswordReset, resetPasswordWithToken } from '../services/passwordReset'

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
      select: { id: true, email: true, name: true, role: true, country: true, createdAt: true },
    })

    sendVerificationEmail(user.id, user.email, user.name).catch(err =>
      app.log.error(`Error enviando email de verificación: ${err.message}`)
    )

    const token = app.jwt.sign(
      { userId: user.id, role: user.role },
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    return reply.status(201).send({
      user,
      token,
      message: 'Cuenta creada. Te enviamos un email para confirmar tu cuenta.',
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
    // (plan Enterprise) — en ese caso, su acceso es a la empresa que lo invitó.
    let effectiveCompany = user.company
    if (!effectiveCompany) {
      const membership = await prisma.companyMember.findFirst({
        where: { userId: user.id },
        include: { company: { select: { id: true, name: true, slug: true, plan: true, isVerified: true, ratingAvg: true, reviewCount: true, logoUrl: true } } },
      })
      if (membership) effectiveCompany = membership.company
    }

    const token = app.jwt.sign(
      { userId: user.id, role: user.role, companyId: effectiveCompany?.id },
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    return reply.send({
      user: {
        id: user.id, email: user.email, name: user.name, role: user.role,
        country: user.country, city: user.city, phone: user.phone, avatarUrl: user.avatarUrl,
        isVerified: user.isVerified, isPro: user.isPro, company: effectiveCompany,
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
        isVerified: true, isPro: true, createdAt: true,
        company: {
          select: { id: true, name: true, slug: true, plan: true, isVerified: true, ratingAvg: true, reviewCount: true, logoUrl: true },
        },
      },
    })

    if (!me) return reply.status(404).send({ error: true, message: 'Usuario no encontrado' })

    // Mismo fallback que en /login: si no es dueño, puede ser miembro de un equipo Enterprise
    let company = me.company
    if (!company) {
      const membership = await prisma.companyMember.findFirst({
        where: { userId: me.id },
        include: { company: { select: { id: true, name: true, slug: true, plan: true, isVerified: true, ratingAvg: true, reviewCount: true, logoUrl: true } } },
      })
      if (membership) company = membership.company
    }

    return reply.send({ user: { ...me, company } })
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
