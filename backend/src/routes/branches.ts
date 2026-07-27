import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireBusinessOwner, requirePlan, JwtPayload } from '../middleware/auth'

/**
 * Sucursales — varias sedes bajo un mismo perfil de empresa (plan Enterprise).
 * Pensado para empresas con depósitos/locales en más de una ciudad, que
 * quieren un solo perfil de Tratto con reseñas consolidadas, pero mostrando
 * cada sede por separado (dirección, teléfono).
 */
export default async function branchRoutes(app: FastifyInstance) {
  // ─── Listado público (se muestra en el perfil de la empresa) ────────────────
  app.get('/:companyId/branches', async (request, reply) => {
    const { companyId } = request.params as { companyId: string }
    const branches = await prisma.branch.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } })
    return reply.send({ branches })
  })

  // ─── Agregar una sucursal ────────────────────────────────────────────────────
  app.post('/:companyId/branches', { preHandler: [requireBusinessOwner, requirePlan('ENTERPRISE')] }, async (request, reply) => {
    const { companyId: paramCompanyId } = request.params as { companyId: string }
    const { companyId } = request.user as JwtPayload
    if (companyId !== paramCompanyId) return reply.status(403).send({ error: true, message: 'No autorizado' })

    const body = z.object({
      name: z.string().min(2), address: z.string().min(5), city: z.string().min(2), phone: z.string().optional(),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos', details: body.error.issues })

    const branch = await prisma.branch.create({ data: { companyId, ...body.data } })
    return reply.send({ branch })
  })

  // ─── Editar una sucursal ─────────────────────────────────────────────────────
  app.patch('/:companyId/branches/:branchId', { preHandler: [requireBusinessOwner, requirePlan('ENTERPRISE')] }, async (request, reply) => {
    const { companyId: paramCompanyId, branchId } = request.params as { companyId: string; branchId: string }
    const { companyId } = request.user as JwtPayload
    if (companyId !== paramCompanyId) return reply.status(403).send({ error: true, message: 'No autorizado' })

    const body = z.object({
      name: z.string().min(2).optional(), address: z.string().min(5).optional(), city: z.string().min(2).optional(), phone: z.string().optional(),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos' })

    const existing = await prisma.branch.findFirst({ where: { id: branchId, companyId } })
    if (!existing) return reply.status(404).send({ error: true, message: 'Sucursal no encontrada' })

    const branch = await prisma.branch.update({ where: { id: branchId }, data: body.data })
    return reply.send({ branch })
  })

  // ─── Borrar una sucursal ─────────────────────────────────────────────────────
  app.delete('/:companyId/branches/:branchId', { preHandler: [requireBusinessOwner, requirePlan('ENTERPRISE')] }, async (request, reply) => {
    const { companyId: paramCompanyId, branchId } = request.params as { companyId: string; branchId: string }
    const { companyId } = request.user as JwtPayload
    if (companyId !== paramCompanyId) return reply.status(403).send({ error: true, message: 'No autorizado' })

    const existing = await prisma.branch.findFirst({ where: { id: branchId, companyId } })
    if (!existing) return reply.status(404).send({ error: true, message: 'Sucursal no encontrada' })

    await prisma.branch.delete({ where: { id: branchId } })
    return reply.send({ ok: true })
  })
}
