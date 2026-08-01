/**
 * Script standalone para los reportes de campaña de Tratto Ads — mensuales
 * mientras la campaña sigue activa, y un informe final de cierre cuando
 * termina (tiene fecha de fin y ya pasó).
 *
 * A diferencia del reporte mensual de "oportunidad perdida" (que corre una
 * vez al mes, el día 1), este script está pensado para correr TODOS LOS DÍAS
 * — cada campaña vence en un día distinto según cuándo la creó cada
 * anunciante, así que hay que chequear seguido, no solo el día 1.
 *
 * Uso en producción (Render Cron Job, Command): node dist/scripts/sendAdCampaignReports.js
 * Uso local para probar: npx ts-node src/scripts/sendAdCampaignReports.ts
 */
import { prisma } from '../lib/prisma'
import { sendAdCampaignReports } from '../services/adReports'

async function main() {
  console.log(`[${new Date().toISOString()}] Revisando reportes de campañas de Tratto Ads...`)
  const result = await sendAdCampaignReports()
  console.log(`[${new Date().toISOString()}] Terminado — reportes mensuales: ${result.monthly}, informes finales: ${result.final}, fallidos: ${result.failed}`)
}

main()
  .catch((err) => { console.error('Error fatal en los reportes de campaña:', err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
