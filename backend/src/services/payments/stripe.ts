import Stripe from 'stripe'
import { prisma } from '../../index'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

const PLAN_PRICES: Record<string, string> = {
  PROFESSIONAL: process.env.STRIPE_PRICE_PRO!,
  PREMIUM: process.env.STRIPE_PRICE_PREMIUM!,
}

const PLAN_AMOUNTS: Record<string, number> = { PROFESSIONAL: 29, PREMIUM: 79 }

export async function createCheckoutSession({ companyId, plan, successUrl, cancelUrl, customerEmail }: {
  companyId: string; plan: 'PROFESSIONAL' | 'PREMIUM'; successUrl: string; cancelUrl: string; customerEmail: string
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription', payment_method_types: ['card'], customer_email: customerEmail,
    line_items: [{ price: PLAN_PRICES[plan], quantity: 1 }],
    metadata: { companyId, plan },
    subscription_data: { metadata: { companyId, plan }, trial_period_days: 30 },
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`, cancel_url: cancelUrl, allow_promotion_codes: true,
  })
  return session.url!
}

export async function createAdRechargeSession({ adAccountId, amountUsd, successUrl, cancelUrl, customerEmail }: {
  adAccountId: string; amountUsd: number; successUrl: string; cancelUrl: string; customerEmail: string
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment', payment_method_types: ['card'], customer_email: customerEmail,
    line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Tratto Ads — Recarga de saldo' }, unit_amount: Math.round(amountUsd * 100) }, quantity: 1 }],
    metadata: { adAccountId, type: 'ad_recharge', amountUsd: String(amountUsd) },
    success_url: `${successUrl}?recharged=1`, cancel_url: cancelUrl,
  })
  return session.url!
}

export async function cancelSubscription(companyId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({ where: { companyId } })
  if (!sub) throw new Error('Sin suscripción activa')
  await stripe.subscriptions.update(sub.providerSubId, { cancel_at_period_end: true })
  await prisma.subscription.update({ where: { companyId }, data: { cancelAtPeriodEnd: true } })
}

export async function handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    throw new Error(`Webhook signature inválida: ${err.message}`)
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const { companyId, plan } = sub.metadata
      if (!companyId || !plan) break

      const amount = PLAN_AMOUNTS[plan] || 29
      const status = sub.status === 'active' || sub.status === 'trialing' ? 'ACTIVE' : sub.status === 'past_due' ? 'PAST_DUE' : 'PAUSED'

      await prisma.subscription.upsert({
        where: { companyId },
        create: { companyId, plan: plan as any, provider: 'STRIPE', providerSubId: sub.id, status: status as any, amountUsd: amount, currentPeriodEnd: new Date(sub.current_period_end * 1000), trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null },
        update: { status: status as any, currentPeriodEnd: new Date(sub.current_period_end * 1000), cancelAtPeriodEnd: sub.cancel_at_period_end },
      })

      await prisma.company.update({ where: { id: companyId }, data: { plan: plan as any } })

      const company = await prisma.company.findUnique({ where: { id: companyId }, include: { owner: { select: { id: true } } } })
      if (company?.owner && event.type === 'customer.subscription.created') {
        const { sendNotification } = await import('../notifications')
        await sendNotification({
          userId: company.owner.id, type: 'SUBSCRIPTION_RENEWAL', title: `Plan ${plan} activado`,
          body: `Tu plan ${plan} de Tratto está activo. ${sub.trial_end ? '30 días de prueba gratis activados.' : ''}`, data: { plan, companyId },
        })
      }
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const { companyId } = sub.metadata
      if (!companyId) break
      await prisma.subscription.update({ where: { companyId }, data: { status: 'CANCELLED' } })
      await prisma.company.update({ where: { id: companyId }, data: { plan: 'FREE' } })
      break
    }
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.metadata?.type !== 'ad_recharge') break
      const { adAccountId, amountUsd } = session.metadata
      if (!adAccountId) break

      await prisma.adAccount.update({ where: { id: adAccountId }, data: { balance: { increment: parseFloat(amountUsd) } } })
      await prisma.ad.updateMany({ where: { adAccountId, status: 'EXHAUSTED' }, data: { status: 'ACTIVE' } })
      await prisma.payment.create({
        data: { adAccountId, provider: 'STRIPE', providerPayId: session.payment_intent as string, amountUsd: parseFloat(amountUsd), status: 'succeeded', description: 'Recarga de saldo Tratto Ads' },
      })
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = invoice.subscription as string
      if (!subId) break
      await prisma.subscription.update({ where: { providerSubId: subId }, data: { status: 'PAST_DUE' } })
      break
    }
  }
}

export async function getStripeSubscription(providerSubId: string) {
  return stripe.subscriptions.retrieve(providerSubId)
}

export { stripe }
