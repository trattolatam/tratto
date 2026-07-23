import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'

export interface JwtPayload {
  userId: string
  role: string
  companyId?: string
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ error: true, message: 'Token inválido o expirado' })
  }
}

export async function requireVerifiedEmail(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const payload = request.user as JwtPayload
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { isVerified: true } })
    if (!user?.isVerified) {
      return reply.status(403).send({
        error: true,
        message: 'Confirmá tu email antes de continuar. Revisá tu casilla de entrada (y spam).',
        emailNotVerified: true,
      })
    }
  } catch {
    reply.status(401).send({ error: true, message: 'Token inválido o expirado' })
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const payload = request.user as JwtPayload
    if (payload.role !== 'ADMIN') {
      return reply.status(403).send({ error: true, message: 'Acceso denegado' })
    }
  } catch {
    reply.status(401).send({ error: true, message: 'Token inválido o expirado' })
  }
}

export async function requireBusinessOwner(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const payload = request.user as JwtPayload
    if (payload.role !== 'BUSINESS' && payload.role !== 'ADMIN') {
      return reply.status(403).send({ error: true, message: 'Solo empresas pueden acceder' })
    }
  } catch {
    reply.status(401).send({ error: true, message: 'Token inválido o expirado' })
  }
}

export function requirePlan(minPlan: 'PROFESSIONAL' | 'PREMIUM' | 'ENTERPRISE') {
  const planHierarchy = { FREE: 0, PROFESSIONAL: 1, PREMIUM: 2, ENTERPRISE: 3 }

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      const payload = request.user as JwtPayload

      if (!payload.companyId) {
        return reply.status(403).send({ error: true, message: 'Sin empresa asociada' })
      }

      const company = await prisma.company.findUnique({
        where: { id: payload.companyId },
        select: { plan: true },
      })

      if (!company || planHierarchy[company.plan] < planHierarchy[minPlan]) {
        return reply.status(403).send({
          error: true,
          message: `Esta función requiere el plan ${minPlan}`,
          upgradeRequired: true,
          currentPlan: company?.plan,
          requiredPlan: minPlan,
        })
      }
    } catch {
      reply.status(401).send({ error: true, message: 'Token inválido o expirado' })
    }
  }
}

// ─── Declaración de tipos para @fastify/jwt ───────────────────────────────────
// Este es el mecanismo correcto que provee fastify-jwt para tipar request.user,
// en lugar de redeclarar la propiedad directamente en FastifyRequest.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JwtPayload
  }
}
