import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'

export interface JwtPayload {
  userId: string
  role: string
  companyId?: string
  companyRole?: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER'
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

// Admin o colaborador — para moderación y tareas del día a día del panel.
// Las acciones más sensibles (gestionar colaboradores, ingresos, suspender
// empresas) siguen exigiendo requireAdmin además de este middleware.
export async function requireStaff(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const payload = request.user as JwtPayload
    if (payload.role !== 'ADMIN' && payload.role !== 'COLLABORATOR') {
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

// ─── Permisos por rol dentro del equipo (plan Enterprise) ─────────────────────
// El dueño de la empresa (companyRole = OWNER, o sin CompanyMember en absoluto)
// siempre tiene acceso total. Para el resto, el rol viene grabado en el JWT desde
// el login — ATENCIÓN: si el dueño le cambia el rol a alguien, esa persona sigue
// con el rol viejo hasta que vuelva a iniciar sesión (limitación conocida de JWT).
const COMPANY_ROLE_RANK = { VIEWER: 0, EDITOR: 1, ADMIN: 2, OWNER: 3 } as const

export function requireCompanyRank(minRank: keyof typeof COMPANY_ROLE_RANK) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      const payload = request.user as JwtPayload
      if (payload.role !== 'BUSINESS' && payload.role !== 'ADMIN') {
        return reply.status(403).send({ error: true, message: 'Solo empresas pueden acceder' })
      }
      // Sin companyRole grabado (cuentas viejas, o el dueño mismo) = acceso total.
      const myRank = payload.companyRole ? COMPANY_ROLE_RANK[payload.companyRole] : COMPANY_ROLE_RANK.OWNER
      if (myRank < COMPANY_ROLE_RANK[minRank]) {
        return reply.status(403).send({ error: true, message: 'Tu rol en el equipo no tiene permiso para hacer esto' })
      }
    } catch {
      reply.status(401).send({ error: true, message: 'Token inválido o expirado' })
    }
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

      // dLocal Go no tiene cobro recurrente automático (es un pago único por período),
      // así que acá chequeamos en vivo si ya venció — si no lo hiciéramos, una empresa
      // que pagó una sola vez se quedaría con el plan Pro gratis para siempre.
      // Stripe no necesita este chequeo: sus webhooks mantienen el plan al día solos.
      const sub = await prisma.subscription.findUnique({ where: { companyId: payload.companyId } })
      if (sub && sub.provider === 'DLOCALGO' && sub.status === 'ACTIVE' && sub.currentPeriodEnd < new Date()) {
        await prisma.$transaction([
          prisma.subscription.update({ where: { companyId: payload.companyId }, data: { status: 'CANCELLED' } }),
          prisma.company.update({ where: { id: payload.companyId }, data: { plan: 'FREE' } }),
        ])
        return reply.status(403).send({
          error: true,
          message: `Tu plan ${minPlan} venció. Renová tu suscripción para seguir usando esta función.`,
          upgradeRequired: true,
          currentPlan: 'FREE',
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
