'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { companies, categories, upload } from '@/lib/api'
import { validateTaxId, validatePersonalId } from '@/lib/taxIdValidation'

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
  const { user, setToken } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'search' | 'form' | 'create' | 'success'>('search')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<any>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [categoryList, setCategoryList] = useState<any[]>([])
  const [form, setForm] = useState({ country: 'UY', taxId: '', phone: '', email: '', personalIdNumber: '' })
  const [hasCompanyTaxId, setHasCompanyTaxId] = useState(true)
  const [docUrl, setDocUrl] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', categoryId: '', country: 'UY', city: '', address: '', phone: '', email: '', taxId: '', description: '', website: '' })
  const [suggestingCategory, setSuggestingCategory] = useState(false)
  const [categorySuggestion, setCategorySuggestion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const taxIdConfig = TAX_IDS.find(t => t.country === form.country) || TAX_IDS[0]
  const createTaxIdConfig = TAX_IDS.find(t => t.country === createForm.country) || TAX_IDS[0]
  const taxIdCheck = form.taxId.length > 3 ? validateTaxId(form.country, form.taxId) : null
  const personalIdCheck = form.personalIdNumber.length > 3 ? validatePersonalId(form.country, form.personalIdNumber) : null
  const needsDoc = (hasCompanyTaxId && taxIdCheck?.checksumValid === null) || !hasCompanyTaxId

  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDocFile(file); setUploadingDoc(true); setError('')
    try { const result = await upload.verificationDoc(file); setDocUrl(result.url) }
    catch (err: any) { setError(err.message || 'Error subiendo el documento') }
    finally { setUploadingDoc(false) }
  }

  useEffect(() => { categories.list().then(d => setCategoryList(d.categories)).catch(() => {}) }, [])

  useEffect(() => {
    const slugParam = searchParams.get('slug')
    if (slugParam) {
      if (!user) { router.push(`/registro?role=BUSINESS&slug=${encodeURIComponent(slugParam)}`); return }
      companies.get(slugParam).then(data => { setSearchTerm(data.company.name); handleSearchTerm(data.company.name) }).catch(() => {})
      return
    }
    const preset = searchParams.get('empresa')
    if (!preset) return
    if (searchParams.get('crear') === '1') {
      setSearchTerm(preset)
      setCreateForm(f => ({ ...f, name: preset }))
      setStep('create')
    } else {
      setSearchTerm(preset)
      handleSearchTerm(preset)
    }
  }, [])

  const handleSearchTerm = async (term: string) => {
    if (term.length < 3) return
    setSearching(true); setSearched(false)
    try { const data = await companies.list({ search: term, limit: '5' }); setSearchResults(data.companies) }
    catch (e) { console.error(e) } finally { setSearching(false); setSearched(true) }
  }

  const handleSearch = () => handleSearchTerm(searchTerm)

  const handleSelect = (company: any) => {
    if (!user) { router.push(`/registro?role=BUSINESS&empresa=${encodeURIComponent(searchTerm)}`); return }
    setSelectedCompany(company); setForm(f => ({ ...f, country: company.country })); setStep('form')
  }

  const handleStartCreate = () => {
    if (!user) { router.push(`/registro?role=BUSINESS&empresa=${encodeURIComponent(searchTerm)}&crear=1`); return }
    setCreateForm(f => ({ ...f, name: searchTerm })); setStep('create')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { router.push('/registro?role=BUSINESS'); return }
    if (!selectedCompany) return
    if (!form.phone.trim()) { setError('El teléfono es obligatorio'); return }
    if (hasCompanyTaxId) {
      if (!form.taxId.trim()) { setError(`Ingresá tu ${taxIdConfig.label}`); return }
      if (taxIdCheck && !taxIdCheck.formatValid) { setError(`El formato del ${taxIdConfig.label} no es correcto`); return }
      if (taxIdCheck && taxIdCheck.checksumValid === false) { setError(`Ese ${taxIdConfig.label} no es válido — revisá los dígitos`); return }
    } else if (!form.personalIdNumber.trim()) {
      setError('Ingresá tu número de documento de identidad'); return
    } else if (personalIdCheck && personalIdCheck.checksumValid === false) {
      setError('Ese número de documento no es válido — revisá los dígitos'); return
    }
    if (needsDoc && !docUrl) {
      setError(hasCompanyTaxId ? 'Adjuntá una factura de tu empresa como respaldo' : 'Adjuntá una foto de tu documento de identidad'); return
    }
    setSubmitting(true); setError('')
    try {
      const result = await companies.claim(selectedCompany.id, {
        country: form.country,
        taxId: hasCompanyTaxId ? form.taxId : undefined,
        taxIdType: hasCompanyTaxId ? taxIdConfig.label : undefined,
        personalIdNumber: hasCompanyTaxId ? undefined : form.personalIdNumber,
        verificationDocUrl: docUrl || undefined,
        phone: form.phone, email: form.email || undefined,
      })
      if (result.token) setToken(result.token)
      setStep('success')
    } catch (err: any) { setError(err.message) } finally { setSubmitting(false) }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { router.push('/registro?role=BUSINESS'); return }
    setSubmitting(true); setError('')
    try {
      const result = await companies.create({
        name: createForm.name,
        categoryId: suggestingCategory ? undefined : createForm.categoryId,
        categorySuggestion: suggestingCategory ? categorySuggestion : undefined,
        country: createForm.country,
        city: createForm.city,
        address: createForm.address || undefined,
        phone: createForm.phone || undefined,
        email: createForm.email || undefined,
        website: createForm.website || undefined,
        description: createForm.description || undefined,
        taxId: createForm.taxId || undefined,
        taxIdType: createForm.taxId ? createTaxIdConfig.label : undefined,
      })
      if (result.token) setToken(result.token)
      setStep('success')
    } catch (err: any) { setError(err.message) } finally { setSubmitting(false) }
  }

  if (step === 'success') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-green-dim flex items-center justify-center mx-auto mb-4"><i className="ti ti-circle-check text-3xl text-brand-green" /></div>
        <h1 className="text-xl font-bold text-brand-dark mb-2">¡Perfil listo!</h1>
        <p className="text-sm text-brand-slate mb-8">Verificaremos tus datos en las próximas 24hs.</p>
        <div className="flex gap-3 justify-center"><Link href="/panel" className="btn-primary px-6 py-2.5">Ir a mi panel</Link><Link href="/precios" className="btn-secondary px-6 py-2.5">Ver planes</Link></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-dark mb-2">Reclamar perfil de empresa</h1>
        <p className="text-sm text-brand-slate leading-relaxed">Tu empresa puede que ya aparezca en Tratto. Buscala primero — si no está, la creamos gratis.</p>
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
          {searched && !searching && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-brand-slate mb-3">{searchResults.length > 0 ? '¿No es ninguna de estas?' : 'No encontramos tu empresa.'}</p>
              <button onClick={handleStartCreate} className="btn-secondary px-5 py-2 text-sm">Crear perfil nuevo</button>
            </div>
          )}
        </div>
      )}
      {step === 'form' && selectedCompany && (
        <div className="card p-6">
          {error && <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 text-sm text-brand-red">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 rounded-lg">
              <button type="button" onClick={() => setHasCompanyTaxId(true)} className={`py-2 rounded-md text-sm font-medium transition-colors ${hasCompanyTaxId ? 'bg-white shadow text-brand-dark' : 'text-brand-slate'}`}>Tengo empresa registrada</button>
              <button type="button" onClick={() => setHasCompanyTaxId(false)} className={`py-2 rounded-md text-sm font-medium transition-colors ${!hasCompanyTaxId ? 'bg-white shadow text-brand-dark' : 'text-brand-slate'}`}>Soy independiente</button>
            </div>

            {hasCompanyTaxId ? (
              <>
                <div><label className="label">País</label><select className="input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value, taxId: '' }))}>{TAX_IDS.map(t => <option key={t.country} value={t.country}>{t.country} — {t.label}</option>)}</select></div>
                <div>
                  <label className="label">{taxIdConfig.label}</label>
                  <input type="text" placeholder={taxIdConfig.placeholder} className="input" value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} />
                  {taxIdCheck && form.taxId.length > 3 && (
                    taxIdCheck.checksumValid === true ? <p className="text-xs text-brand-green mt-1 flex items-center gap-1"><i className="ti ti-circle-check text-xs" /> {taxIdConfig.label} válido</p>
                    : taxIdCheck.checksumValid === false ? <p className="text-xs text-brand-red mt-1 flex items-center gap-1"><i className="ti ti-circle-x text-xs" /> Ese {taxIdConfig.label} no es válido, revisá los dígitos</p>
                    : <p className="text-xs text-brand-slate mt-1">No podemos validar el {taxIdConfig.label} de {form.country} automáticamente — vas a necesitar adjuntar una factura.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div><label className="label">País</label><select className="input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value, personalIdNumber: '' }))}>{TAX_IDS.map(t => <option key={t.country} value={t.country}>{t.country}</option>)}</select></div>
                <div>
                  <label className="label">Número de documento de identidad</label>
                  <input type="text" placeholder="Ej: 4.123.456-7" className="input" value={form.personalIdNumber} onChange={e => setForm(f => ({ ...f, personalIdNumber: e.target.value }))} />
                  {personalIdCheck && form.personalIdNumber.length > 3 && (
                    personalIdCheck.checksumValid === true ? <p className="text-xs text-brand-green mt-1 flex items-center gap-1"><i className="ti ti-circle-check text-xs" /> Documento válido</p>
                    : personalIdCheck.checksumValid === false ? <p className="text-xs text-brand-red mt-1 flex items-center gap-1"><i className="ti ti-circle-x text-xs" /> Ese número no es válido, revisá los dígitos</p>
                    : null
                  )}
                  <p className="text-xs text-brand-slate mt-1">Para independientes sin registro de empresa. Vamos a pedirte una foto del documento para verificar manualmente.</p>
                </div>
              </>
            )}

            {needsDoc && (
              <div>
                <label className="label">{hasCompanyTaxId ? 'Factura de tu empresa' : 'Foto de tu documento de identidad'}</label>
                <label className={`block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${docUrl ? 'border-brand-green bg-brand-green-dim' : 'border-gray-200'}`}>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={handleDocChange} disabled={uploadingDoc} />
                  {uploadingDoc ? <span className="text-sm text-brand-slate">Subiendo...</span>
                    : docUrl ? <span className="text-sm text-brand-green font-semibold"><i className="ti ti-circle-check" /> {docFile?.name}</span>
                    : <><i className="ti ti-upload text-xl text-gray-300 block mb-1" /><span className="text-xs text-brand-slate">JPG, PNG, WEBP o PDF · máx 5MB</span></>}
                </label>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Teléfono</label><input type="tel" required className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className="label">Email <span className="font-normal normal-case text-gray-400">(opcional)</span></label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>

            <button type="submit" disabled={submitting || !user || uploadingDoc} className="btn-primary w-full py-3 text-sm disabled:opacity-50">
              {submitting ? 'Enviando...' : 'Reclamar perfil gratis'}
            </button>
            <button type="button" onClick={() => setStep('search')} className="w-full text-xs text-brand-slate text-center">Volver a buscar</button>
          </form>
        </div>
      )}
      {step === 'create' && (
        <div className="card p-6">
          {error && <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 text-sm text-brand-red">{error}</div>}
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div><label className="label">Nombre de la empresa</label><input type="text" required className="input" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} /></div>
            {!suggestingCategory ? (
              <div>
                <label className="label">Rubro</label>
                <select required className="input" value={createForm.categoryId} onChange={e => setCreateForm(f => ({ ...f, categoryId: e.target.value }))}>
                  <option value="">Seleccioná un rubro</option>
                  {categoryList.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
                <button type="button" onClick={() => { setSuggestingCategory(true); setCreateForm(f => ({ ...f, categoryId: '' })) }} className="text-xs text-brand-green mt-2">¿No encontrás tu rubro? Sugerilo</button>
              </div>
            ) : (
              <div>
                <label className="label">Sugerí tu rubro</label>
                <input type="text" required placeholder="Ej: Instalador de paneles solares" className="input" value={categorySuggestion} onChange={e => setCategorySuggestion(e.target.value)} />
                <p className="text-xs text-brand-slate mt-1">Tu empresa queda creada igual — revisaremos el rubro y te la clasificamos en 24-48hs.</p>
                <button type="button" onClick={() => { setSuggestingCategory(false); setCategorySuggestion('') }} className="text-xs text-brand-slate mt-2">Volver a elegir de la lista</button>
              </div>
            )}
            <div><label className="label">Descripción (opcional)</label><textarea rows={3} placeholder="Contales a tus clientes qué hace tu empresa" className="input" value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">País</label><select className="input" value={createForm.country} onChange={e => setCreateForm(f => ({ ...f, country: e.target.value, taxId: '' }))}>{TAX_IDS.map(t => <option key={t.country} value={t.country}>{t.country}</option>)}</select></div>
              <div><label className="label">Ciudad</label><input type="text" required className="input" value={createForm.city} onChange={e => setCreateForm(f => ({ ...f, city: e.target.value }))} /></div>
            </div>
            <div><label className="label">Dirección (opcional)</label><input type="text" className="input" value={createForm.address} onChange={e => setCreateForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div><label className="label">Sitio web (opcional)</label><input type="url" placeholder="https://..." className="input" value={createForm.website} onChange={e => setCreateForm(f => ({ ...f, website: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Teléfono (opcional)</label><input type="text" className="input" value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className="label">Email (opcional)</label><input type="email" className="input" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div><label className="label">{createTaxIdConfig.label} (opcional, acelera la verificación)</label><input type="text" placeholder={createTaxIdConfig.placeholder} className="input" value={createForm.taxId} onChange={e => setCreateForm(f => ({ ...f, taxId: e.target.value }))} /></div>
            <button type="submit" disabled={submitting || !createForm.name || !createForm.city || (suggestingCategory ? !categorySuggestion : !createForm.categoryId)} className="btn-primary w-full py-3 text-sm disabled:opacity-50">
              {submitting ? 'Creando...' : 'Crear perfil gratis'}
            </button>
            <button type="button" onClick={() => setStep('search')} className="w-full text-xs text-brand-slate text-center">Volver a buscar</button>
          </form>
        </div>
      )}
    </div>
  )
}
