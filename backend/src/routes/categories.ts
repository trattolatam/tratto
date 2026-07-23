import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

export default async function categoryRoutes(app: FastifyInstance) {
  app.get('/', async (_req, reply) => {
    const cats = await prisma.category.findMany({
      where: { isHidden: false },
      orderBy: [{ phase: 'asc' }, { priority: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { companies: true } } },
    })
    return reply.send({ categories: cats })
  })

  app.get('/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string }
    const cat = await prisma.category.findUnique({ where: { slug }, include: { _count: { select: { companies: true } } } })
    if (!cat) return reply.status(404).send({ error: true, message: 'Categoría no encontrada' })
    return reply.send({ category: cat })
  })
}
