'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { admin as adminApi, categories as categoriesApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { COUNTRIES } from '@/lib/countries'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'reseñas', label: 'Reseñas' },
  { id: 'empresas', label: 'Empresas', adminOnly: true },
  { id: 'anuncios', label: 'Anuncios' },
  { id: 'denuncias', label: 'Denuncias' },
  { id: 'rubros', label: 'Rubros sugeridos' },
  { id: 'categorias', label: 'Categorías', adminOnly: true },
  { id: 'ingresos', label: 'Ingresos', adminOnly: true },
  { id: 'colaboradores', label: 'Colaboradores', adminOnly: true },
] as const
type Tab = typeof TABS[number]['id']
type EmpresasFilter = { plan?: 'FREE' | 'PROFESSIONAL' | 'PREMIUM' | 'ENTERPRISE'; boosted?: boolean; leadsMonth?: boolean }

export default function AdminPage() {
  const { user, authChecked } = useAuthStore()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('resumen')
  const [empresasFilter, setEmpresasFilter] = useState<EmpresasFilter | null>(null)
  const [counts, setCounts] = useState<{ pendingReviews: number; reportedReviews: number; pendingAds: number; pendingDisputes: number; pendingCategorySuggestions: number } | null>(null)
  const isStaff = !!user && (user.role === 'ADMIN' || user.role === 'COLLABORATOR')
  const isAdmin = !!user && user.role === 'ADMIN'

  const loadCounts = () => adminApi.pendingCounts().then(setCounts).catch(() => {})
  useEffect(() => {
    if (!authChecked || !isStaff) return
    loadCounts()
    const interval = setInterval(loadCounts, 60000) // refresca solo, sin que tengan que recargar la página
    return () => clearInterval(interval)
  }, [authChecked, isStaff])

  useEffect(() => {
    if (!authChecked) return
    if (!isStaff) { router.push('/'); return }
  }, [authChecked, isStaff])

  if (!isStaff) return null

  const visibleTabs = TABS.filter((t) => !('adminOnly' in t && t.adminOnly) || isAdmin)

  const badgeFor: Partial<Record<Tab, number>> = counts ? {
    reseñas: counts.pendingReviews + counts.reportedReviews,
    anuncios: counts.pendingAds,
    denuncias: counts.pendingDisputes,
    rubros: counts.pendingCategorySuggestions,
  } : {}

  // Navega a una pestaña y, si es Empresas, la deja pre-filtrada (ej: por plan,
  // o por "con perfil destacado activo") — así las tarjetas de otras pestañas
  // llevan directo al contenido relacionado en vez de a la lista completa.
  const goToEmpresas = (filter?: EmpresasFilter) => { setEmpresasFilter(filter || null); setTab('empresas') }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-dark mb-1">Panel de administrador</h1>
      <p className="text-sm text-brand-slate mb-6">{isAdmin ? 'Moderación, empresas, anuncios e ingresos de Tratto.' : 'Moderación de reseñas, anuncios, denuncias y rubros sugeridos.'}</p>

      <div className="flex gap-1 border-b border-gray-100 mb-6 overflow-x-auto">
        {visibleTabs.map((t) => {
          const count = badgeFor[t.id]
          return (
            <button key={t.id} onClick={() => { if (t.id === 'empresas') setEmpresasFilter(null); setTab(t.id) }} className={`relative text-sm px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${tab === t.id ? 'border-brand-green text-brand-dark font-semibold' : 'border-transparent text-brand-slate hover:text-brand-dark'}`}>
              {t.label}
              {!!count && <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-red text-white text-[10px] font-bold align-middle">{count > 99 ? '99+' : count}</span>}
            </button>
          )
        })}
      </div>

      {tab === 'resumen' && <ResumenTab onNavigate={setTab} isAdmin={isAdmin} />}
      {tab === 'reseñas' && <ReseñasTab onChanged={loadCounts} />}
      {tab === 'empresas' && <EmpresasTab isAdmin={isAdmin} initialFilter={empresasFilter} />}
      {tab === 'anuncios' && <AnunciosTab onChanged={loadCounts} />}
      {tab === 'denuncias' && <DenunciasTab onChanged={loadCounts} />}
      {tab === 'rubros' && <RubrosTab onChanged={loadCounts} />}
      {tab === 'categorias' && isAdmin && <CategoriasTab />}
      {tab === 'ingresos' && isAdmin && <IngresosTab onNavigateToEmpresas={goToEmpresas} />}
      {tab === 'colaboradores' && isAdmin && <ColaboradoresTab currentUserId={user!.id} />}
    </div>
  )
}

function ResumenTab({ onNavigate, isAdmin }: { onNavigate: (t: Tab) => void; isAdmin: boolean }) {
  const [data, setData] = useState<any>(null)
  useEffect(() => { adminApi.dashboard().then(setData).catch(() => {}) }, [])
  if (!data) return <Loading />

  type Card = { label: string; value: any; sub?: string; warn?: boolean; tab?: Tab; adminOnly?: boolean }
  const cards: Card[] = [
    { label: 'Empresas totales', value: data.stats.totalCompanies, sub: `+${data.stats.newCompaniesMonth} este mes`, tab: 'empresas', adminOnly: true } satisfies Card,
    { label: 'Usuarios totales', value: data.stats.totalUsers, sub: `+${data.stats.newUsersMonth} este mes`, adminOnly: true } satisfies Card,
    { label: 'Reseñas pendientes', value: data.stats.pendingReviews, sub: `${data.stats.reportedReviews} reportadas`, warn: data.stats.pendingReviews > 0, tab: 'reseñas' } satisfies Card,
    { label: 'Anuncios pendientes', value: data.stats.pendingAds, warn: data.stats.pendingAds > 0, tab: 'anuncios' } satisfies Card,
    { label: 'Suscripciones activas', value: data.stats.activeSubscriptions, tab: 'ingresos', adminOnly: true } satisfies Card,
    { label: 'MRR', value: `USD ${data.stats.mrr}`, tab: 'ingresos', adminOnly: true } satisfies Card,
    { label: 'Reseñas verificadas', value: `${data.stats.verifiedPct}%`, sub: `${data.stats.verifiedReviews} de ${data.stats.totalReviews}`, tab: 'reseñas' } satisfies Card,
    { label: 'Denuncias pendientes', value: data.stats.pendingDisputes, warn: data.stats.pendingDisputes > 0, tab: 'denuncias' } satisfies Card,
    { label: 'Rubros por revisar', value: data.stats.pendingCategorySuggestions, warn: data.stats.pendingCategorySuggestions > 0, tab: 'rubros' } satisfies Card,
  ].filter((c) => !c.adminOnly || isAdmin)

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
                onClick={r.type === 'claim' && isAdmin ? () => onNavigate('empresas') : undefined}
                className={`flex items-center justify-between text-xs border-t border-gray-50 pt-2 first:border-0 first:pt-0 ${r.type === 'claim' && isAdmin ? 'cursor-pointer hover:text-brand-dark' : ''}`}
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

function EmpresasTab({ isAdmin, initialFilter }: { isAdmin: boolean; initialFilter: EmpresasFilter | null }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'recent' | 'claimed'>('recent')
  const [filter, setFilter] = useState<EmpresasFilter>(initialFilter || {})
  const [data, setData] = useState<{ companies: any[]; pagination: any } | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Si llegamos con un filtro nuevo desde otra pestaña (ej: clickeando "Perfiles
  // destacados activos" en Ingresos), lo tomamos como punto de partida.
  useEffect(() => { if (initialFilter) setFilter(initialFilter) }, [initialFilter])

  const load = () => {
    setLoading(true)
    const params: Record<string, string> = { sort }
    if (search) params.search = search
    if (filter.plan) params.plan = filter.plan
    if (filter.boosted) params.boosted = 'true'
    if (filter.leadsMonth) params.leadsMonth = 'true'
    adminApi.companies(params).then(setData).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [sort, filter])

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

  const activeFilterLabel = filter.plan ? `Plan ${filter.plan}` : filter.boosted ? 'Con perfil destacado activo' : filter.leadsMonth ? 'Con consultas cobradas este mes' : null

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input placeholder="Buscar por nombre o RUT..." className="input text-sm flex-1" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="btn-secondary text-sm py-2 px-4">Buscar</button>
      </form>

      <div className="flex gap-2 flex-wrap items-center">
        {([{ id: 'recent', label: 'Más recientes' }, { id: 'claimed', label: 'Reclamadas recientemente' }] as const).map((s) => (
          <button key={s.id} onClick={() => setSort(s.id)} className={`text-xs py-1.5 px-3 rounded-full border transition-all ${sort === s.id ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate'}`}>{s.label}</button>
        ))}
        {activeFilterLabel && (
          <span className="text-xs py-1.5 px-3 rounded-full bg-brand-blue-dim text-brand-blue font-semibold flex items-center gap-1.5">
            {activeFilterLabel}
            <button onClick={() => setFilter({})} className="hover:opacity-70"><i className="ti ti-x text-xs" /></button>
          </span>
        )}
      </div>

      {loading ? <Loading /> : !data || data.companies.length === 0 ? (
        <div className="card p-8 text-center text-sm text-brand-slate">No se encontraron empresas{activeFilterLabel ? ' con ese filtro' : ''}.</div>
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
                <p className="text-xs text-brand-slate truncate">
                  {c.category?.name} · {c.owner?.email || 'sin reclamar'} · {c._count.reviews} reseñas
                  {sort === 'claimed' && c.claimedAt ? ` · reclamada el ${new Date(c.claimedAt).toLocaleDateString('es-AR')}` : ''}
                  {filter.leadsMonth ? ` · ${c._count.leads} consultas este mes` : ''}
                  {filter.boosted ? ` · ${c._count.boosts} boost activo` : ''}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => handleVerify(c.id, !c.isVerified)} disabled={busyId === c.id} className="text-xs text-brand-green hover:underline disabled:opacity-50">{c.isVerified ? 'Quitar verificación' : 'Verificar'}</button>
                {isAdmin && <button onClick={() => handleSuspend(c.id, c.name)} disabled={busyId === c.id} className="text-xs text-brand-red hover:underline disabled:opacity-50">Suspender</button>}
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
  const [emoji, setEmoji] = useState<Record<string, string>>({})

  const load = () => adminApi.categorySuggestions('PENDING').then((d: any) => setSuggestions(d.suggestions)).catch(() => setSuggestions([]))
  useEffect(() => {
    load()
    categoriesApi.list().then((d: any) => setCategoryOptions(d.categories)).catch(() => {})
  }, [])

  const handleApprove = async (id: string) => {
    setBusyId(id)
    try { await adminApi.resolveCategorySuggestion(id, 'approve', pickExisting[id] || undefined, pickExisting[id] ? undefined : (emoji[id] || undefined)); load(); onChanged() }
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
            {!pickExisting[s.id] && (
              <input
                maxLength={4} placeholder="🏷️" value={emoji[s.id] || ''}
                onChange={(e) => setEmoji((prev) => ({ ...prev, [s.id]: e.target.value }))}
                title="Ícono de la tarjeta (opcional — si lo dejás vacío, usa uno genérico)"
                className="input text-sm w-14 text-center py-1.5"
              />
            )}
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

function CategoriasTab() {
  const [categories, setCategories] = useState<any[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingEmoji, setEditingEmoji] = useState<Record<string, string>>({})
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', emoji: '', phase: 1, isHidden: true })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [similar, setSimilar] = useState<any[] | null>(null)

  const load = () => adminApi.categories().then((d: any) => setCategories(d.categories)).catch(() => setCategories([]))
  useEffect(() => { load() }, [])

  const submitCreate = async (force: boolean) => {
    setError('')
    setCreating(true)
    try {
      const res: any = await adminApi.createCategory({ name: form.name.trim(), emoji: form.emoji.trim() || '🏷️', phase: form.phase, isHidden: form.isHidden, force })
      if (res.needsConfirmation) { setSimilar(res.similar); return }
      setForm({ name: '', emoji: '', phase: 1, isHidden: true })
      setShowForm(false)
      setSimilar(null)
      load()
    }
    catch (e: any) { setError(e.message || 'No se pudo crear') }
    finally { setCreating(false) }
  }

  const handleCreate = async (e: React.FormEvent) => { e.preventDefault(); await submitCreate(false) }

  const handleToggleHidden = async (id: string, isHidden: boolean) => {
    setBusyId(id)
    try { await adminApi.updateCategory(id, { isHidden: !isHidden }); load() }
    catch (e: any) { alert(e.message) }
    finally { setBusyId(null) }
  }

  const handleSaveEmoji = async (id: string) => {
    const value = editingEmoji[id]
    if (!value) return
    setBusyId(id)
    try { await adminApi.updateCategory(id, { emoji: value }); setEditingEmoji((prev) => { const next = { ...prev }; delete next[id]; return next }); load() }
    catch (e: any) { alert(e.message) }
    finally { setBusyId(null) }
  }

  if (!categories) return <Loading />

  const byPhase = categories.reduce((acc: Record<number, any[]>, c) => { (acc[c.phase] ||= []).push(c); return acc }, {})

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-dark">Categorías</p>
          {!showForm && <button onClick={() => setShowForm(true)} className="btn-secondary text-xs py-1.5 px-3"><i className="ti ti-plus" /> Nueva categoría</button>}
        </div>
        <p className="text-xs text-brand-slate mt-1">Las que están "Activa" ya son visibles y buscables en tratto.lat/categorias, y elegibles al registrar una empresa. Las "Oculta" aparecen ahí como "Próximamente" — activalas cuando estén listas para lanzar.</p>

        {showForm && (
          <form onSubmit={handleCreate} className="space-y-3 mt-4 border-t border-gray-100 pt-4">
            <div className="grid sm:grid-cols-[1fr_80px_120px] gap-3">
              <div><label className="label">Nombre</label><input required placeholder="Ej: Jardineros" className="input text-sm" value={form.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setSimilar(null) }} /></div>
              <div><label className="label">Ícono</label><input maxLength={4} placeholder="🌱" className="input text-sm text-center" value={form.emoji} onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))} /></div>
              <div>
                <label className="label">Fase</label>
                <select className="input text-sm" value={form.phase} onChange={(e) => setForm((f) => ({ ...f, phase: Number(e.target.value) }))}>
                  <option value={1}>Fase 1</option>
                  <option value={2}>Fase 2</option>
                  <option value={3}>Fase 3</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-brand-slate">
              <input type="checkbox" checked={!form.isHidden} onChange={(e) => setForm((f) => ({ ...f, isHidden: !e.target.checked }))} />
              Activarla ya (si la dejás sin marcar, nace oculta como "Próximamente")
            </label>
            {error && <p className="text-xs text-brand-red">{error}</p>}
            {similar ? (
              <div className="bg-brand-amber-dim border border-brand-amber/30 rounded-lg p-3 text-xs text-brand-dark">
                <p className="font-semibold mb-1">Ya hay {similar.length === 1 ? 'una categoría parecida' : 'categorías parecidas'}:</p>
                <ul className="list-disc list-inside mb-2">
                  {similar.map((c) => <li key={c.id}>{c.name}{c.isHidden ? ' (oculta)' : ''}</li>)}
                </ul>
                <p className="mb-2">¿Seguro que "{form.name.trim()}" es un rubro distinto y no lo mismo con otro nombre?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => submitCreate(true)} disabled={creating} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50">Sí, crear igual</button>
                  <button type="button" onClick={() => setSimilar(null)} className="text-xs text-brand-slate hover:underline">Mejor no</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button type="submit" disabled={creating} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">{creating ? 'Creando...' : 'Crear categoría'}</button>
                <button type="button" onClick={() => { setShowForm(false); setError(''); setSimilar(null) }} className="text-xs text-brand-slate hover:underline">Cancelar</button>
              </div>
            )}
          </form>
        )}
      </div>

      {Object.keys(byPhase).sort((a, b) => Number(a) - Number(b)).map((phase) => (
        <div key={phase}>
          <p className="text-xs font-semibold text-brand-slate uppercase tracking-wider mb-2">Fase {phase}</p>
          <div className="space-y-2">
            {byPhase[Number(phase)].map((c) => (
              <div key={c.id} className="card p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    maxLength={4}
                    value={editingEmoji[c.id] ?? c.emoji}
                    onChange={(e) => setEditingEmoji((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    onBlur={() => editingEmoji[c.id] !== undefined && editingEmoji[c.id] !== c.emoji && handleSaveEmoji(c.id)}
                    className="input text-lg w-12 text-center py-1"
                    title="Ícono de la tarjeta — escribí un emoji y salí del campo para guardarlo"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">{c.name}</p>
                    <p className="text-xs text-brand-slate truncate">{c._count.companies} empresas{c.priority ? ' · prioritaria' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.isHidden ? 'bg-gray-100 text-brand-slate' : 'bg-brand-green-dim text-brand-green'}`}>{c.isHidden ? 'Oculta' : 'Activa'}</span>
                  <button onClick={() => handleToggleHidden(c.id, c.isHidden)} disabled={busyId === c.id} className={`text-xs hover:underline disabled:opacity-50 ${c.isHidden ? 'text-brand-green' : 'text-brand-red'}`}>
                    {c.isHidden ? 'Activar' : 'Ocultar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function IngresosTab({ onNavigateToEmpresas }: { onNavigateToEmpresas: (filter?: EmpresasFilter) => void }) {
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
            <button
              key={s.plan}
              onClick={() => onNavigateToEmpresas({ plan: s.plan })}
              className="w-full flex items-center justify-between text-sm border-t border-gray-50 pt-2 first:border-0 first:pt-0 text-left hover:bg-gray-50 rounded-lg -mx-2 px-2 transition-colors"
            >
              <span className="text-brand-dark">{s.plan}</span>
              <span className="text-brand-slate">{s._count} activas · USD {s._sum.amountUsd || 0}/mes</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onNavigateToEmpresas({ leadsMonth: true })} className="card p-4 text-left hover:shadow-md transition-shadow">
          <p className="text-xs text-brand-slate">Consultas cobradas este mes</p>
          <p className="text-lg font-bold text-brand-dark">{data.leadsCount} · USD {data.leadsRevenue}</p>
        </button>
        <button onClick={() => onNavigateToEmpresas({ boosted: true })} className="card p-4 text-left hover:shadow-md transition-shadow">
          <p className="text-xs text-brand-slate">Perfiles destacados activos</p>
          <p className="text-lg font-bold text-brand-dark">{data.boostsCount}</p>
        </button>
      </div>
    </div>
  )
}

function ColaboradoresTab({ currentUserId }: { currentUserId: string }) {
  const [staff, setStaff] = useState<any[] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'COLLABORATOR' as 'ADMIN' | 'COLLABORATOR', country: 'UY', phone: '' })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => adminApi.staff().then((d: any) => setStaff(d.staff)).catch(() => setStaff([]))
  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setNotice('')
    setAdding(true)
    try {
      const res: any = await adminApi.inviteStaff({ name: form.name.trim(), email: form.email.trim(), role: form.role, country: form.country, phone: form.phone.trim() || undefined })
      setForm({ name: '', email: '', role: 'COLLABORATOR', country: 'UY', phone: '' })
      setShowForm(false)
      setNotice(res.message)
      load()
    }
    catch (e: any) { setError(e.message || 'No se pudo agregar') }
    finally { setAdding(false) }
  }

  const handleRoleChange = async (id: string, role: 'ADMIN' | 'COLLABORATOR') => {
    setBusyId(id)
    try { await adminApi.updateStaffRole(id, role); load() }
    catch (e: any) { alert(e.message) }
    finally { setBusyId(null) }
  }

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`¿Quitarle el acceso al panel a "${name}"?`)) return
    setBusyId(id)
    try { await adminApi.removeStaff(id); load() }
    catch (e: any) { alert(e.message) }
    finally { setBusyId(null) }
  }

  const handleResend = async (id: string) => {
    setBusyId(id)
    setNotice('')
    try { const res: any = await adminApi.resendStaffInvite(id); setNotice(res.message) }
    catch (e: any) { alert(e.message) }
    finally { setBusyId(null) }
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-brand-dark">Administradores y colaboradores</p>
          {!showForm && <button onClick={() => setShowForm(true)} className="btn-secondary text-xs py-1.5 px-3"><i className="ti ti-plus" /> Agregar colaborador</button>}
        </div>

        {notice && <p className="text-xs text-brand-green-text bg-brand-green-dim rounded-lg px-3 py-2 mt-3">{notice}</p>}

        {showForm && (
          <form onSubmit={handleAdd} className="space-y-3 mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs text-brand-slate">Cargá sus datos y le mandamos un email para que active su cuenta con su propia contraseña. Si el email ya tiene cuenta en Tratto, le damos acceso directo (sin invitación).</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Nombre</label><input required placeholder="Nombre y apellido" className="input text-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div><label className="label">Email</label><input type="email" required placeholder="email@ejemplo.com" className="input text-sm" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
              <div>
                <label className="label">Rol</label>
                <select className="input text-sm" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'ADMIN' | 'COLLABORATOR' }))}>
                  <option value="COLLABORATOR">Colaborador (moderación)</option>
                  <option value="ADMIN">Administrador (acceso total)</option>
                </select>
              </div>
              <div>
                <label className="label">País</label>
                <select className="input text-sm" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                </select>
              </div>
              <div><label className="label">Teléfono (opcional)</label><input placeholder="Ej: 099123456" className="input text-sm" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            {error && <p className="text-xs text-brand-red">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={adding} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">{adding ? 'Enviando...' : 'Agregar y enviar invitación'}</button>
              <button type="button" onClick={() => { setShowForm(false); setError('') }} className="text-xs text-brand-slate hover:underline">Cancelar</button>
            </div>
          </form>
        )}
      </div>

      {!staff ? <Loading /> : (
        <div className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-brand-dark truncate">{s.name} {s.id === currentUserId && <span className="text-brand-slate font-normal">(vos)</span>}</p>
                  {s.pending && <span className="text-xs px-2 py-0.5 rounded-full bg-brand-amber-dim text-brand-amber flex-shrink-0">Invitación pendiente</span>}
                </div>
                <p className="text-xs text-brand-slate truncate">{s.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {s.pending && <button onClick={() => handleResend(s.id)} disabled={busyId === s.id} className="text-xs text-brand-green hover:underline disabled:opacity-50">Reenviar invitación</button>}
                <select
                  value={s.role}
                  disabled={busyId === s.id}
                  onChange={(e) => handleRoleChange(s.id, e.target.value as 'ADMIN' | 'COLLABORATOR')}
                  className="text-xs border border-gray-200 rounded-full py-1.5 px-3 text-brand-slate disabled:opacity-50"
                >
                  <option value="COLLABORATOR">Colaborador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                <button onClick={() => handleRemove(s.id, s.name)} disabled={busyId === s.id} className="text-xs text-brand-red hover:underline disabled:opacity-50">Quitar acceso</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Loading() {
  return <div className="text-center py-12"><i className="ti ti-loader-2 animate-spin text-2xl text-brand-slate" /></div>
}
