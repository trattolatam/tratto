import Link from 'next/link'
import { Company, MEDAL_META, MedalType } from '@/types'

export function CompanyCard({ company, rank }: { company: Company; rank?: number }) {
  const verifiedPct = company.reviewCount > 0 ? Math.round((company.verifiedReviewCount / company.reviewCount) * 100) : 0

  return (
    <Link href={`/empresa/${company.slug}`} className="card card-hover block p-4">
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-brand-green/10 flex items-center justify-center text-brand-green font-bold text-lg">{company.name.charAt(0)}</div>
          )}
          {rank && rank <= 3 && <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-brand-amber text-white text-xs font-bold flex items-center justify-center shadow">{rank}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-brand-dark text-sm truncate">{company.name}</h3>
              <p className="text-xs text-brand-slate mt-0.5 truncate">{company.category?.name} · {company.city}, {company.country}</p>
            </div>
            {!company.claimedById && <span className="flex-shrink-0 text-xs text-brand-amber bg-brand-amber-dim px-2 py-0.5 rounded-full whitespace-nowrap">Sin reclamar</span>}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1">{[1,2,3,4,5].map(n => <span key={n} className={n <= Math.round(company.ratingAvg) ? 'star-filled' : 'star-empty'}>★</span>)}</div>
            <span className="text-sm font-semibold text-brand-dark">{company.ratingAvg.toFixed(1)}</span>
            <span className="text-xs text-brand-slate">({company.reviewCount} reseñas)</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5 flex-wrap">
          {company.isVerified && <span className="badge-verified text-xs"><span className="badge-verified-dot" />Verificada</span>}
          {verifiedPct >= 50 && <span className="text-xs text-brand-slate bg-gray-50 px-2 py-0.5 rounded-full">{verifiedPct}% verificadas</span>}
          {company.medals?.slice(0, 2).map(medal => {
            const meta = MEDAL_META[medal.type as MedalType]
            return <span key={medal.id} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: meta.bg, color: meta.color }}>{meta.emoji} {meta.label}</span>
          })}
        </div>
        <i className="ti ti-chevron-right text-gray-300 text-base flex-shrink-0" />
      </div>
    </Link>
  )
}

export function CompanyCardSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0" />
        <div className="flex-1"><div className="h-4 bg-gray-100 rounded w-3/4 mb-2" /><div className="h-3 bg-gray-100 rounded w-1/2 mb-3" /><div className="h-3 bg-gray-100 rounded w-1/3" /></div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-50 h-5 bg-gray-100 rounded w-1/2" />
    </div>
  )
}
