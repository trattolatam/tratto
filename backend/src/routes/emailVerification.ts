import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { verifyEmailToken, resendVerificationEmail } from '../services/emailVerification'
import { passwordResetRateLimit } from '../middleware/rateLimits'

export async function emailVerificationRoutes(app: FastifyInstance) {

  // ─── GET /api/auth/verify-email?token=xxx ─────────────────────────────────
  app.get('/verify-email', async (request, reply) => {
    const query = z.object({ token: z.string() }).safeParse(request.query)
    if (!query.success) {
      return reply.status(400).send({ error: true, message: 'Token requerido' })
    }

    const result = await verifyEmailToken(query.data.token)

    if (!result.success) {
      return reply.status(400).send({ error: true, message: result.message })
    }

    return reply.send({ message: result.message })
  })

  // ─── POST /api/auth/resend-verification ───────────────────────────────────
  // Rate limit estricto: máximo 3 cada 30 minutos por IP
  app.post('/resend-verification', {
    config: { rateLimit: passwordResetRateLimit },
  }, async (request, reply) => {
    const body = z.object({ email: z.string().email() }).safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: true, message: 'Email inválido' })
    }

    const result = await resendVerificationEmail(body.data.email)
    return reply.send({ message: result.message })
  })
}
