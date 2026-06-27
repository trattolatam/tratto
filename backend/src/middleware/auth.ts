import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../index'

export interface JwtPayload {
  userId: string
  role: string
  companyId?: string
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<JwtPayload>()
    request.user = payload
  } catch {
    reply.status(401).send({ error: true, message: 'Token inválido o expirado' })
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<JwtPayload>()
    if (payload.role !== 'ADMIN') {
      return reply.status(403).send({ error: true, message: 'Acceso denegado' })
    }
    request.user = payload
  } catch {
    reply.status(401).send({ error: true, message: 'Token inválido o expirado' })
  }
}

export async function requireBusinessOwner(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<JwtPayload>()
    if (payload.role !== 'BUSINESS' && payload.role !== 'ADMIN') {
      return reply.status(403).send({ error: true, message: 'Solo empresas pueden acceder' })
    }
    request.user = payload
  } catch {
    reply.status(401).send({ error: true, message: 'Token inválido o expirado' })
  }
}

export function requirePlan(minPlan: 'PROFESSIONAL' | 'PREMIUM' | 'ENTERPRISE') {
  const planHierarchy = { FREE: 0, PROFESSIONAL: 1, PREMIUM: 2, ENTERPRISE: 3 }

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await request.jwtVerify<JwtPayload>()
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

      request.user = payload
    } catch {
      reply.status(401).send({ error: true, message: 'Token inválido o expirado' })
    }
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload
  }
}
