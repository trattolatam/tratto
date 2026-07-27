import crypto from 'crypto'
import { prisma } from '../lib/prisma'

/**
 * Dispara los webhooks configurados por una empresa (plan Enterprise) cuando
 * pasa algo relevante — hoy: nueva reseña aprobada, nueva consulta/lead.
 * Se llama desde reviews.ts y subscriptions.ts (leadRoutes), sin bloquear la
 * respuesta al usuario si el webhook del cliente está caído o tarda.
 */
export async function triggerWebhooks(companyId: string, event: string, payload: Record<string, any>): Promise<void> {
  const webhooks = await prisma.webhook.findMany({ where: { companyId, isActive: true, events: { has: event } } })
  if (webhooks.length === 0) return

  const body = JSON.stringify({ event, data: payload, sentAt: new Date().toISOString() })

  // Fire-and-forget: no esperamos la respuesta del cliente ni frenamos el flujo
  // principal (crear una reseña, recibir un lead) por un webhook lento o caído.
  for (const webhook of webhooks) {
    const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex')
    fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tratto-Signature': signature, 'X-Tratto-Event': event },
      body,
    }).catch((err) => console.error(`Error disparando webhook ${webhook.id} (${webhook.url}):`, err.message))
  }
}
