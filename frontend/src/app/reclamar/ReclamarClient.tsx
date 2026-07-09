'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { companies } from '@/lib/api'

const TAX_IDS = [
  { country: 'UY', label: 'RUT', placeholder: 'Ej: 21-234567-0001' },
  { country: 'AR', label: 'CUIT', placeholder: 'Ej: 20-12345678-9' },
  { country: 'CL', label: 'RUT', placeholder: 'Ej: 12.345.678-9' },
  { country: 'MX', label: 'RFC', placeholder: 'Ej: XAXX010101000' },
  { country: 'CO', label: 'NIT', placeholder: 'Ej: 900123456-1' },
  { country: 'PE', label: 'RUC', placeholder: 'Ej: 20123456789' },
  { country: 'BR', label: 'CNPJ', placeholder: 'Ej: 12.345.678/0001-90' },
]

export default function ReclamarClient() {
  const { user } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'search' | 'form' | 'success'>('search')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<any>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [form, setForm] = useState({ country: 'UY', taxId: '', phone: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const taxIdConfig = TAX_IDS.find(t => t.country === form.country) || TAX_IDS[0]

  const handleSearch = async () => {
    if (searchTerm.length < 3) return
    setSearching(true)
    try { const data = await companies.list({ search: searchTerm, limit: '5' }); setSearchResults(data.companies) }
    catch (e) { console.error(e) } finally { setSearching(false) }
  }

  const handleSelect = (company: any) => { setSelectedCompany(company); setForm(f => ({ ...f, country: company.country })); setStep('form') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { router.push('/registro?role=BUSINESS'); return }
    if (!selectedCompany) return
    setSubmitting(true); setError('')
    try {
      await companies.claim(selectedCompany.id, { taxId: form.taxId, taxIdType: taxIdConfig.label, phone: form.phone || undefined, email: form.email || undefined })
      setStep('success')
    } catch (err: any) { setError(err.message) } finally { setSubmitting(false) }
  }

  if (step === 'success') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-green-dim flex items-center justify-center mx-auto mb-4"><i className="ti ti-circle-check text-3xl text-brand-green" /></div>
        <h1 className="text-xl font-bold text-brand-dark mb-2">¡Perfil reclamado!</h1>
        <p className="text-sm text-brand-slate mb-8">Verificaremos tu {taxIdConfig.label} en las próximas 24hs.</p>
        <div className="flex gap-3 justify-center"><Link href="/panel" className="btn-primary px-6 py-2.5">Ir a mi panel</Link><Link href="/precios" className="btn-secondary px-6 py-2.5">Ver planes</Link></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-dark mb-2">Reclamar perfil de empresa</h1>
        <p className="text-sm text-brand-slate leading-relaxed">Tu empresa puede que ya aparezca en Tratto. Reclamá el perfil gratis.</p>
      </div>
      {step === 'search' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-brand-dark mb-4">Buscá tu empresa</h2>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="Nombre de tu empresa..." className="input flex-1" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <button onClick={handleSearch} disabled={searching || searchTerm.length < 3} className="btn-primary px-4 py-2 disabled:opacity-50">{searching ? '...' : <i className="ti ti-search text-base" />}</button>
          </div>
          {searchResults.map(company => (
            <button key={company.id} onClick={() => handleSelect(company)} className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-brand-green mb-2 text-left">
              <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center text-brand-green font-bold">{company.name.charAt(0)}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-brand-dark truncate">{company.name}</p><p className="text-xs text-brand-slate">{company.city}, {company.country}</p></div>
              {company.claimedById ? <span className="text-xs text-brand-amber bg-brand-amber-dim px-2 py-0.5 rounded-full">Ya reclamado</span> : <span className="text-xs text-brand-green bg-brand-green-dim px-2 py-0.5 rounded-full">Disponible</span>}
            </button>
          ))}
        </div>
      )}
      {step === 'form' && selectedCompany && (
        <div className="card p-6">
          {error && <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 text-sm text-brand-red">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="label">País</label><select className="input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value, taxId: '' }))}>{TAX_IDS.map(t => <option key={t.country} value={t.country}>{t.country} — {t.label}</option>)}</select></div>
            <div><label className="label">{taxIdConfig.label}</label><input type="text" required placeholder={taxIdConfig.placeholder} className="input" value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} /></div>
            <button type="submit" disabled={submitting || !form.taxId || !user} className="btn-primary w-full py-3 text-sm disabled:opacity-50">
              {submitting ? 'Enviando...' : 'Reclamar perfil gratis'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
