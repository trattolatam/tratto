import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import dotenv from 'dotenv'
dotenv.config()

import { prisma } from './lib/prisma'
import authRoutes from './routes/auth'
import companyRoutes from './routes/companies'
import reviewRoutes from './routes/reviews'
import categoryRoutes from './routes/categories'
import adRoutes from './routes/ads'
import adminRoutes from './routes/admin'
import uploadRoutes from './routes/uploads'
import { subscriptionRoutes, leadRoutes, medalRoutes, notificationRoutes } from './routes/subscriptions'
import { paymentRoutes, webhookPaymentRoutes } from './services/payments/router'
import { aiRoutes } from './services/ai/routes'

const app = Fastify({ logger: true })

async function start() {
  await app.register(cors, { origin: [process.env.FRONTEND_URL || 'http://localhost:3001'], credentials: true })
  await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars' })
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } })

  // ── Rate limiting global ────────────────────────────────────────────────
  // Límite general para toda la API: protege contra scraping y abuso básico
  await app.register(rateLimit, {
    global: true,
    max: 100,                 // 100 requests
    timeWindow: '1 minute',   // por minuto, por IP
    errorResponseBuilder: () => ({
      error: true,
      message: 'Demasiadas solicitudes. Esperá un momento antes de intentar de nuevo.',
    }),
  })

  // Core routes
  app.register(authRoutes,         { prefix: '/api/auth' })
  app.register(companyRoutes,      { prefix: '/api/companies' })
  app.register(reviewRoutes,       { prefix: '/api/reviews' })
  app.register(categoryRoutes,     { prefix: '/api/categories' })
  app.register(subscriptionRoutes, { prefix: '/api/subscriptions' })
  app.register(adRoutes,           { prefix: '/api/ads' })
  app.register(leadRoutes,         { prefix: '/api/leads' })
  app.register(medalRoutes,        { prefix: '/api/medals' })
  app.register(adminRoutes,        { prefix: '/api/admin' })
  app.register(uploadRoutes,       { prefix: '/api/upload' })
  app.register(notificationRoutes, { prefix: '/api/notifications' })

  // Payments (Stripe + MercadoPago)
  app.register(paymentRoutes,        { prefix: '/api/payments' })
  app.register(webhookPaymentRoutes, { prefix: '/api/webhooks' })

  // AI (Claude API)
  app.register(aiRoutes, { prefix: '/api/ai' })

  app.get('/health', async () => ({
    status: 'ok', version: '1.0.0',
    timestamp: new Date().toISOString()
  }))

  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error)
    reply.status(error.statusCode || 500).send({
      error: true, message: error.message || 'Error interno del servidor'
    })
  })

  await prisma.$connect()
  await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })
  console.log(`\n🚀 Tratto API en http://localhost:${process.env.PORT || 3000}\n`)
}

start().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  await app.close()
  process.exit(0)
})
