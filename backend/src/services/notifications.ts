import { prisma } from '../lib/prisma'
import { NotificationType } from '@prisma/client'

interface NotificationPayload {
  userId: string
  type: NotificationType
  title: string
  body: string
  html?: string
  data?: Record<string, any>
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const notification = await prisma.notification.create({
    data: { userId: payload.userId, type: payload.type, title: payload.title, body: payload.body, data: payload.data || {} },
  })

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { email: true, phone: true, country: true, company: { select: { plan: true, phone: true, email: true, country: true } } },
  })
  if (!user) return

  const isPro = ['PROFESSIONAL', 'PREMIUM', 'ENTERPRISE'].includes(user.company?.plan || '')
  const whatsappAllowed = shouldSendWhatsApp(payload.type) && isPro
  // Si el dueño no cargó su teléfono personal en "Mi perfil", usamos el de la empresa como respaldo
  // (algunos vienen con más de un número separado por "/" — nos quedamos con el primero).
  // Usamos el país que corresponda a cada número, por si el dueño y la empresa están en países distintos.
  const notifyPhone = user.phone || user.company?.phone?.split('/')[0].trim()
  const notifyPhoneCountry = user.phone ? user.country : user.company?.country || user.country
  // Para email priorizamos el "Email de contacto" que carga el dueño en Editar perfil
  // (es el que explícitamente configura para este fin), y si no está, el de su cuenta.
  const notifyEmail = user.company?.email || user.email

  const sends: Promise<void>[] = []
  if (notifyEmail && shouldSendEmail(payload.type)) sends.push(sendEmail(notifyEmail, payload.title, payload.body, payload.html))
  if (notifyPhone && whatsappAllowed) sends.push(sendWhatsApp(normalizePhone(notifyPhone, notifyPhoneCountry), payload.title, payload.body))

  await Promise.allSettled(sends)

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      sentEmail: notifyEmail ? shouldSendEmail(payload.type) : false,
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

async function sendEmail(to: string, subject: string, body: string, html?: string): Promise<void> {
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
        ...(html ? { html } : {}),
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Arma el HTML del reporte mensual — mismo mensaje que la versión de texto plano,
 * pero con diseño y un botón que lleva directo a /precios para convertir.
 * No incluye precios a propósito: la idea es que decidan mirando la página, no acá.
 */
function buildMonthlyReportEmailHtml(contactReveals: number, companyName: string): string {
  const frontendUrl = process.env.FRONTEND_URL || 'https://tratto.lat'
  const pricingUrl = `${frontendUrl}/precios`
  const personas = contactReveals === 1 ? '1 persona quiso' : `${contactReveals} personas quisieron`

  const features = [
    'Botón "Solicitar presupuesto"',
    'Respondés reseñas públicamente',
    'Sello empresa verificada',
    'Resumen IA de tus reseñas',
    'Alerta WhatsApp por nueva reseña',
    'Certificado PDF descargable',
  ]

  const featuresHtml = features
    .map((f) => `<tr><td style="padding:6px 0;font-size:14px;color:#1f2937;"><span style="color:#10b981;font-weight:bold;margin-right:8px;">✓</span>${f}</td></tr>`)
    .join('')

  return `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#0f172a;padding:24px 32px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;">Tratto</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#1f2937;">
                <strong>${personas} tu contacto este mes</strong>, pero tu perfil de <strong>${companyName}</strong> todavía no tiene el botón de contacto activado.
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.5;color:#4b5563;">
                Activá el plan Profesional y no dejes pasar más clientes que ya te están buscando.
              </p>
              <table role="presentation" width="100%" style="border:1px solid #d1fae5;border-radius:12px;padding:20px;margin-bottom:24px;">
                <tr><td style="padding:0 4px;"><span style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;margin-bottom:12px;">MÁS ELEGIDO</span></td></tr>
                <tr><td style="padding:4px;"><span style="font-size:17px;font-weight:700;color:#0f172a;">Plan Profesional</span></td></tr>
                <tr><td style="padding:8px 4px 4px 4px;"><table role="presentation">${featuresHtml}</table></td></tr>
              </table>
              <table role="presentation" width="100%">
                <tr>
                  <td align="center">
                    <a href="${pricingUrl}" style="display:inline-block;background-color:#10b981;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:999px;">Empezar 30 días gratis</a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0 0;text-align:center;font-size:12px;color:#9ca3af;">30 días gratis · cancelás cuando quieras</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#f9fafb;text-align:center;">
              <a href="${frontendUrl}" style="color:#9ca3af;font-size:12px;text-decoration:none;">tratto.lat</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Reporte mensual para empresas en plan Gratuito que ya reclamaron su perfil.
 * Usa el conteo REAL de "quisieron tu contacto" del último mes (mismo dato que
 * ven en su panel) — nada inventado. Si una empresa tuvo 0, no le mandamos nada
 * ese mes (no tiene sentido un mensaje negativo de "nadie te buscó").
 *
 * Procesa en tandas chicas con una pausa entre cada una, y si falla el envío
 * de una empresa puntual, sigue con las demás en vez de frenar todo el proceso
 * — pensado para que este mismo script funcione igual de bien con 20 empresas
 * que con 2.000.
 */
export async function sendMonthlyLostOpportunityReport(): Promise<{ sent: number; skipped: number; failed: number }> {
  const claimedFreeCompanies = await prisma.company.findMany({
    where: { plan: 'FREE', claimedById: { not: null } },
    include: { owner: { select: { id: true, email: true } } },
  })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const BATCH_SIZE = 20
  const DELAY_BETWEEN_BATCHES_MS = 2000

  let sent = 0, skipped = 0, failed = 0

  for (let i = 0; i < claimedFreeCompanies.length; i += BATCH_SIZE) {
    const batch = claimedFreeCompanies.slice(i, i + BATCH_SIZE)

    await Promise.allSettled(
      batch.map(async (company: typeof claimedFreeCompanies[number]) => {
        if (!company.owner) { skipped++; return }

        const contactReveals = await prisma.contactReveal.count({ where: { companyId: company.id, createdAt: { gte: thirtyDaysAgo } } })
        if (contactReveals === 0) { skipped++; return }

        try {
          await sendNotification({
            userId: company.owner.id, type: 'MONTHLY_REPORT', title: 'Tu reporte mensual de Tratto',
            body: `${contactReveals} ${contactReveals === 1 ? 'persona quiso' : 'personas quisieron'} tu contacto este mes, pero tu perfil no tiene el botón de contacto activado — activá el plan Profesional para no perder más clientes.`,
            html: buildMonthlyReportEmailHtml(contactReveals, company.name),
            data: { contactReveals, companyId: company.id, companyName: company.name },
          })
          sent++
        } catch (err) {
          console.error(`Error mandando reporte mensual a la empresa ${company.id}:`, err)
          failed++
        }
      })
    )

    if (i + BATCH_SIZE < claimedFreeCompanies.length) await sleep(DELAY_BETWEEN_BATCHES_MS)
  }

  return { sent, skipped, failed }
}
