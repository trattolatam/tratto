import { FastifyInstance } from 'fastify'
import { requireAuth, requireBusinessOwner } from '../middleware/auth'
import { uploadFile, streamToBuffer, BUCKETS } from '../services/storage'
import { uploadRateLimit } from '../middleware/rateLimits'
import path from 'path'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024

export default async function uploadRoutes(app: FastifyInstance) {

  app.post('/proof', { preHandler: requireAuth, config: { rateLimit: uploadRateLimit } }, async (request, reply) => {
    const data = await request.file()
    if (!data) return reply.status(400).send({ error: true, message: 'No se recibió ningún archivo' })

    if (!ALLOWED_TYPES.includes(data.mimetype)) {
      return reply.status(400).send({ error: true, message: 'Tipo de archivo no permitido. Usá JPG, PNG, WEBP o PDF.' })
    }

    const buffer = await streamToBuffer(data.file)
    if (buffer.length > MAX_SIZE) return reply.status(400).send({ error: true, message: 'El archivo supera el límite de 5MB' })

    const ext = path.extname(data.filename) || '.jpg'
    const filePath = `reviews/${request.user.userId}/${Date.now()}${ext}`
    const url = await uploadFile({ bucket: BUCKETS.PROOFS, path: filePath, buffer, mimetype: data.mimetype })

    return reply.send({ url, path: filePath, mimetype: data.mimetype, size: buffer.length })
  })

  app.post('/avatar', { preHandler: requireAuth, config: { rateLimit: uploadRateLimit } }, async (request, reply) => {
    const data = await request.file()
    if (!data) return reply.status(400).send({ error: true, message: 'No se recibió ningún archivo' })

    const imgTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!imgTypes.includes(data.mimetype)) return reply.status(400).send({ error: true, message: 'Solo se aceptan imágenes JPG, PNG o WEBP' })

    const buffer = await streamToBuffer(data.file)
    if (buffer.length > MAX_SIZE) return reply.status(400).send({ error: true, message: 'El archivo supera el límite de 5MB' })

    const ext = path.extname(data.filename) || '.jpg'
    const filePath = `avatars/${request.user.userId}/${Date.now()}${ext}`
    const url = await uploadFile({ bucket: BUCKETS.COMPANIES, path: filePath, buffer, mimetype: data.mimetype })

    const { prisma } = await import('../index')
    await prisma.user.update({ where: { id: request.user.userId }, data: { avatarUrl: url } })

    return reply.send({ url })
  })

  app.post('/company-logo', { preHandler: requireBusinessOwner, config: { rateLimit: uploadRateLimit } }, async (request, reply) => {
    const data = await request.file()
    if (!data) return reply.status(400).send({ error: true, message: 'No se recibió ningún archivo' })

    const imgTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!imgTypes.includes(data.mimetype)) return reply.status(400).send({ error: true, message: 'Solo se aceptan imágenes JPG, PNG o WEBP' })

    const buffer = await streamToBuffer(data.file)
    if (buffer.length > MAX_SIZE) return reply.status(400).send({ error: true, message: 'El archivo supera el límite de 5MB' })

    const ext = path.extname(data.filename) || '.jpg'
    const filePath = `logos/${request.user.companyId}/${Date.now()}${ext}`
    const url = await uploadFile({ bucket: BUCKETS.COMPANIES, path: filePath, buffer, mimetype: data.mimetype })

    const { prisma } = await import('../index')
    if (request.user.companyId) await prisma.company.update({ where: { id: request.user.companyId }, data: { logoUrl: url } })

    return reply.send({ url })
  })

  app.post('/company-photo', { preHandler: requireBusinessOwner, config: { rateLimit: uploadRateLimit } }, async (request, reply) => {
    const data = await request.file()
    if (!data) return reply.status(400).send({ error: true, message: 'No se recibió ningún archivo' })

    const buffer = await streamToBuffer(data.file)
    const ext = path.extname(data.filename) || '.jpg'
    const filePath = `photos/${request.user.companyId}/${Date.now()}${ext}`
    const url = await uploadFile({ bucket: BUCKETS.COMPANIES, path: filePath, buffer, mimetype: data.mimetype })

    const { prisma } = await import('../index')
    if (request.user.companyId) {
      const company = await prisma.company.findUnique({ where: { id: request.user.companyId }, select: { photos: true } })
      if (company && company.photos.length >= 10) return reply.status(400).send({ error: true, message: 'Límite de 10 fotos por empresa' })
      await prisma.company.update({ where: { id: request.user.companyId }, data: { photos: { push: url } } })
    }

    return reply.send({ url })
  })

  app.post('/ad-image', { preHandler: requireAuth, config: { rateLimit: uploadRateLimit } }, async (request, reply) => {
    const data = await request.file()
    if (!data) return reply.status(400).send({ error: true, message: 'No se recibió ningún archivo' })

    const buffer = await streamToBuffer(data.file)
    if (buffer.length > MAX_SIZE) return reply.status(400).send({ error: true, message: 'El archivo supera el límite de 5MB' })

    const ext = path.extname(data.filename) || '.jpg'
    const filePath = `ads/${request.user.userId}/${Date.now()}${ext}`
    const url = await uploadFile({ bucket: BUCKETS.ADS, path: filePath, buffer, mimetype: data.mimetype })

    return reply.send({ url })
  })
}
