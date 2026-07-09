export type UserRole = 'USER' | 'BUSINESS' | 'ADMIN'
export type CompanyPlan = 'FREE' | 'PROFESSIONAL' | 'PREMIUM' | 'ENTERPRISE'
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REPORTED'
export type MedalType = 'TOP_CATEGORY' | 'FIFTY_REVIEWS' | 'CONSISTENT_12M' | 'TRENDING_UP' | 'HIGHLY_RECOMMENDED' | 'CHOICE_OF_YEAR'

export interface User {
  id: string; email: string; name: string; role: UserRole; country: string; city?: string
  avatarUrl?: string; isVerified: boolean; isPro: boolean; company?: CompanyBasic
}

export interface CompanyBasic { id: string; name: string; slug: string; plan: CompanyPlan; isVerified: boolean; ratingAvg: number; reviewCount: number }

export interface Company extends CompanyBasic {
  description?: string; categoryId: string; category: Category; country: string; city: string
  address?: string; phone?: string; website?: string; email?: string; taxId?: string; taxIdType?: string
  logoUrl?: string; coverUrl?: string; photos: string[]; verifiedReviewCount: number
  medals: Medal[]; aiSummary?: AiSummary; claimedById?: string; claimedAt?: string; bookingEnabled: boolean
}

export interface Category { id: string; name: string; slug: string; emoji: string; phase: number; priority: boolean; _count?: { companies: number } }

export interface Review {
  id: string; companyId: string; userId: string; rating: number; title?: string; body: string
  proofUrl?: string; proofType?: string; isVerified: boolean; verifiedAt?: string; status: ReviewStatus
  helpfulCount: number; createdAt: string; user: { name: string; avatarUrl?: string; country: string }; response?: ReviewResponse
}

export interface ReviewResponse { id: string; body: string; createdAt: string }
export interface Medal { id: string; companyId: string; type: MedalType; awardedAt: string; year: number }

export const MEDAL_META: Record<MedalType, { label: string; emoji: string; color: string; bg: string }> = {
  TOP_CATEGORY: { label: 'Top del rubro', emoji: '⭐', color: '#BA7517', bg: '#FAEEDA' },
  FIFTY_REVIEWS: { label: '50+ reseñas verificadas', emoji: '🏅', color: '#0F6E56', bg: '#E1F5EE' },
  CONSISTENT_12M: { label: 'Consistente 12 meses', emoji: '🕐', color: '#534AB7', bg: '#EEEDFE' },
  TRENDING_UP: { label: 'En ascenso', emoji: '📈', color: '#993C1D', bg: '#FAECE7' },
  HIGHLY_RECOMMENDED: { label: 'Muy recomendado', emoji: '👍', color: '#185FA5', bg: '#E6F1FB' },
  CHOICE_OF_YEAR: { label: 'Elección del año', emoji: '🏆', color: '#993556', bg: '#FBEAF0' },
}

export interface AiSummary { id: string; summaryText: string; insightBars: InsightBar[]; reviewsCount: number; generatedAt: string }
export interface InsightBar { label: string; percentage: number; isNegative: boolean }
export interface Ad { id: string; title: string; description: string; imageUrl: string; price?: number; ctaText: string; ctaUrl?: string; adAccount: { companyName: string } }

export interface PaginatedResponse<T> { data: T[]; pagination: { page: number; limit: number; total: number; pages: number } }
export interface ApiError { error: true; message: string; details?: any }
