import { prisma } from '../index'

export async function recalcCompanyRating(companyId: string): Promise<void> {
  const result = await prisma.review.aggregate({
    where: { companyId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { id: true },
  })

  const verifiedCount = await prisma.review.count({
    where: { companyId, status: 'APPROVED', isVerified: true },
  })

  await prisma.company.update({
    where: { id: companyId },
    data: {
      ratingAvg: result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : 0,
      reviewCount: result._count.id,
      verifiedReviewCount: verifiedCount,
    },
  })
}
