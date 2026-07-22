import { prisma } from '../index'
import { NotificationType } from '@prisma/client'

interface NotificationPayload {
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, any>
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const notification = await prisma.notification.create({
    data: { userId: payload.userId, type: payload.type, title: payload.title, body: payload.body, data: payload.data || {} },
  })

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { email: true, phone: true, country: true, company: { select: { plan: true, phone: true } } },
  })
  if (!user) return

  const isPro = ['PROFESSIONAL', 'PREMIUM', 'ENTERPRISE'].includes(user.company?.plan || '')
  const whatsappAllowed = shouldSendWhatsApp(payload.type) && isPro
  // Si el dueño no cargó su teléfono personal en "Mi perfil", usamos el de la empresa como respaldo
  // (algunos vienen con más de un número separado por "/" — nos quedamos con el primero)
  const notifyPhone = user.phone || user.company?.phone?.split('/')[0].trim()

  const sends: Promise<void>[] = []
  if (user.email && shouldSendEmail(payload.type)) sends.push(sendEmail(user.email, payload.title, payload.body, payload.data))
  if (notifyPhone && whatsappAllowed) sends.push(sendWhatsApp(normalizePhone(notifyPhone, user.country), payload.title, payload.body))

  await Promise.allSettled(sends)

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      sentEmail: user.email ? shouldSendEmail(payload.type) : false,
      sentWhatsapp: notifyPhone ? whatsappAllowed : false,
    },
  })
}

function shouldSendEmail(type: NotificationType): boolean {
  return ['NEW_REVIEW', 'MEDAL_EARNED', 'MONTHLY_REPORT', 'SUBSCRIPTION_RENEWAL', 'AD_APPROVED', 'AD_REJECTED', 'LEAD_RECEIVED'].includes(type)
}

function shouldSendWhatsApp(type: NotificationType): boolean {
  return ['NEW_REVIEW', 'MEDAL_EARNED', 'MEDAL_ALMOST', 'LEAD_RECEIVED'].includes(type)
}

// Códigos de país para normalizar teléfonos locales (ej: "097550450") a formato
// internacional E.164 (ej: "+59897550450"), que es lo que exige la API de WhatsApp.
const COUNTRY_CODES: Record<string, string> = { UY: '598', AR: '54', CL: '56', MX: '52', CO: '57', PE: '51', BR: '55' }

function normalizePhone(phone: string, country: string | null): string {
  const trimmed = phone.trim()
  if (trimmed.startsWith('+')) return trimmed.replace(/[^\d+]/g, '')
  const digits = trimmed.replace(/\D/g, '')
  const code = country ? COUNTRY_CODES[country.toUpperCase()] : undefined
  if (!code) return digits // país desconocido: lo mandamos tal cual, mejor que adivinar mal
  const withoutLeadingZero = digits.replace(/^0+/, '')
  return `+${code}${withoutLeadingZero}`
}

async function sendEmail(to: string, subject: string, body: string, data?: Record<string, any>): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Tratto <${process.env.FROM_EMAIL || 'noreply@tratto.lat'}>`,
        to: [to],
        subject,
        text: body,
      }),
    })
    if (!response.ok) console.error('Resend error:', await response.text())
  } catch (err) { console.error('Email send error:', err) }
}

async function sendWhatsApp(to: string, title: string, body: string): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID) return
  const message = `*Tratto* — ${title}\n\n${body}`
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886', To: `whatsapp:${to}`, Body: message,
        }).toString(),
      }
    )
    if (!response.ok) console.error('Twilio error:', await response.text())
  } catch (err) { console.error('WhatsApp send error:', err) }
}

export async function sendMonthlyLostOpportunityReport(): Promise<void> {
  const claimedFreeCompanies = await prisma.company.findMany({
    where: { plan: 'FREE', claimedById: { not: null } },
    include: { owner: { select: { id: true, email: true } } },
  })

  for (const company of claimedFreeCompanies) {
    if (!company.owner) continue
    const estimatedSearches = Math.floor(Math.random() * 800) + 200
    await sendNotification({
      userId: company.owner.id, type: 'MONTHLY_REPORT', title: 'Tu reporte mensual de Tratto',
      body: `Este mes aproximadamente ${estimatedSearches} personas buscaron servicios en tu rubro. Tu perfil no tiene botón de contacto — activá el plan Profesional para no perder más clientes.`,
      data: { estimatedSearches, companyId: company.id, companyName: company.name },
    })
  }
}
