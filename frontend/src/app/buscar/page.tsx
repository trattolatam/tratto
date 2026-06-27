'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CompanyCard, CompanyCardSkeleton } from '@/components/company/CompanyCard'
import { companies as companiesApi } from '@/lib/api'
import { Company } from '@/types'

const COUNTRIES = [{ code: 'UY', name: '🇺🇾 Uruguay' }, { code: 'AR', name: '🇦🇷 Argentina' }, { code: 'CL', name: '🇨🇱 Chile' }, { code: 'MX', name: '🇲🇽 México' }, { code: 'CO', name: '🇨🇴 Colombia' }]

export default function BuscarPage() {
  const searchParams = useSearchParams()
  const [results, setResults] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    search: searchParams.get('q') || '', category: searchParams.get('categoria') || '',
    country: searchParams.get('pais') || '', city: searchParams.get('ciudad') || '', verified: false,
  })

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const params: Record<string, string> = { page: String(page) }
        if (filters.search) params.search = filters.search
        if (filters.category) params.category = filters.category
        if (filters.country) params.country = filters.country
        if (filters.city) params.city = filters.city
        if (filters.verified) params.verified = 'true'
        const data = await companiesApi.list(params)
        setResults(data.companies); setTotal(data.pagination.total)
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    fetch()
  }, [filters, page])

  const updateFilter = (key: string, value: any) => { setFilters(f => ({ ...f, [key]: value })); setPage(1) }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-56 flex-shrink-0">
          <div className="card p-4 sticky top-20">
            <h2 className="text-sm font-semibold text-brand-dark mb-4">Filtros</h2>
            <div className="space-y-4">
              <div><label className="label">País</label>
                <select className="input text-sm" value={filters.country} onChange={e => updateFilter('country', e.target.value)}>
                  <option value="">Todos los países</option>{COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="label">Ciudad</label><input type="text" placeholder="Ej: Montevideo" className="input text-sm" value={filters.city} onChange={e => updateFilter('city', e.target.value)} /></div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateFilter('verified', !filters.verified)} className={`w-9 h-5 rounded-full transition-colors relative ${filters.verified ? 'bg-brand-green' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${filters.verified ? 'left-4' : 'left-0.5'}`} />
                </button>
                <span className="text-xs font-medium text-brand-dark">Solo verificadas</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="relative mb-5">
            <i className="ti ti-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
            <input type="text" placeholder="Buscar electricistas, peluquerías, psicólogos..." className="input pl-10" value={filters.search} onChange={e => updateFilter('search', e.target.value)} />
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-brand-dark">{loading ? 'Buscando...' : `${total.toLocaleString()} empresas encontradas`}</p>
            {filters.verified && <span className="badge-verified text-xs"><span className="badge-verified-dot" />Solo verificadas</span>}
          </div>
          <div className="space-y-3">
            {loading ? Array(6).fill(0).map((_, i) => <CompanyCardSkeleton key={i} />) : results.length === 0 ? (
              <div className="card p-12 text-center"><i className="ti ti-search-off text-4xl text-gray-200 mb-3 block" /><p className="text-sm font-medium text-brand-dark mb-1">Sin resultados</p><p className="text-xs text-brand-slate">Probá con otros términos o filtros</p></div>
            ) : results.map((company, i) => <CompanyCard key={company.id} company={company} rank={page === 1 ? i + 1 : undefined} />)}
          </div>
          {total > 20 && !loading && (
            <div className="flex justify-center gap-2 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-2 px-4 text-sm disabled:opacity-40"><i className="ti ti-chevron-left" /> Anterior</button>
              <span className="flex items-center px-4 text-sm text-brand-slate">Página {page} de {Math.ceil(total / 20)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="btn-secondary py-2 px-4 text-sm disabled:opacity-40">Siguiente <i className="ti ti-chevron-right" /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
