import { MercadoPagoConfig, Payment, Preference, PreApproval } from 'mercadopago'
import { prisma } from '../../index'

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!, options: { timeout: 5000 } })
const PLAN_AMOUNTS: Record<string, number> = { PROFESSIONAL: 29, PREMIUM: 79 }

export async function createMPPreference({ companyId, plan, successUrl, failureUrl, payerEmail }: {
  companyId: string; plan: 'PROFESSIONAL' | 'PREMIUM'; successUrl: string; failureUrl: string; cancelUrl?: string; payerEmail: string
}): Promise<string> {
  const preference = new Preference(client)
  const amount = PLAN_AMOUNTS[plan]
  const result = await preference.create({
    body: {
      items: [{ id: `tratto-${plan.toLowerCase()}`, title: `Tratto — Plan ${plan}`, description: `Suscripción mensual plan ${plan}`, quantity: 1, unit_price: amount, currency_id: 'USD' }],
      payer: { email: payerEmail },
      back_urls: { success: successUrl, failure: failureUrl, pending: successUrl },
      auto_return: 'approved',
      external_reference: JSON.stringify({ companyId, plan, type: 'subscription' }),
      metadata: { companyId, plan },
    },
  })
  return result.init_point!
}

export async function createMPAdRechargePreference({ adAccountId, amountUsd, successUrl, failureUrl, payerEmail }: {
  adAccountId: string; amountUsd: number; successUrl: string; failureUrl: string; payerEmail: string
}): Promise<string> {
  const preference = new Preference(client)
  const result = await preference.create({
    body: {
      items: [{ id: 'tratto-ads-recharge', title: 'Tratto Ads — Recarga de saldo', description: `Recarga de USD ${amountUsd} para publicidad`, quantity: 1, unit_price: amountUsd, currency_id: 'USD' }],
      payer: { email: payerEmail },
      back_urls: { success: `${successUrl}?recharged=1`, failure: failureUrl, pending: successUrl },
      auto_return: 'approved',
      external_reference: JSON.stringify({ adAccountId, amountUsd, type: 'ad_recharge' }),
    },
  })
  return result.init_point!
}

export async function createMPPreApproval({ companyId, plan, backUrl, payerEmail }: {
  companyId: string; plan: 'PROFESSIONAL' | 'PREMIUM'; backUrl: string; payerEmail: string
}): Promise<string> {
  const preApproval = new PreApproval(client)
  const amount = PLAN_AMOUNTS[plan]
  const result = await preApproval.create({
    body: {
      reason: `Tratto Plan ${plan}`, external_reference: companyId, payer_email: payerEmail,
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: amount, currency_id: 'USD', free_trial: { frequency: 1, frequency_type: 'months' } },
      back_url: backUrl,
    },
  })
  return result.init_point!
}

export async function handleMPWebhook(body: any): Promise<void> {
  const { type, data } = body

  if (type === 'payment') {
    const payment = new Payment(client)
    const paymentData = await payment.get({ id: data.id })
    if (paymentData.status !== 'approved') return

    const externalRef = paymentData.external_reference
    if (!externalRef) return

    let ref: any
    try { ref = JSON.parse(externalRef) } catch { return }

    if (ref.type === 'ad_recharge' && ref.adAccountId) {
      await prisma.adAccount.update({ where: { id: ref.adAccountId }, data: { balance: { increment: ref.amountUsd } } })
      await prisma.ad.updateMany({ where: { adAccountId: ref.adAccountId, status: 'EXHAUSTED' }, data: { status: 'ACTIVE' } })
      await prisma.payment.create({ data: { adAccountId: ref.adAccountId, provider: 'MERCADOPAGO', providerPayId: String(paymentData.id), amountUsd: ref.amountUsd, status: 'succeeded', description: 'Recarga Tratto Ads via MercadoPago' } })
      return
    }

    if (ref.type === 'subscription' && ref.companyId) {
      const { companyId, plan } = ref
      const amount = paymentData.transaction_amount || PLAN_AMOUNTS[plan]
      const periodEnd = new Date(); periodEnd.setMonth(periodEnd.getMonth() + 1)

      await prisma.subscription.upsert({
        where: { companyId },
        create: { companyId, plan: plan as any, provider: 'MERCADOPAGO', providerSubId: String(paymentData.id), status: 'ACTIVE', amountUsd: amount, currentPeriodEnd: periodEnd },
        update: { status: 'ACTIVE', currentPeriodEnd: periodEnd },
      })

      await prisma.company.update({ where: { id: companyId }, data: { plan: plan as any } })

      const company = await prisma.company.findUnique({ where: { id: companyId }, include: { owner: { select: { id: true } } } })
      if (company?.owner) {
        const { sendNotification } = await import('../notifications')
        await sendNotification({ userId: company.owner.id, type: 'SUBSCRIPTION_RENEWAL', title: `Plan ${plan} activado`, body: `Tu plan ${plan} de Tratto está activo via MercadoPago.`, data: { plan, companyId } })
      }
    }
  }

  if (type === 'subscription_preapproval') {
    const preApproval = new PreApproval(client)
    const subData = await preApproval.get({ id: data.id })
    if (subData.status !== 'authorized') return

    const companyId = subData.external_reference
    if (!companyId) return

    const periodEnd = new Date(); periodEnd.setMonth(periodEnd.getMonth() + 1)
    await prisma.subscription.update({ where: { companyId }, data: { status: 'ACTIVE', currentPeriodEnd: periodEnd } })
  }
}
