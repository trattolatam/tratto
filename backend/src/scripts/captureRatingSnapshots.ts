/**
 * Script standalone para guardar una "foto" mensual del rating y la posición
 * de cada empresa dentro de su categoría+ciudad. Sin esto, el panel de
 * Competencia solo puede mostrar el estado de HOY — con este historial,
 * puede mostrar si una empresa está mejorando o empeorando con el tiempo.
 *
 * Pensado para correr como Render Cron Job una vez al mes (día 1, después
 * del reporte mensual de oportunidades perdidas).
 *
 * Uso en producción (Render Cron Job, Command): node dist/scripts/captureRatingSnapshots.js
 * Uso local para probar: npx ts-node src/scripts/captureRatingSnapshots.ts
 */
import { prisma } from '../lib/prisma'

async function main() {
  console.log(`[${new Date().toISOString()}] Capturando fotos mensuales de rating...`)

  const companies = await prisma.company.findMany({
    select: { id: true, categoryId: true, city: true, country: true, plan: true, ratingAvg: true, reviewCount: true },
  })

  const planRank = { FREE: 0, PROFESSIONAL: 1, PREMIUM: 2, ENTERPRISE: 3 } as const

  // Agrupamos por categoría+ciudad para calcular la posición de cada una dentro de su grupo,
  // igual que hace el endpoint de inteligencia competitiva.
  const groups = new Map<string, typeof companies>()
  for (const c of companies) {
    const key = `${c.categoryId}|${c.city}|${c.country}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  }

  const snapshots: { companyId: string; ratingAvg: number; reviewCount: number; rankPosition: number; rankTotal: number }[] = []

  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => {
      if (planRank[b.plan] !== planRank[a.plan]) return planRank[b.plan] - planRank[a.plan]
      if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg
      return b.reviewCount - a.reviewCount
    })
    sorted.forEach((c, i) => {
      snapshots.push({ companyId: c.id, ratingAvg: c.ratingAvg, reviewCount: c.reviewCount, rankPosition: i + 1, rankTotal: sorted.length })
    })
  }

  await prisma.companyRatingSnapshot.createMany({ data: snapshots })

  console.log(`[${new Date().toISOString()}] Fotos guardadas: ${snapshots.length}`)
}

main()
  .catch((err) => { console.error('Error fatal capturando fotos de rating:', err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
