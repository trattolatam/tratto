import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { requireBusinessOwner, requirePlan, requireCompanyRank, JwtPayload } from '../middleware/auth'

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (value: any) => {
    const str = value === null || value === undefined ? '' : String(value)
    // Comillas dobles si el valor tiene coma, comilla o salto de línea — regla estándar de CSV
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))]
  return lines.join('\n')
}

/**
 * Exportación masiva de reseñas y consultas (plan Enterprise) — para que la
 * empresa pueda bajar sus propios datos y usarlos en sus reportes internos.
 */
export default async function exportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireBusinessOwner)
  app.addHook('preHandler', requirePlan('ENTERPRISE'))
  app.addHook('preHandler', requireCompanyRank('ADMIN'))

  app.get('/', async (request, reply) => {
    const { companyId } = request.user as JwtPayload
    if (!companyId) return reply.status(400).send({ error: true, message: 'Sin empresa asociada' })

    const query = request.query as { type?: string; format?: string }
    const type = query.type === 'leads' ? 'leads' : 'reviews'
    const format = query.format === 'json' ? 'json' : 'csv'

    let rows: Record<string, any>[]
    if (type === 'reviews') {
      const reviews = await prisma.review.findMany({
        where: { companyId, status: 'APPROVED' },
        select: { id: true, rating: true, title: true, body: true, isVerified: true, createdAt: true, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      })
      rows = reviews.map((r) => ({
        id: r.id, fecha: r.createdAt.toISOString().slice(0, 10), autor: r.user.name,
        calificacion: r.rating, titulo: r.title || '', comentario: r.body, verificada: r.isVerified ? 'sí' : 'no',
      }))
    } else {
      const leads = await prisma.lead.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } })
      rows = leads.map((l) => ({
        id: l.id, fecha: l.createdAt.toISOString().slice(0, 10), nombre: l.name,
        email: l.email || '', telefono: l.phone || '', mensaje: l.message,
      }))
    }

    if (format === 'json') {
      return reply.send({ [type]: rows })
    }

    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="tratto-${type}-${new Date().toISOString().slice(0, 10)}.csv"`)
    return reply.send(toCsv(rows))
  })
}
