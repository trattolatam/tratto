/**
 * Script standalone para bajar a FREE las empresas cuya suscripción de dLocal Go
 * ya venció. Pensado para correr como Render Cron Job UNA VEZ POR DÍA (a diferencia
 * del reporte mensual, esto necesita chequearse seguido porque cada empresa vence
 * en un día distinto según cuándo pagó, no todas juntas el día 1 del mes).
 *
 * Stripe NO necesita este script: sus webhooks ya mantienen el plan al día solos.
 * Esto es solo para tapar el agujero de dLocal Go, que es un pago único sin
 * cobro recurrente automático.
 *
 * Uso en producción (Render Cron Job, Command): node dist/scripts/checkExpiredSubscriptions.js
 * Uso local para probar: npx ts-node src/scripts/checkExpiredSubscriptions.ts
 */
import { prisma } from '../lib/prisma'
import { sendNotification } from '../services/notifications'

async function main() {
  console.log(`[${new Date().toISOString()}] Chequeando suscripciones de dLocal Go vencidas...`)

  const expired = await prisma.subscription.findMany({
    where: { provider: 'DLOCALGO', status: 'ACTIVE', currentPeriodEnd: { lt: new Date() } },
    include: { company: { include: { owner: { select: { id: true } } } } },
  })

  let downgraded = 0, failed = 0

  for (const sub of expired) {
    try {
      await prisma.$transaction([
        prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELLED' } }),
        prisma.company.update({ where: { id: sub.companyId }, data: { plan: 'FREE' } }),
      ])

      if (sub.company.owner) {
        await sendNotification({
          userId: sub.company.owner.id, type: 'SUBSCRIPTION_RENEWAL',
          title: `Tu plan ${sub.plan} de Tratto venció`,
          body: `Tu suscripción venció y tu perfil volvió al plan Gratuito. Renová cuando quieras desde tu panel para recuperar todos los beneficios.`,
          data: { companyId: sub.companyId, plan: sub.plan },
        })
      }

      downgraded++
    } catch (err) {
      console.error(`Error bajando de plan a la empresa ${sub.companyId}:`, err)
      failed++
    }
  }

  console.log(`[${new Date().toISOString()}] Chequeo terminado — bajadas: ${downgraded}, fallidas: ${failed}, revisadas: ${expired.length}`)
}

main()
  .catch((err) => { console.error('Error fatal chequeando suscripciones:', err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
