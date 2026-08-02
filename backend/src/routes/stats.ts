import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

export default async function statsRoutes(app: FastifyInstance) {
  // Números reales para las tarjetas de la home (antes eran fijos en el código,
  // sin relación con la base). Sin autenticación — son datos de vidriera.
  app.get('/', async (_req, reply) => {
    const [totalCompanies, verifiedReviews, totalApprovedReviews] = await Promise.all([
      prisma.company.count(),
      prisma.review.count({ where: { status: 'APPROVED', isVerified: true } }),
      prisma.review.count({ where: { status: 'APPROVED' } }),
    ])
    const verifiedPct = totalApprovedReviews > 0 ? Math.round((verifiedReviews / totalApprovedReviews) * 100) : 0
    return reply.send({ totalCompanies, verifiedReviews, verifiedPct })
  })
}
