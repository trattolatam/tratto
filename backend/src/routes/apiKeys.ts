import { FastifyInstance } from 'fastify'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { requireBusinessOwner, requirePlan, JwtPayload } from '../middleware/auth'

// Prefijo público que identifica de un vistazo que es una key de Tratto
// (mismo patrón que usan Stripe/otros: fácil de reconocer si se filtra por error).
const KEY_PREFIX = 'trak_live_'

function generateRawKey(): string {
  return `${KEY_PREFIX}${crypto.randomBytes(24).toString('hex')}`
}

function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

export default async function apiKeyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireBusinessOwner)
  app.addHook('preHandler', requirePlan('PREMIUM'))

  // ─── Ver el estado de mi API key (sin exponer la key real) ─────────────────
  app.get('/', async (request, reply) => {
    const { companyId } = request.user as JwtPayload
    if (!companyId) return reply.status(400).send({ error: true, message: 'Sin empresa asociada' })

    const apiKey = await prisma.apiKey.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } })
    if (!apiKey) return reply.send({ apiKey: null })

    return reply.send({
      apiKey: {
        name: apiKey.name,
        isActive: apiKey.isActive,
        monthlyLimit: apiKey.monthlyLimit,
        usageCount: apiKey.usageCount,
        lastUsedAt: apiKey.lastUsedAt,
        createdAt: apiKey.createdAt,
        // Mostramos solo el prefijo, nunca la key completa una vez creada — igual que Stripe/GitHub
        preview: `${KEY_PREFIX}${'•'.repeat(8)}`,
      },
    })
  })

  // ─── Generar (o rotar) mi API key ───────────────────────────────────────────
  // Generar una nueva desactiva cualquier key anterior de la empresa: solo una activa a la vez,
  // para que quede claro cuál es la vigente y no queden keys viejas dando vueltas sin que se note.
  app.post('/', async (request, reply) => {
    const { companyId } = request.user as JwtPayload
    if (!companyId) return reply.status(400).send({ error: true, message: 'Sin empresa asociada' })

    const rawKey = generateRawKey()
    await prisma.apiKey.updateMany({ where: { companyId, isActive: true }, data: { isActive: false } })
    await prisma.apiKey.create({
      data: { companyId, name: 'Key de integración', keyHash: hashKey(rawKey), monthlyLimit: 1000 },
    })

    // La key completa se devuelve UNA SOLA VEZ, en esta respuesta — a partir de acá
    // solo guardamos el hash, así que si se pierde hay que generar una nueva.
    return reply.send({ key: rawKey, warning: 'Guardá esta key ahora — no la vas a poder ver de nuevo.' })
  })

  // ─── Revocar mi API key ──────────────────────────────────────────────────────
  app.delete('/', async (request, reply) => {
    const { companyId } = request.user as JwtPayload
    if (!companyId) return reply.status(400).send({ error: true, message: 'Sin empresa asociada' })

    await prisma.apiKey.updateMany({ where: { companyId, isActive: true }, data: { isActive: false } })
    return reply.send({ ok: true, message: 'API key revocada' })
  })
}

export { hashKey }
