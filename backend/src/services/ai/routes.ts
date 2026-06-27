import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../index'
import { requireBusinessOwner, requireAdmin } from '../../middleware/auth'
import { generateAiSummary, generateReviewResponseSuggestion, runBatchAiSummaries } from './summaries'

export async function aiRoutes(app: FastifyInstance) {

  app.get('/summary/:companyId', async (request, reply) => {
    const { companyId } = request.params as { companyId: string }
    const summary = await prisma.aiSummary.findUnique({ where: { companyId } })
    if (!summary) return reply.status(404).send({ error: true, message: 'Sin resumen disponible todavía' })
    return reply.send({ summary })
  })

  app.post('/summary/:companyId', { preHandler: requireBusinessOwner }, async (request, reply) => {
    const { companyId } = request.params as { companyId: string }
    const company = await prisma.company.findUnique({ where: { id: companyId } })
    if (!company) return reply.status(404).send({ error: true, message: 'Empresa no encontrada' })

    if (company.claimedById !== request.user.userId && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: true, message: 'Sin permiso' })
    }

    if (company.reviewCount < 5) return reply.status(400).send({ error: true, message: 'Se necesitan al menos 5 reseñas para generar el resumen' })

    generateAiSummary(companyId).catch(err => app.log.error(`Error generando AI summary: ${err.message}`))
    return reply.send({ message: 'Resumen en proceso. Estará disponible en unos segundos.' })
  })

  app.post('/response-suggestion', { preHandler: requireBusinessOwner }, async (request, reply) => {
    const body = z.object({ reviewId: z.string().uuid() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: true, message: 'Datos inválidos' })

    const review = await prisma.review.findUnique({
      where: { id: body.data.reviewId },
      include: { company: { select: { name: true, claimedById: true, category: { select: { name: true } } } } },
    })

    if (!review) return reply.status(404).send({ error: true, message: 'Reseña no encontrada' })
    if (review.company.claimedById !== request.user.userId) return reply.status(403).send({ error: true, message: 'Solo el dueño puede solicitar sugerencias' })

    const suggestion = await generateReviewResponseSuggestion(review.body, review.rating, review.company.name, review.company.category.name)
    return reply.send({ suggestion })
  })

  app.post('/batch', { preHandler: requireAdmin }, async (_request, reply) => {
    runBatchAiSummaries().catch(err => app.log.error(`Error en batch AI: ${err.message}`))
    return reply.send({ message: 'Batch de resúmenes IA iniciado en background' })
  })
}
