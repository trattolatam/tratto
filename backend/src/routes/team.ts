import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireBusinessOwner, requirePlan, JwtPayload } from '../middleware/auth'
import { sendNotification, buildTeamInviteEmailHtml } from '../services/notifications'

/**
 * Equipo — varias personas manejando el mismo perfil de empresa (plan Enterprise).
 * El dueño original (Company.claimedById) sigue siendo el dueño de siempre; esto
 * es para las personas ADICIONALES que invita: por ejemplo, alguien de atención
 * al cliente que solo necesita responder reseñas, sin acceso a facturación.
 *
 * Roles:
 * - ADMIN: todo lo que hace el dueño, salvo invitar/sacar gente del equipo
 * - EDITOR: puede responder reseñas y ver consultas, no administra nada
 * - VIEWER: solo puede ver el panel, sin tocar nada
 *
 * Simplificación a propósito: la persona invitada tiene que YA tener una cuenta
 * de Tratto con ese email. No armamos un flujo de invitación por link para
 * cuentas nuevas todavía — si hace falta más adelante, se agrega aparte.
 */
export default async function teamRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireBusinessOwner)
  app.addHook('preHandler', requirePlan('ENTERPRISE'))

  async function isOwner(companyId: string, userId: string): Promise<boolean> {
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { claimedById: true } })
    return company?.claimedById === userId
  }

  // ─── Listar el equipo (dueño + miembros invitados) ──────────────────────────
  app.get('/', async (request, reply) => {
    const { companyId } = request.user as JwtPayload
    if (!companyId) return reply.status(400).send({ error: true, message: 'Sin empresa asociada' })

    const [company, members] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { owner: { select: { id: true, name: true, email: true } } } }),
      prisma.companyMember.findMany({ where: { companyId }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { invitedAt: 'asc' } }),
    ])

    return reply.send({
      owner: company?.owner,
      members: members.map((m: typeof members[number]) => ({ id: m.id, user: m.user, role: m.role, invitedAt: m.invitedAt })),
    })
  })

  // ─── Invitar a alguien al equipo ─────────────────────────────────────────────
  app.post('/', async (request, reply) => {
    const { companyId, userId } = request.user as JwtPayload
    if (!companyId) return reply.status(400).send({ error: true, message: 'Sin empresa asociada' })
    if (!(await isOwner(companyId, userId))) {
      return reply.status(403).send({ error: true, message: 'Solo el dueño de la empresa puede invitar gente al equipo' })
    }

    const body = z.object({ email: z.string().email(), role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).default('EDITOR') }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos' })

    const invitedUser = await prisma.user.findUnique({ where: { email: body.data.email } })
    if (!invitedUser) {
      return reply.status(404).send({ error: true, message: 'Esa persona todavía no tiene una cuenta en Tratto. Pedile que se registre primero.' })
    }
    if (invitedUser.id === userId) {
      return reply.status(400).send({ error: true, message: 'Ya sos el dueño de esta empresa' })
    }

    const existing = await prisma.companyMember.findUnique({ where: { companyId_userId: { companyId, userId: invitedUser.id } } })
    if (existing) return reply.status(409).send({ error: true, message: 'Esa persona ya está en tu equipo' })

    const member = await prisma.companyMember.create({
      data: { companyId, userId: invitedUser.id, role: body.data.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } })
    const inviter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    const loginUrl = `${process.env.FRONTEND_URL || 'https://tratto.lat'}/login`
    await sendNotification({
      userId: invitedUser.id, type: 'TEAM_INVITE',
      title: `Te sumaron al equipo de ${company?.name} en Tratto`,
      body: `${inviter?.name} te sumó al equipo de ${company?.name} en Tratto. Ahora tenés acceso al panel como ${body.data.role.toLowerCase()}. Entrá con tu cuenta de siempre.`,
      html: buildTeamInviteEmailHtml(inviter?.name || 'Un compañero', company?.name || 'la empresa', body.data.role, loginUrl),
    })

    return reply.send({ member: { id: member.id, user: member.user, role: member.role, invitedAt: member.invitedAt } })
  })

  // ─── Cambiar el rol de alguien del equipo ───────────────────────────────────
  app.patch('/:memberId', async (request, reply) => {
    const { companyId, userId } = request.user as JwtPayload
    if (!companyId) return reply.status(400).send({ error: true, message: 'Sin empresa asociada' })
    if (!(await isOwner(companyId, userId))) {
      return reply.status(403).send({ error: true, message: 'Solo el dueño de la empresa puede cambiar roles' })
    }

    const { memberId } = request.params as { memberId: string }
    const body = z.object({ role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Rol inválido' })

    const member = await prisma.companyMember.findFirst({ where: { id: memberId, companyId } })
    if (!member) return reply.status(404).send({ error: true, message: 'No encontrado' })

    const updated = await prisma.companyMember.update({ where: { id: memberId }, data: { role: body.data.role } })
    return reply.send({ member: updated })
  })

  // ─── Sacar a alguien del equipo ──────────────────────────────────────────────
  app.delete('/:memberId', async (request, reply) => {
    const { companyId, userId } = request.user as JwtPayload
    if (!companyId) return reply.status(400).send({ error: true, message: 'Sin empresa asociada' })
    if (!(await isOwner(companyId, userId))) {
      return reply.status(403).send({ error: true, message: 'Solo el dueño de la empresa puede sacar gente del equipo' })
    }

    const { memberId } = request.params as { memberId: string }
    const member = await prisma.companyMember.findFirst({ where: { id: memberId, companyId } })
    if (!member) return reply.status(404).send({ error: true, message: 'No encontrado' })

    await prisma.companyMember.delete({ where: { id: memberId } })
    return reply.send({ ok: true })
  })
}
