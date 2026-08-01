'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { admin as adminApi, categories as categoriesApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'reseñas', label: 'Reseñas' },
  { id: 'empresas', label: 'Empresas' },
  { id: 'anuncios', label: 'Anuncios' },
  { id: 'denuncias', label: 'Denuncias' },
  { id: 'rubros', label: 'Rubros sugeridos' },
  { id: 'ingresos', label: 'Ingresos' },
] as const
type Tab = typeof TABS[number]['id']

export default function AdminPage() {
  const { user, authChecked } = useAuthStore()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('resumen')
  const [counts, setCounts] = useState<{ pendingReviews: number; reportedReviews: number; pendingAds: number; pendingDisputes: number; pendingCategorySuggestions: number } | null>(null)

  const loadCounts = () => adminApi.pendingCounts().then(setCounts).catch(() => {})
  useEffect(() => {
    if (!authChecked || !user || user.role !== 'ADMIN') return
    loadCounts()
    const interval = setInterval(loadCounts, 60000) // refresca solo, sin que el admin tenga que recargar la página
    return () => clearInterval(interval)
  }, [authChecked, user])

  useEffect(() => {
    if (!authChecked) return
    if (!user || user.role !== 'ADMIN') { router.push('/'); return }
  }, [authChecked, user])

  if (!user || user.role !== 'ADMIN') return null

  const badgeFor: Partial<Record<Tab, number>> = counts ? {
    reseñas: counts.pendingReviews + counts.reportedReviews,
    anuncios: counts.pendingAds,
    denuncias: counts.pendingDisputes,
    rubros: counts.pendingCategorySuggestions,
  } : {}

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-dark mb-1">Panel de administrador</h1>
      <p className="text-sm text-brand-slate mb-6">Moderación, empresas, anuncios e ingresos de Tratto.</p>

      <div className="flex gap-1 border-b border-gray-100 mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const count = badgeFor[t.id]
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`relative text-sm px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${tab === t.id ? 'border-brand-green text-brand-dark font-semibold' : 'border-transparent text-brand-slate hover:text-brand-dark'}`}>
              {t.label}
              {!!count && <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-red text-white text-[10px] font-bold align-middle">{count > 99 ? '99+' : count}</span>}
            </button>
          )
        })}
      </div>

      {tab === 'resumen' && <ResumenTab onNavigate={setTab} />}
      {tab === 'reseñas' && <ReseñasTab onChanged={loadCounts} />}
      {tab === 'empresas' && <EmpresasTab />}
      {tab === 'anuncios' && <AnunciosTab onChanged={loadCounts} />}
      {tab === 'denuncias' && <DenunciasTab onChanged={loadCounts} />}
      {tab === 'rubros' && <RubrosTab onChanged={loadCounts} />}
      {tab === 'ingresos' && <IngresosTab />}
    </div>
  )
}

function ResumenTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [data, setData] = useState<any>(null)
  useEffect(() => { adminApi.dashboard().then(setData).catch(() => {}) }, [])
  if (!data) return <Loading />

  const cards: { label: string; value: any; sub?: string; warn?: boolean; tab?: Tab }[] = [
    { label: 'Empresas totales', value: data.stats.totalCompanies, sub: `+${data.stats.newCompaniesMonth} este mes`, tab: 'empresas' },
    { label: 'Usuarios totales', value: data.stats.totalUsers, sub: `+${data.stats.newUsersMonth} este mes` },
    { label: 'Reseñas pendientes', value: data.stats.pendingReviews, sub: `${data.stats.reportedReviews} reportadas`, warn: data.stats.pendingReviews > 0, tab: 'reseñas' },
    { label: 'Anuncios pendientes', value: data.stats.pendingAds, warn: data.stats.pendingAds > 0, tab: 'anuncios' },
    { label: 'Suscripciones activas', value: data.stats.activeSubscriptions, tab: 'ingresos' },
    { label: 'MRR', value: `USD ${data.stats.mrr}`, tab: 'ingresos' },
    { label: 'Reseñas verificadas', value: `${data.stats.verifiedPct}%`, sub: `${data.stats.verifiedReviews} de ${data.stats.totalReviews}`, tab: 'reseñas' },
    { label: 'Denuncias pendientes', value: data.stats.pendingDisputes, warn: data.stats.pendingDisputes > 0, tab: 'denuncias' },
    { label: 'Rubros por revisar', value: data.stats.pendingCategorySuggestions, warn: data.stats.pendingCategorySuggestions > 0, tab: 'rubros' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            onClick={c.tab ? () => onNavigate(c.tab as Tab) : undefined}
            role={c.tab ? 'button' : undefined}
            tabIndex={c.tab ? 0 : undefined}
            onKeyDown={c.tab ? (e) => { if (e.key === 'Enter') onNavigate(c.tab as Tab) } : undefined}
            className={`card p-4 ${c.warn ? 'border border-brand-amber/30 bg-brand-amber-dim/20' : ''} ${c.tab ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
          >
            <p className="text-xs text-brand-slate">{c.label}</p>
            <p className="text-xl font-bold text-brand-dark mt-1">{c.value}</p>
            {c.sub && <p className="text-xs text-brand-slate mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold text-brand-dark mb-3">Actividad de las últimas 24hs</p>
        {data.recentActivity.length === 0 ? (
          <p className="text-xs text-brand-slate">Sin actividad reciente.</p>
        ) : (
          <div className="space-y-2">
            {data.recentActivity.map((r: any) => (
              <div
                key={`${r.type}-${r.id}`}
                onClick={r.type === 'claim' ? () => onNavigate('empresas') : undefined}
                className={`flex items-center justify-between text-xs border-t border-gray-50 pt-2 first:border-0 first:pt-0 ${r.type === 'claim' ? 'cursor-pointer hover:text-brand-dark' : ''}`}
              >
                <span className="text-brand-dark">
                  {r.type === 'claim'
                    ? <>{r.user?.name || 'Alguien'} reclamó <strong>{r.company.name}</strong> <span className="text-brand-amber font-semibold">· nuevo reclamo</span></>
                    : <>{r.user.name} reseñó <strong>{r.company.name}</strong></>}
                </span>
                <span className="text-brand-slate flex-shrink-0 ml-2">{new Date(r.date).toLocaleString('es-AR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ReseñasTab({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState<'PENDING' | 'REPORTED' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [data, setData] = useState<{ reviews: any[]; pagination: any } | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => { setLoading(true); adminApi.reviews({ status }).then(setData).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [status])

  const handleModerate = async (id: string, approve: boolean) => {
    setBusyId(id)
    try { await adminApi.moderateReview(id, approve ? 'APPROVED' : 'REJECTED'); load(); onChanged() }
    catch (e) { console.error(e) }
    finally { setBusyId(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(['PENDING', 'REPORTED', 'APPROVED', 'REJECTED'] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`text-xs py-1.5 px-3 rounded-full border transition-all ${status === s ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate'}`}>{{ PENDING: 'Pendientes', REPORTED: 'Reportadas', APPROVED: 'Aprobadas', REJECTED: 'Rechazadas' }[s]}</button>
        ))}
      </div>

      {loading ? <Loading /> : !data || data.reviews.length === 0 ? (
        <div className="card p-8 text-center text-sm text-brand-slate">No hay reseñas en este estado.</div>
      ) : (
        <div className="space-y-3">
          {data.reviews.map((r: any) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-brand-dark">{r.user.name} → {r.company.name}</p>
                <span className="text-brand-amber text-xs">{'★'.repeat(r.rating)}</span>
              </div>
              <p className="text-xs text-brand-slate mb-2">{r.user.email} · {r.company.city}, {r.company.country} · {new Date(r.createdAt).toLocaleDateString('es-AR')}</p>
              {r.title && <p className="text-sm font-medium text-brand-dark">{r.title}</p>}
              <p className="text-sm text-brand-slate mt-1">{r.body}</p>
              {(status === 'PENDING' || status === 'REPORTED') && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleModerate(r.id, true)} disabled={busyId === r.id} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50">Aprobar</button>
                  <button onClick={() => handleModerate(r.id, false)} disabled={busyId === r.id} className="text-xs text-brand-red hover:underline">Rechazar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmpresasTab() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'recent' | 'claimed'>('recent')
  const [data, setData] = useState<{ companies: any[]; pagination: any } | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => { setLoading(true); adminApi.companies({ ...(search ? { search } : {}), sort }).then(setData).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [sort])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load() }

  const handleVerify = async (id: string, verified: boolean) => {
    setBusyId(id)
    try { await adminApi.verifyCompany(id, verified); load() }
    catch (e: any) { alert(e.message) }
    finally { setBusyId(null) }
  }

  const handleSuspend = async (id: string, name: string) => {
    if (!confirm(`¿Suspender a "${name}"? Se le ocultan las reseñas aprobadas y se cancela su suscripción.`)) return
    setBusyId(id)
    try { await adminApi.suspendCompany(id); load() }
    catch (e: any) { alert(e.message) }
    finally { setBusyId(null) }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input placeholder="Buscar por nombre o RUT..." className="input text-sm flex-1" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="btn-secondary text-sm py-2 px-4">Buscar</button>
      </form>

      <div className="flex gap-2">
        {([{ id: 'recent', label: 'Más recientes' }, { id: 'claimed', label: 'Reclamadas recientemente' }] as const).map((s) => (
          <button key={s.id} onClick={() => setSort(s.id)} className={`text-xs py-1.5 px-3 rounded-full border transition-all ${sort === s.id ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate'}`}>{s.label}</button>
        ))}
      </div>

      {loading ? <Loading /> : !data || data.companies.length === 0 ? (
        <div className="card p-8 text-center text-sm text-brand-slate">No se encontraron empresas.</div>
      ) : (
        <div className="space-y-2">
          {data.companies.map((c: any) => (
            <div key={c.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-brand-dark truncate">{c.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-brand-slate flex-shrink-0">{c.plan}</span>
                  {c.isVerified && <span className="text-xs px-2 py-0.5 rounded-full bg-brand-green-dim text-brand-green flex-shrink-0">Verificada</span>}
                </div>
                <p className="text-xs text-brand-slate truncate">{c.category?.name} · {c.owner?.email || 'sin reclamar'} · {c._count.reviews} reseñas{sort === 'claimed' && c.claimedAt ? ` · reclamada el ${new Date(c.claimedAt).toLocaleDateString('es-AR')}` : ''}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => handleVerify(c.id, !c.isVerified)} disabled={busyId === c.id} className="text-xs text-brand-green hover:underline disabled:opacity-50">{c.isVerified ? 'Quitar verificación' : 'Verificar'}</button>
                <button onClick={() => handleSuspend(c.id, c.name)} disabled={busyId === c.id} className="text-xs text-brand-red hover:underline disabled:opacity-50">Suspender</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AnunciosTab({ onChanged }: { onChanged: () => void }) {
  const [ads, setAds] = useState<any[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => adminApi.pendingAds().then((d: any) => setAds(d.ads)).catch(() => setAds([]))
  useEffect(() => { load() }, [])

  const handleModerate = async (id: string, approve: boolean) => {
    setBusyId(id)
    try { await adminApi.moderateAd(id, approve ? 'ACTIVE' : 'REJECTED'); load(); onChanged() }
    catch (e) { console.error(e) }
    finally { setBusyId(null) }
  }

  if (!ads) return <Loading />
  if (ads.length === 0) return <div className="card p-8 text-center text-sm text-brand-slate">No hay anuncios pendientes de revisión.</div>

  return (
    <div className="space-y-3">
      {ads.map((ad) => (
        <div key={ad.id} className="card p-4 flex gap-4">
          <img src={ad.imageUrls?.[0]} alt={ad.title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-brand-dark">{ad.title}</p>
            <p className="text-xs text-brand-slate mb-1">{ad.adAccount.companyName} · {ad.model} · USD {ad.dailyBudget}/día</p>
            <p className="text-xs text-brand-slate mb-2">{ad.description}</p>
            <p className="text-xs text-brand-slate mb-3">Rubros: {ad.targetCategories.map((tc: any) => tc.category.name).join(', ')} · Países: {ad.targetCountries.join(', ')}</p>
            <div className="flex gap-2">
              <button onClick={() => handleModerate(ad.id, true)} disabled={busyId === ad.id} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50">Aprobar</button>
              <button onClick={() => handleModerate(ad.id, false)} disabled={busyId === ad.id} className="text-xs text-brand-red hover:underline">Rechazar</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function DenunciasTab({ onChanged }: { onChanged: () => void }) {
  const [disputes, setDisputes] = useState<any[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => adminApi.claimDisputes('PENDING').then((d: any) => setDisputes(d.disputes)).catch(() => setDisputes([]))
  useEffect(() => { load() }, [])

  const handleResolve = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    try { await adminApi.resolveClaimDispute(id, action); load(); onChanged() }
    catch (e) { console.error(e) }
    finally { setBusyId(null) }
  }

  if (!disputes) return <Loading />
  if (disputes.length === 0) return <div className="card p-8 text-center text-sm text-brand-slate">No hay denuncias pendientes.</div>

  return (
    <div className="space-y-3">
      {disputes.map((d) => (
        <div key={d.id} className="card p-4">
          <p className="text-sm font-semibold text-brand-dark">{d.company.name}</p>
          <p className="text-xs text-brand-slate mb-2">Reclamado por {d.company.owner?.email} · Denunciado por {d.disputedBy.name} ({d.disputedBy.email})</p>
          <p className="text-sm text-brand-dark mb-3">{d.reason}</p>
          <div className="flex gap-2">
            <button onClick={() => handleResolve(d.id, 'approve')} disabled={busyId === d.id} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50">Aprobar denuncia (revocar reclamo)</button>
            <button onClick={() => handleResolve(d.id, 'reject')} disabled={busyId === d.id} className="text-xs text-brand-slate hover:underline">Rechazar denuncia</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function RubrosTab({ onChanged }: { onChanged: () => void }) {
  const [suggestions, setSuggestions] = useState<any[] | null>(null)
  const [categoryOptions, setCategoryOptions] = useState<any[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pickExisting, setPickExisting] = useState<Record<string, string>>({})

  const load = () => adminApi.categorySuggestions('PENDING').then((d: any) => setSuggestions(d.suggestions)).catch(() => setSuggestions([]))
  useEffect(() => {
    load()
    categoriesApi.list().then((d: any) => setCategoryOptions(d.categories)).catch(() => {})
  }, [])

  const handleApprove = async (id: string) => {
    setBusyId(id)
    try { await adminApi.resolveCategorySuggestion(id, 'approve', pickExisting[id] || undefined); load(); onChanged() }
    catch (e: any) { alert(e.message) }
    finally { setBusyId(null) }
  }

  const handleReject = async (id: string) => {
    setBusyId(id)
    try { await adminApi.resolveCategorySuggestion(id, 'reject'); load(); onChanged() }
    catch (e: any) { alert(e.message) }
    finally { setBusyId(null) }
  }

  if (!suggestions) return <Loading />
  if (suggestions.length === 0) return <div className="card p-8 text-center text-sm text-brand-slate">No hay rubros sugeridos pendientes.</div>

  return (
    <div className="space-y-3">
      <p className="text-xs text-brand-slate">Cuando una empresa se registra con un rubro que no existe todavía en Tratto, queda acá esperando que se decida si se crea como rubro nuevo o si en realidad corresponde a uno que ya existe.</p>
      {suggestions.map((s) => (
        <div key={s.id} className="card p-4">
          <p className="text-sm font-semibold text-brand-dark">{s.company.name}</p>
          <p className="text-xs text-brand-slate mb-2">{s.company.city}, {s.company.country} · sugirió: <strong className="text-brand-dark">"{s.suggestedName}"</strong></p>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => handleApprove(s.id)} disabled={busyId === s.id} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50">
              {pickExisting[s.id] ? 'Asignar a ese rubro' : `Crear rubro nuevo "${s.suggestedName}"`}
            </button>
            <select className="input text-xs py-1.5 w-48" value={pickExisting[s.id] || ''} onChange={(e) => setPickExisting((prev) => ({ ...prev, [s.id]: e.target.value }))}>
              <option value="">— o asignar a uno existente —</option>
              {categoryOptions.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => handleReject(s.id)} disabled={busyId === s.id} className="text-xs text-brand-red hover:underline">Rechazar</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function IngresosTab() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { adminApi.revenue().then(setData).catch(() => {}) }, [])
  if (!data) return <Loading />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4"><p className="text-xs text-brand-slate">MRR</p><p className="text-xl font-bold text-brand-dark">USD {data.mrr}</p></div>
        <div className="card p-4"><p className="text-xs text-brand-slate">ARR</p><p className="text-xl font-bold text-brand-dark">USD {data.arr}</p></div>
        <div className="card p-4"><p className="text-xs text-brand-slate">Ads este mes</p><p className="text-xl font-bold text-brand-dark">USD {data.adsRevenue}</p></div>
        <div className="card p-4 bg-brand-green-dim"><p className="text-xs text-brand-slate">Total del mes</p><p className="text-xl font-bold text-brand-green">USD {data.totalMonthRevenue}</p></div>
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold text-brand-dark mb-3">Suscripciones activas por plan</p>
        <div className="space-y-2">
          {data.subscriptions.map((s: any) => (
            <div key={s.plan} className="flex items-center justify-between text-sm border-t border-gray-50 pt-2 first:border-0 first:pt-0">
              <span className="text-brand-dark">{s.plan}</span>
              <span className="text-brand-slate">{s._count} activas · USD {s._sum.amountUsd || 0}/mes</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4"><p className="text-xs text-brand-slate">Consultas cobradas este mes</p><p className="text-lg font-bold text-brand-dark">{data.leadsCount} · USD {data.leadsRevenue}</p></div>
        <div className="card p-4"><p className="text-xs text-brand-slate">Perfiles destacados activos</p><p className="text-lg font-bold text-brand-dark">{data.boostsCount}</p></div>
      </div>
    </div>
  )
}

function Loading() {
  return <div className="text-center py-12"><i className="ti ti-loader-2 animate-spin text-2xl text-brand-slate" /></div>
}
