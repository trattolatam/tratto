'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Company, Review, Ad, MEDAL_META, MedalType } from '@/types'
import { reviews as reviewsApi, leads } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export function CompanyProfile({ company, ads }: { company: Company; ads: Ad[] }) {
  const { user } = useAuthStore()
  const isOwner = user?.company?.id === company.id
  const [activeTab, setActiveTab] = useState<'reviews' | 'info'>('reviews')
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadSent, setLeadSent] = useState(false)
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', message: '' })

  const verifiedPct = company.reviewCount > 0 ? Math.round((company.verifiedReviewCount / company.reviewCount) * 100) : 0

  const handleLead = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await leads.create({ ...leadForm, companyId: company.id }); setLeadSent(true) }
    catch (err: any) { alert(err.message) }
  }

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: company.name, description: company.description,
    address: { '@type': 'PostalAddress', addressLocality: company.city, addressCountry: company.country },
    telephone: company.phone, url: company.website,
    aggregateRating: { '@type': 'AggregateRating', ratingValue: company.ratingAvg, reviewCount: company.reviewCount, bestRating: 5, worstRating: 1 },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-brand-dark text-white rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-5">
            {company.logoUrl ? <img src={company.logoUrl} alt={company.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" /> : <div className="w-16 h-16 rounded-xl bg-brand-green/20 flex items-center justify-center text-brand-green font-bold text-2xl flex-shrink-0">{company.name.charAt(0)}</div>}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{company.name}</h1>
                {company.isVerified && <span className="badge-verified text-xs mt-0.5"><span className="badge-verified-dot" />Empresa verificada</span>}
              </div>
              <p className="text-white/60 text-sm mt-1"><i className="ti ti-map-pin text-xs mr-1" />{company.category?.name} · {company.city}, {company.country}</p>
              {!company.claimedById && <Link href={`/reclamar?empresa=${company.id}`} className="inline-flex items-center gap-1 text-xs text-brand-amber mt-1 hover:underline"><i className="ti ti-alert-circle text-xs" />Perfil no reclamado — ¿es tu empresa?</Link>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/8 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-brand-green">{company.ratingAvg.toFixed(1)}</div><div className="text-xs text-white/50 mt-0.5">Calificación</div></div>
            <div className="bg-white/8 rounded-lg p-3 text-center"><div className="text-2xl font-bold">{company.reviewCount}</div><div className="text-xs text-white/50 mt-0.5">Reseñas totales</div></div>
            <div className="bg-white/8 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-brand-green">{verifiedPct}%</div><div className="text-xs text-white/50 mt-0.5">Verificadas</div></div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-5">
            {company.aiSummary && (
              <div className="card p-5 border border-brand-green/20 bg-brand-green-dim/30">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-dark mb-3"><i className="ti ti-robot text-brand-green" />Resumen IA — {company.aiSummary.reviewsCount} reseñas analizadas</h2>
                <p className="text-sm text-brand-slate mb-4">{company.aiSummary.summaryText}</p>
                <div className="space-y-2">
                  {company.aiSummary.insightBars.map((bar, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-brand-slate w-40 flex-shrink-0">{bar.label}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${bar.isNegative ? 'bg-brand-red' : 'bg-brand-green'}`} style={{ width: `${bar.percentage}%` }} /></div>
                      <span className="text-xs font-semibold text-brand-dark w-8 text-right">{bar.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {company.medals && company.medals.length > 0 && (
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-brand-dark mb-3">Medallas</h2>
                <div className="flex flex-wrap gap-2">
                  {company.medals.map(medal => { const meta = MEDAL_META[medal.type as MedalType]; return <span key={medal.id} className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: meta.bg, color: meta.color }}>{meta.emoji} {meta.label}</span> })}
                </div>
              </div>
            )}

            <div className="flex border-b border-gray-100 gap-4 mb-1">
              {(['reviews', 'info'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-brand-green text-brand-green' : 'border-transparent text-brand-slate hover:text-brand-dark'}`}>
                  {tab === 'reviews' ? `Reseñas (${company.reviewCount})` : 'Información'}
                </button>
              ))}
            </div>

            {activeTab === 'reviews' && <ReviewsList companyId={company.id} />}
            {activeTab === 'info' && (
              <div className="card p-5 space-y-3">
                {company.phone && <div className="flex items-center gap-3 text-sm"><i className="ti ti-phone text-brand-slate text-base w-5" /><a href={`tel:${company.phone}`} className="text-brand-dark hover:text-brand-green">{company.phone}</a></div>}
                {company.website && <div className="flex items-center gap-3 text-sm"><i className="ti ti-world text-brand-slate text-base w-5" /><a href={company.website} target="_blank" rel="noopener" className="text-brand-blue hover:underline truncate">{company.website}</a></div>}
                {company.address && <div className="flex items-center gap-3 text-sm"><i className="ti ti-map-pin text-brand-slate text-base w-5" /><span className="text-brand-dark">{company.address}</span></div>}
                {company.taxId && <div className="flex items-center gap-3 text-sm"><i className="ti ti-file-certificate text-brand-slate text-base w-5" /><span className="text-brand-dark">{company.taxIdType}: {company.taxId}</span></div>}
                {company.description && <p className="text-sm text-brand-slate pt-2 border-t border-gray-50 leading-relaxed">{company.description}</p>}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {!isOwner && (company.claimedById ? (
              <div className="card p-4">
                {leadSent ? (
                  <div className="text-center py-4"><i className="ti ti-circle-check text-3xl text-brand-green block mb-2" /><p className="text-sm font-semibold text-brand-dark">¡Consulta enviada!</p><p className="text-xs text-brand-slate mt-1">La empresa te contactará pronto.</p></div>
                ) : showLeadForm ? (
                  <form onSubmit={handleLead} className="space-y-3">
                    <p className="text-sm font-semibold text-brand-dark mb-2">Solicitar presupuesto</p>
                    <input required type="text" placeholder="Tu nombre" className="input text-sm" value={leadForm.name} onChange={e => setLeadForm(f => ({...f, name: e.target.value}))} />
                    <input type="email" placeholder="Tu email (opcional)" className="input text-sm" value={leadForm.email} onChange={e => setLeadForm(f => ({...f, email: e.target.value}))} />
                    <input type="tel" placeholder="Tu teléfono (opcional)" className="input text-sm" value={leadForm.phone} onChange={e => setLeadForm(f => ({...f, phone: e.target.value}))} />
                    <textarea required placeholder="¿Qué necesitás?" className="input text-sm min-h-[80px] resize-none" value={leadForm.message} onChange={e => setLeadForm(f => ({...f, message: e.target.value}))} />
                    <button type="submit" className="btn-primary w-full py-2.5 text-sm">Enviar consulta</button>
                    <button type="button" onClick={() => setShowLeadForm(false)} className="btn-secondary w-full py-2 text-xs">Cancelar</button>
                  </form>
                ) : (
                  <>
                    <button onClick={() => setShowLeadForm(true)} className="btn-primary w-full py-3 text-sm mb-2"><i className="ti ti-message text-base" />Solicitar presupuesto</button>
                    <Link href={`/escribir-resena?empresa=${company.id}`} className="btn-secondary w-full py-2.5 text-sm text-center block"><i className="ti ti-pencil text-sm mr-1" />Escribir reseña</Link>
                  </>
                )}
              </div>
            ) : (
              <div className="card p-4 border border-brand-amber/30 bg-brand-amber-dim/30">
                <p className="text-xs font-semibold text-brand-amber mb-2">Perfil no reclamado</p>
                <p className="text-xs text-brand-slate mb-3">Esta empresa aún no gestionó su perfil. Podés dejar tu reseña igualmente.</p>
                <Link href={`/escribir-resena?empresa=${company.id}`} className="btn-secondary w-full py-2 text-xs text-center block">Escribir reseña</Link>
              </div>
            ))}

            {ads.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-brand-slate uppercase tracking-wide mb-2 px-1">Para profesionales del rubro</p>
                {ads.map(ad => <AdCard key={ad.id} ad={ad} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function ReviewsList({ companyId }: { companyId: string }) {
  const [reviewsList, setReviewsList] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  useState(() => {
    reviewsApi.list(companyId, verifiedOnly ? { verified: 'true' } : {}).then(d => { setReviewsList(d.reviews); setLoading(false) }).catch(() => setLoading(false))
  })

  if (loading) return <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="card p-4 h-24 animate-pulse bg-gray-50" />)}</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => setVerifiedOnly(!verifiedOnly)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${verifiedOnly ? 'bg-brand-green-dim border-brand-green text-brand-green-text' : 'bg-white border-gray-200 text-brand-slate'}`}>
          <i className="ti ti-shield-check text-xs" />Solo verificadas
        </button>
      </div>
      {reviewsList.length === 0 ? (
        <div className="card p-8 text-center"><i className="ti ti-message-circle text-3xl text-gray-200 block mb-2" /><p className="text-sm text-brand-slate">Sin reseñas todavía. ¡Sé el primero!</p></div>
      ) : reviewsList.map(review => <ReviewItem key={review.id} review={review} />)}
    </div>
  )
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue text-xs font-semibold flex-shrink-0">{review.user.name.charAt(0)}</div>
          <div><p className="text-sm font-semibold text-brand-dark">{review.user.name}</p><p className="text-xs text-brand-slate">{new Date(review.createdAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long' })}</p></div>
        </div>
        {review.isVerified && <span className="badge-verified text-xs flex-shrink-0"><span className="badge-verified-dot" />Verificada</span>}
      </div>
      <div className="flex items-center gap-1 mb-2">{[1,2,3,4,5].map(n => <span key={n} className={n <= review.rating ? 'star-filled' : 'star-empty'}>★</span>)}</div>
      {review.title && <p className="text-sm font-semibold text-brand-dark mb-1">{review.title}</p>}
      <p className="text-sm text-brand-slate leading-relaxed">{review.body}</p>
      {review.proofType && <div className="mt-2 flex items-center gap-1.5 text-xs text-brand-amber"><i className="ti ti-file-check text-sm" />Comprobante: {review.proofType}</div>}
      {review.response && (
        <div className="mt-3 pt-3 border-t border-gray-50 bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-brand-dark mb-1 flex items-center gap-1"><i className="ti ti-building text-xs text-brand-green" />Respuesta de la empresa</p>
          <p className="text-xs text-brand-slate leading-relaxed">{review.response.body}</p>
        </div>
      )}
    </div>
  )
}

function AdCard({ ad }: { ad: Ad }) {
  const handleClick = async () => {
    try { const { ads: adsApi } = await import('@/lib/api'); const result = await adsApi.click(ad.id) as any; if (result.redirectUrl) window.open(result.redirectUrl, '_blank') }
    catch (e) { console.error(e) }
  }
  return (
    <div className="card p-3 border border-brand-amber/20 mb-2">
      <div className="flex items-start gap-3">
        <img src={ad.imageUrl} alt={ad.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-100" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1"><p className="text-xs font-semibold text-brand-dark leading-tight">{ad.title}</p><span className="text-xs text-brand-amber bg-brand-amber-dim px-1.5 py-0.5 rounded flex-shrink-0">Patrocinado</span></div>
          <p className="text-xs text-brand-slate mt-0.5 line-clamp-2">{ad.description}</p>
          {ad.price && <p className="text-sm font-bold text-brand-green mt-1">USD {ad.price.toFixed(2)}</p>}
          <button onClick={handleClick} className="mt-2 text-xs btn-dark py-1.5 px-3">{ad.ctaText}</button>
        </div>
      </div>
    </div>
  )
}
