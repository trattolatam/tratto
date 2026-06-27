import { prisma } from '../index'
import { MedalType } from '@prisma/client'

const CURRENT_YEAR = new Date().getFullYear()

export async function checkAndAwardMedals(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      reviews: { where: { status: 'APPROVED' } },
      medals: { where: { year: CURRENT_YEAR } },
    },
  })

  if (!company) return

  const approvedReviews = company.reviews
  const existingMedalTypes = new Set(company.medals.map(m => m.type))
  const toAward: MedalType[] = []

  const verifiedCount = approvedReviews.filter(r => r.isVerified).length
  if (verifiedCount >= 50 && !existingMedalTypes.has('FIFTY_REVIEWS')) {
    toAward.push('FIFTY_REVIEWS')
  }

  if (approvedReviews.length >= 10) {
    const highRated = approvedReviews.filter(r => r.rating >= 4).length
    if (highRated / approvedReviews.length >= 0.9 && !existingMedalTypes.has('HIGHLY_RECOMMENDED')) {
      toAward.push('HIGHLY_RECOMMENDED')
    }
  }

  if (approvedReviews.length >= 20) {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const recentReviews = approvedReviews.filter(r => r.createdAt > threeMonthsAgo)
    const olderReviews = approvedReviews.filter(r => r.createdAt <= threeMonthsAgo)

    if (recentReviews.length >= 5 && olderReviews.length >= 5) {
      const recentAvg = recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length
      const olderAvg = olderReviews.reduce((s, r) => s + r.rating, 0) / olderReviews.length
      if (recentAvg - olderAvg >= 0.5 && !existingMedalTypes.has('TRENDING_UP')) {
        toAward.push('TRENDING_UP')
      }
    }
  }

  if (approvedReviews.length >= 30) {
    const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    const oldEnough = company.reviews.some(r => r.createdAt < twelveMonthsAgo)
    if (oldEnough && company.ratingAvg >= 4.0 && !existingMedalTypes.has('CONSISTENT_12M')) {
      toAward.push('CONSISTENT_12M')
    }
  }

  if (toAward.length > 0) {
    await prisma.medal.createMany({
      data: toAward.map(type => ({ companyId, type, year: CURRENT_YEAR, visible: true })),
      skipDuplicates: true,
    })

    if (company.claimedById) {
      const medalNames: Record<MedalType, string> = {
        TOP_CATEGORY: 'Top del rubro', FIFTY_REVIEWS: '50 reseñas verificadas',
        CONSISTENT_12M: 'Consistente 12 meses', TRENDING_UP: 'En ascenso',
        HIGHLY_RECOMMENDED: 'Muy recomendado', CHOICE_OF_YEAR: 'Elección del año',
      }

      const { sendNotification } = await import('./notifications')
      await sendNotification({
        userId: company.claimedById, type: 'MEDAL_EARNED',
        title: '🏅 ¡Nueva medalla ganada!',
        body: `${company.name} ganó: ${toAward.map(t => medalNames[t]).join(', ')}`,
        data: { medals: toAward, companyId },
      })
    }
  }

  if (company.claimedById) {
    await checkMedalProgress(company.claimedById, companyId, verifiedCount, existingMedalTypes)
  }
}

async function checkMedalProgress(
  ownerId: string, companyId: string, verifiedCount: number, existingMedals: Set<MedalType>
): Promise<void> {
  const { sendNotification } = await import('./notifications')

  if (!existingMedals.has('FIFTY_REVIEWS') && verifiedCount >= 45 && verifiedCount < 50) {
    await sendNotification({
      userId: ownerId, type: 'MEDAL_ALMOST',
      title: '¡Casi llegás a la medalla!',
      body: `Te faltan ${50 - verifiedCount} reseñas verificadas para ganar "50 reseñas verificadas"`,
      data: { medal: 'FIFTY_REVIEWS', remaining: 50 - verifiedCount, companyId },
    })
  }
}

export async function runWeeklyTopCategoryMedals(): Promise<void> {
  const categories = await prisma.category.findMany()

  for (const category of categories) {
    const companies = await prisma.company.findMany({
      where: { categoryId: category.id, reviewCount: { gte: 10 } },
      orderBy: { ratingAvg: 'desc' },
    })

    const byCity = new Map<string, typeof companies>()
    for (const c of companies) {
      const key = `${c.country}-${c.city}`
      if (!byCity.has(key)) byCity.set(key, [])
      byCity.get(key)!.push(c)
    }

    for (const [, cityCompanies] of byCity) {
      const topCount = Math.max(1, Math.ceil(cityCompanies.length * 0.1))
      const topCompanies = cityCompanies.slice(0, topCount)

      for (const company of topCompanies) {
        await prisma.medal.upsert({
          where: { companyId_type_year: { companyId: company.id, type: 'TOP_CATEGORY', year: CURRENT_YEAR } },
          create: { companyId: company.id, type: 'TOP_CATEGORY', year: CURRENT_YEAR, visible: true },
          update: { visible: true },
        })
      }
    }
  }
}
