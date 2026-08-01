import { prisma } from '../lib/prisma'
import { sendNotification } from './notifications'
import { buildEmailShell, emailButton } from './emailLayout'

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', phone: 'Teléfono', email: 'Email', website: 'Sitio web', instagram: 'Instagram', facebook: 'Facebook',
}

interface PeriodStats {
  impressions: number
  clicks: number
  detailViews: number
  conversions: number
  spend: number
  ctr: number
  clicksByChannel: Record<string, number>
}

async function computeStats(adId: string, from: Date, to: Date): Promise<PeriodStats> {
  const events = await prisma.adEvent.findMany({
    where: { adId, createdAt: { gte: from, lte: to } },
    select: { type: true, costUsd: true },
  })

  const stats: PeriodStats = { impressions: 0, clicks: 0, detailViews: 0, conversions: 0, spend: 0, ctr: 0, clicksByChannel: {} }
  for (const e of events) {
    if (e.type === 'impression') stats.impressions++
    else if (e.type === 'detail_view') stats.detailViews++
    else if (e.type === 'conversion') stats.conversions++
    else if (e.type.startsWith('click_')) {
      const channel = e.type.replace('click_', '')
      stats.clicksByChannel[channel] = (stats.clicksByChannel[channel] || 0) + 1
      stats.clicks++
    }
    if (e.costUsd) stats.spend += e.costUsd
  }
  stats.spend = Math.round(stats.spend * 100) / 100
  stats.ctr = stats.impressions > 0 ? Math.round((stats.clicks / stats.impressions) * 1000) / 10 : 0
  return stats
}

function buildChannelBreakdownHtml(clicksByChannel: Record<string, number>): string {
  const entries = Object.entries(clicksByChannel).filter(([, n]) => n > 0)
  if (entries.length === 0) return ''
  const rows = entries.map(([channel, n]) => `<tr><td style="padding:4px 0;font-size:13px;color:#4b5563;">${CHANNEL_LABELS[channel] || channel}</td><td style="padding:4px 0;font-size:13px;color:#0f172a;font-weight:600;text-align:right;">${n}</td></tr>`).join('')
  return `<table role="presentation" width="100%" style="margin-top:8px;">${rows}</table>`
}

function buildStatsTableHtml(stats: PeriodStats): string {
  const cell = (label: string, value: string | number) => `
    <td style="padding:12px;background-color:#f9fafb;border-radius:8px;" width="50%">
      <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;">${label}</p>
      <p style="margin:2px 0 0 0;font-size:20px;font-weight:700;color:#0f172a;">${value}</p>
    </td>`
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>${cell('Vistas', stats.impressions)}<td width="8"></td>${cell('Clics', stats.clicks)}</tr>
      <tr><td colspan="3" style="height:8px;"></td></tr>
      <tr>${cell('CTR', stats.ctr + '%')}<td width="8"></td>${cell('Gastado', 'USD ' + stats.spend.toFixed(2))}</tr>
    </table>
    ${buildChannelBreakdownHtml(stats.clicksByChannel)}`
}

async function sendCampaignEmail({ ad, userId, isFinal, stats, periodLabel }: { ad: { id: string; title: string }; userId: string; isFinal: boolean; stats: PeriodStats; periodLabel: string }) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://tratto.lat'
  const adsUrl = `${frontendUrl}/ads`

  const title = isFinal ? `Tu campaña "${ad.title}" terminó` : `Reporte de tu campaña "${ad.title}"`
  const intro = isFinal
    ? `Tu campaña terminó — acá tenés el resumen final de todo lo que generó.`
    : `Acá tenés cómo le fue a tu anuncio ${periodLabel}.`

  const html = buildEmailShell(`
    <p style="margin:0 0 8px 0;font-size:16px;line-height:1.5;color:#1f2937;"><strong>${title}</strong></p>
    <p style="margin:0 0 8px 0;font-size:14px;line-height:1.5;color:#4b5563;">${intro}</p>
    ${buildStatsTableHtml(stats)}
    ${emailButton(adsUrl, isFinal ? 'Renovar campaña' : 'Ver estadísticas completas')}
  `)

  await sendNotification({
    userId, type: isFinal ? 'AD_CAMPAIGN_ENDED' : 'AD_MONTHLY_REPORT',
    title, body: `${intro} Vistas: ${stats.impressions}, clics: ${stats.clicks}, gastado: USD ${stats.spend.toFixed(2)}.`,
    html,
  })
}

/**
 * Recorre todos los anuncios y decide, para cada uno, si le toca un reporte
 * mensual (campaña en curso, hace ~30 días que no se le manda uno) o el
 * informe final de cierre (la campaña ya tiene fecha de fin y ya pasó).
 * Pensado para correr TODOS LOS DÍAS (no una vez al mes), porque cada
 * campaña vence en un día distinto según cuándo la creó cada anunciante.
 */
export async function sendAdCampaignReports(): Promise<{ monthly: number; final: number; failed: number }> {
  const now = new Date()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

  const ads = await prisma.ad.findMany({
    where: { status: { in: ['ACTIVE', 'PAUSED', 'EXHAUSTED'] } },
    include: { adAccount: { select: { userId: true } } },
  })

  let monthly = 0, final = 0, failed = 0

  for (const ad of ads) {
    try {
      const campaignStart = ad.startsAt || ad.createdAt
      const alreadyFinal = !!ad.finalReportSentAt
      const campaignEnded = ad.endsAt && ad.endsAt <= now

      if (campaignEnded && !alreadyFinal) {
        const from = ad.lastMonthlyReportAt || campaignStart
        const stats = await computeStats(ad.id, from, ad.endsAt!)
        await sendCampaignEmail({ ad, userId: ad.adAccount.userId, isFinal: true, stats, periodLabel: '' })
        await prisma.ad.update({ where: { id: ad.id }, data: { finalReportSentAt: now, lastMonthlyReportAt: now } })
        final++
        continue
      }

      // Todavía activa (o pausada/sin saldo pero sin fecha de cierre vencida) —
      // le toca reporte mensual si pasaron ~30 días desde el último (o desde que arrancó).
      const lastReport = ad.lastMonthlyReportAt || campaignStart
      if (now.getTime() - lastReport.getTime() >= thirtyDaysMs) {
        const stats = await computeStats(ad.id, lastReport, now)
        // No molestamos con un reporte vacío si no pasó nada en todo el mes.
        if (stats.impressions > 0 || stats.clicks > 0) {
          await sendCampaignEmail({ ad, userId: ad.adAccount.userId, isFinal: false, stats, periodLabel: 'este último mes' })
          monthly++
        }
        await prisma.ad.update({ where: { id: ad.id }, data: { lastMonthlyReportAt: now } })
      }
    } catch (err) {
      console.error(`Error mandando reporte de campaña para el anuncio ${ad.id}:`, err)
      failed++
    }
  }

  return { monthly, final, failed }
}
