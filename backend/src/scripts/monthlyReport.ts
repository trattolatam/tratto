/**
 * Script standalone para el reporte mensual de "oportunidad perdida" a empresas
 * en plan Gratuito. Pensado para correr como un Render Cron Job (una vez al mes),
 * no como parte del servidor web — así no necesita ningún endpoint HTTP protegido.
 *
 * Uso en producción (Render Cron Job, Command): node dist/scripts/monthlyReport.js
 * Uso local para probar: npx ts-node src/scripts/monthlyReport.ts
 */
import { prisma } from '../lib/prisma'
import { sendMonthlyLostOpportunityReport } from '../services/notifications'

async function main() {
  console.log(`[${new Date().toISOString()}] Iniciando reporte mensual...`)
  const result = await sendMonthlyLostOpportunityReport()
  console.log(`[${new Date().toISOString()}] Reporte mensual terminado — enviados: ${result.sent}, sin novedad: ${result.skipped}, fallidos: ${result.failed}`)
}

main()
  .catch((err) => { console.error('Error fatal en el reporte mensual:', err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
