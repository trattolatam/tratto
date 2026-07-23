import { prisma } from '../../lib/prisma'

// VERIFICAR: confirmar en tu panel de dLocal Go (Integraciones > Integración por API)
// la URL base exacta de sandbox y producción antes de ir a producción.
const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.dlocalgo.com'
  : 'https://api-sbx.dlocalgo.com'

const API_KEY = process.env.DLOCALGO_API_KEY!
const API_SECRET = process.env.DLOCALGO_API_SECRET!

const PLAN_AMOUNTS: Record<string, number> = { PROFESSIONAL: 29, PREMIUM: 79 }

function authHeaders() {
  const token = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${token}`,
  }
}

async function dlocalRequest(path: string, method: 'GET' | 'POST', body?: any): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
  const data: any = await res.json()
  if (!res.ok) {
    throw new Error(`dLocal Go error (${res.status}): ${data?.message || JSON.stringify(data)}`)
  }
  return data
}

export async function createDLPayment({ companyId, plan, successUrl, failureUrl, payerEmail, payerName, country = 'UY', currency = 'UYU' }: {
  companyId: string; plan: 'PROFESSIONAL' | 'PREMIUM'; successUrl: string; failureUrl: string; payerEmail: string; payerName: string; country?: string; currency?: string
}): Promise<string> {
  const amount = PLAN_AMOUNTS[plan]
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000'

  const result = await dlocalRequest('/v1/payments', 'POST', {
    amount,
    currency,
    country,
    order_id: JSON.stringify({ companyId, plan, type: 'subscription' }),
    notification_url: `${backendUrl}/webhooks/dlocalgo`,
    success_url: successUrl,
    back_url: failureUrl,
    payer: { name: payerName, email: payerEmail },
  })

  return result.redirect_url
}

export async function createDLAdRechargePayment({ adAccountId, amountUsd, successUrl, failureUrl, payerEmail, payerName, country = 'UY', currency = 'UYU' }: {
  adAccountId: string; amountUsd: number; successUrl: string; failureUrl: string; payerEmail: string; payerName: string; country?: string; currency?: string
}): Promise<string> {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000'

  const result = await dlocalRequest('/v1/payments', 'POST', {
    amount: amountUsd,
    currency,
    country,
    order_id: JSON.stringify({ adAccountId, amountUsd, type: 'ad_recharge' }),
    notification_url: `${backendUrl}/webhooks/dlocalgo`,
    success_url: `${successUrl}?recharged=1`,
    back_url: failureUrl,
    payer: { name: payerName, email: payerEmail },
  })

  return result.redirect_url
}

export async function handleDLWebhook(body: any): Promise<void> {
  const paymentId = body?.payment_id || body?.id
  if (!paymentId) return

  const paymentData = await dlocalRequest(`/v1/payments/${paymentId}`, 'GET')
  if (paymentData.status !== 'PAID') return

  let ref: any
  try { ref = JSON.parse(paymentData.order_id) } catch { return }

  if (ref.type === 'ad_recharge' && ref.adAccountId) {
    await prisma.adAccount.update({ where: { id: ref.adAccountId }, data: { balance: { increment: ref.amountUsd } } })
    await prisma.ad.updateMany({ where: { adAccountId: ref.adAccountId, status: 'EXHAUSTED' }, data: { status: 'ACTIVE' } })
    await prisma.payment.create({ data: { adAccountId: ref.adAccountId, provider: 'DLOCALGO', providerPayId: String(paymentData.id), amountUsd: ref.amountUsd, status: 'succeeded', description: 'Recarga Tratto Ads via dLocal Go' } })
    return
  }

  if (ref.type === 'subscription' && ref.companyId) {
    const { companyId, plan } = ref
    const amount = paymentData.amount || PLAN_AMOUNTS[plan]
    const periodEnd = new Date(); periodEnd.setMonth(periodEnd.getMonth() + 1)

    await prisma.subscription.upsert({
      where: { companyId },
      create: { companyId, plan: plan as any, provider: 'DLOCALGO', providerSubId: String(paymentData.id), status: 'ACTIVE', amountUsd: amount, currentPeriodEnd: periodEnd },
      update: { status: 'ACTIVE', currentPeriodEnd: periodEnd },
    })

    await prisma.company.update({ where: { id: companyId }, data: { plan: plan as any } })

    const company = await prisma.company.findUnique({ where: { id: companyId }, include: { owner: { select: { id: true } } } })
    if (company?.owner) {
      const { sendNotification } = await import('../notifications')
      await sendNotification({ userId: company.owner.id, type: 'SUBSCRIPTION_RENEWAL', title: `Plan ${plan} activado`, body: `Tu plan ${plan} de Tratto está activo via dLocal Go.`, data: { plan, companyId } })
    }
  }
}
