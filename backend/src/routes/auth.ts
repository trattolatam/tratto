import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../index'
import { requireAuth } from '../middleware/auth'
import { authRateLimit, passwordResetRateLimit } from '../middleware/rateLimits'
import { sendVerificationEmail, verifyEmailToken, resendVerificationEmail } from '../services/emailVerification'

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
        company: { select: { id: true, name: true, plan: true, isVerified: true } },
      },
    })

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(401).send({ error: true, message: 'Credenciales incorrectas' })
    }

    const token = app.jwt.sign(
      { userId: user.id, role: user.role, companyId: user.company?.id },
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    return reply.send({
      user: {
        id: user.id, email: user.email, name: user.name, role: user.role,
        country: user.country, isVerified: user.isVerified, company: user.company,
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
          select: { id: true, name: true, slug: true, plan: true, isVerified: true, ratingAvg: true, reviewCount: true },
        },
      },
    })

    if (!me) return reply.status(404).send({ error: true, message: 'Usuario no encontrado' })
    return reply.send({ user: me })
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
