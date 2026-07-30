'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ads as adsApi, categories as categoriesApi, upload, subscriptions as paymentsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AGE_RANGES, GENDERS, INCOME_LEVELS } from '@/lib/targeting'
import { CountryPhoneInput } from '@/components/CountryPhoneInput'
import { isValidPhoneNumber } from 'libphonenumber-js'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://tratto-api-dk42.onrender.com'
const COUNTRIES = [{ code: 'UY', name: 'Uruguay' }, { code: 'AR', name: 'Argentina' }, { code: 'CL', name: 'Chile' }, { code: 'MX', name: 'México' }, { code: 'CO', name: 'Colombia' }, { code: 'PE', name: 'Perú' }, { code: 'BR', name: 'Brasil' }]

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'En revisión', className: 'bg-brand-amber-dim text-brand-amber' },
  ACTIVE: { label: 'Activo', className: 'bg-brand-green-dim text-brand-green' },
  PAUSED: { label: 'Pausado', className: 'bg-gray-100 text-brand-slate' },
  REJECTED: { label: 'Rechazado', className: 'bg-red-50 text-brand-red' },
  EXHAUSTED: { label: 'Sin saldo', className: 'bg-red-50 text-brand-red' },
}

export default function AdsClient() {
  const { user, authChecked } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [account, setAccount] = useState<any>(null)
  const [myAds, setMyAds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingAd, setEditingAd] = useState<any>(null)
  const [showRecharge, setShowRecharge] = useState(false)
  const [categoryOptions, setCategoryOptions] = useState<any[]>([])
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [expandedPixel, setExpandedPixel] = useState<string | null>(null)

  const load = () => {
    adsApi.my().then((data: any) => { setAccount(data.account); setMyAds(data.ads) }).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!authChecked) return
    if (!user) { router.push('/login'); return }
    load()
    categoriesApi.list().then((data: any) => setCategoryOptions(data.categories)).catch(() => {})
  }, [authChecked])

  const handleToggleStatus = async (id: string) => {
    setTogglingId(id)
    try { await adsApi.toggleStatus(id); load() }
    catch (err: any) { alert(err.message) }
    finally { setTogglingId(null) }
  }

  if (!user) return null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Tratto Ads</h1>
          <p className="text-sm text-brand-slate mt-1">Mostrá tu negocio a los usuarios correctos, en el momento correcto.</p>
        </div>
        <Link href="/" className="text-sm text-brand-slate hover:text-brand-dark">← Volver</Link>
      </div>

      {searchParams.get('recharged') && <div className="bg-brand-green-dim border border-brand-green/20 rounded-lg px-4 py-3 mb-4 text-sm text-brand-dark">✓ Saldo recargado correctamente.</div>}
      {searchParams.get('error') && <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4 text-sm text-brand-red">Hubo un problema con el pago. Probá de nuevo.</div>}

      {loading ? (
        <div className="text-center py-12"><i className="ti ti-loader-2 animate-spin text-2xl text-brand-slate" /></div>
      ) : (
        <div className="space-y-4">
          <div className="card p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-brand-slate">Saldo disponible</p>
              <p className="text-2xl font-bold text-brand-dark">USD {(account?.balance || 0).toFixed(2)}</p>
            </div>
            <button onClick={() => setShowRecharge(!showRecharge)} className="btn-secondary text-sm py-2 px-4">Recargar saldo</button>
          </div>

          {showRecharge && <RechargeForm onClose={() => setShowRecharge(false)} />}

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-dark">Mis anuncios</p>
            <button onClick={() => { setShowCreate(!showCreate); setEditingAd(null) }} className="btn-primary text-sm py-2 px-4">{showCreate ? 'Cancelar' : '+ Crear anuncio'}</button>
          </div>

          {showCreate && !editingAd && <CreateAdForm categoryOptions={categoryOptions} onCreated={() => { setShowCreate(false); load() }} />}
          {editingAd && <CreateAdForm categoryOptions={categoryOptions} existingAd={editingAd} onCreated={() => { setEditingAd(null); load() }} onCancel={() => setEditingAd(null)} />}

          <div className="space-y-3">
            {myAds.length === 0 && !showCreate && <div className="card p-8 text-center text-sm text-brand-slate">Todavía no tenés ningún anuncio. Creá el primero arriba.</div>}
            {myAds.map((ad) => {
              const status = STATUS_LABELS[ad.status] || STATUS_LABELS.PENDING
              const pixelUrl = `${API_BASE}/api/ads/${ad.id}/convert`
              return (
                <div key={ad.id} className="card p-4">
                  <div className="flex gap-4">
                    <img src={ad.imageUrls?.[0]} alt={ad.title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-brand-dark truncate">{ad.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${status.className}`}>{status.label}</span>
                      </div>
                      <p className="text-xs text-brand-slate truncate mb-2">{ad.description}</p>
                      <div className="flex gap-4 text-xs text-brand-slate flex-wrap">
                        <span>{ad.impressions} vistas</span>
                        <span>{ad.clicks} clics</span>
                        <span>{ad.conversions} conversiones</span>
                        <span>USD {ad.totalSpent.toFixed(2)} gastado</span>
                        <span>{ad.model === 'CPC' ? `USD ${ad.cpcUsd}/clic` : `USD ${ad.cpmUsd || 0}/mil vistas`}</span>
                      </div>
                      {ad.rejectionNote && <p className="text-xs text-brand-red mt-2">Motivo del rechazo: {ad.rejectionNote}</p>}
                      <div className="flex gap-3 mt-3">
                        {(ad.status === 'ACTIVE' || ad.status === 'PAUSED') && (
                          <button onClick={() => handleToggleStatus(ad.id)} disabled={togglingId === ad.id} className="text-xs text-brand-green hover:underline disabled:opacity-50">{ad.status === 'ACTIVE' ? 'Pausar' : 'Reanudar'}</button>
                        )}
                        <button onClick={() => { setEditingAd(ad); setShowCreate(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="text-xs text-brand-slate hover:underline">Editar</button>
                        <button onClick={() => setExpandedPixel(expandedPixel === ad.id ? null : ad.id)} className="text-xs text-brand-slate hover:underline">Pixel de conversión</button>
                      </div>
                    </div>
                  </div>
                  {expandedPixel === ad.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-brand-slate mb-2">Pegá esto en la página de "gracias por tu compra" de tu sitio para medir conversiones reales, no solo clics:</p>
                      <code className="block bg-gray-50 rounded-lg p-3 text-xs break-all">{`<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`}</code>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function RechargeForm({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState('20')
  const [provider, setProvider] = useState<'STRIPE' | 'DLOCALGO'>('STRIPE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const data = await paymentsApi.rechargeAds(Number(amount), provider)
      window.location.href = data.checkoutUrl
    } catch (err: any) { setError(err.message); setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-3">
      <p className="text-sm font-semibold text-brand-dark">Recargar saldo</p>
      {error && <p className="text-xs text-brand-red">{error}</p>}
      <div className="flex gap-2">
        <input type="number" min={20} max={500} required className="input text-sm flex-1" value={amount} onChange={e => setAmount(e.target.value)} />
        <select className="input text-sm w-40" value={provider} onChange={e => setProvider(e.target.value as any)}>
          <option value="STRIPE">Tarjeta internacional</option>
          <option value="DLOCALGO">dLocal Go</option>
        </select>
      </div>
      <p className="text-xs text-brand-slate">Mínimo USD 20, máximo USD 500 por recarga.</p>
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">{loading ? 'Redirigiendo...' : 'Ir a pagar'}</button>
        <button type="button" onClick={onClose} className="text-sm text-brand-slate hover:underline">Cancelar</button>
      </div>
    </form>
  )
}

function toLocalDatetimeInput(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function CreateAdForm({ categoryOptions, onCreated, existingAd, onCancel }: { categoryOptions: any[]; onCreated: () => void; existingAd?: any; onCancel?: () => void }) {
  const isEditing = !!existingAd
  const [form, setForm] = useState({
    title: existingAd?.title || '', description: existingAd?.description || '', price: existingAd?.price ? String(existingAd.price) : '',
    ctaText: existingAd?.ctaText || 'Consultar precio', ctaUrl: existingAd?.ctaUrl || '', model: (existingAd?.model || 'CPC') as 'CPC' | 'CPM',
    dailyBudget: existingAd ? String(existingAd.dailyBudget) : '5', companyName: existingAd?.adAccount?.companyName || '',
    startsAt: toLocalDatetimeInput(existingAd?.startsAt), endsAt: toLocalDatetimeInput(existingAd?.endsAt),
  })
  const [whatsappCountry, setWhatsappCountry] = useState(existingAd?.whatsappCountry || 'UY')
  const [whatsappNumber, setWhatsappNumber] = useState(existingAd?.whatsappNumber || '')
  const [phoneCountry, setPhoneCountry] = useState(existingAd?.phoneCountry || 'UY')
  const [phoneNumber, setPhoneNumber] = useState(existingAd?.phoneNumber || '')
  const [contactEmail, setContactEmail] = useState(existingAd?.contactEmail || '')
  const [websiteUrl, setWebsiteUrl] = useState(existingAd?.websiteUrl || '')
  const [imageUrls, setImageUrls] = useState<string[]>(existingAd?.imageUrls || [])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [categoryIds, setCategoryIds] = useState<string[]>(existingAd?.targetCategories?.map((tc: any) => tc.categoryId) || [])
  const [targetCountries, setTargetCountries] = useState<string[]>(existingAd?.targetCountries?.length ? existingAd.targetCountries : ['UY'])
  const [ageRanges, setAgeRanges] = useState<string[]>(existingAd?.targetAgeRanges || [])
  const [genders, setGenders] = useState<string[]>(existingAd?.targetGenders || [])
  const [interests, setInterests] = useState<string[]>(existingAd?.targetInterests || [])
  const [incomeLevels, setIncomeLevels] = useState<string[]>(existingAd?.targetIncomeLevels || [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const toggle = (arr: string[], setArr: (v: string[]) => void, value: string) =>
    setArr(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imageUrls.length >= 3) { setError('Máximo 3 imágenes por anuncio'); return }
    setUploadingImage(true); setError('')
    try { const data = await upload.adImage(file); setImageUrls((prev) => [...prev, data.url]) }
    catch (err: any) { setError(err.message) }
    finally { setUploadingImage(false); e.target.value = '' }
  }

  const handleRemoveImage = (index: number) => setImageUrls((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (imageUrls.length === 0) { setError('Subí al menos una imagen para el anuncio'); return }
    if (categoryIds.length === 0) { setError('Elegí al menos un rubro'); return }
    if (targetCountries.length === 0) { setError('Elegí al menos un país'); return }
    if (!whatsappNumber) { setError('El WhatsApp es obligatorio'); return }
    if (!isValidPhoneNumber(whatsappNumber, whatsappCountry as any)) { setError(`Ingresá un WhatsApp válido para ${whatsappCountry}.`); return }
    if (!phoneNumber) { setError('El teléfono es obligatorio'); return }
    if (!isValidPhoneNumber(phoneNumber, phoneCountry as any)) { setError(`Ingresá un teléfono válido para ${phoneCountry}.`); return }
    if (!contactEmail) { setError('El email de contacto es obligatorio'); return }
    if (!websiteUrl) { setError('El sitio web es obligatorio'); return }

    setSubmitting(true)
    try {
      const payload: any = {
        ...form,
        imageUrls,
        price: form.price ? Number(form.price) : undefined,
        dailyBudget: Number(form.dailyBudget),
        ctaUrl: form.ctaUrl || undefined,
        whatsappCountry, whatsappNumber, phoneCountry, phoneNumber, contactEmail, websiteUrl,
        categoryIds, targetCountries,
        targetAgeRanges: ageRanges, targetGenders: genders, targetInterests: interests, targetIncomeLevels: incomeLevels,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      }
      let result: any
      if (isEditing) { delete payload.companyName; result = await adsApi.update(existingAd.id, payload) }
      else result = await adsApi.create(payload)
      setSuccess(result.message)
      setTimeout(onCreated, 1500)
    } catch (err: any) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  if (success) {
    return <div className="card p-6 text-center"><i className="ti ti-circle-check text-3xl text-brand-green block mb-2" /><p className="text-sm text-brand-dark">{success}</p></div>
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      {isEditing && <p className="text-xs text-brand-amber bg-brand-amber-dim px-3 py-2 rounded-lg">Editando "{existingAd.title}" — al guardar, vuelve a revisión antes de mostrarse de nuevo.</p>}
      {error && <p className="text-xs text-brand-red">{error}</p>}

      <div>
        <label className="label">Imágenes del anuncio <span className="font-normal normal-case text-gray-400">(hasta 3)</span></label>
        <div className="flex gap-2 flex-wrap mb-2">
          {imageUrls.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt={`preview ${i + 1}`} className="w-20 h-20 rounded-lg object-cover" />
              <button type="button" onClick={() => handleRemoveImage(i)} className="absolute -top-1.5 -right-1.5 bg-brand-dark text-white w-5 h-5 rounded-full text-xs leading-none">✕</button>
            </div>
          ))}
        </div>
        {imageUrls.length < 3 && <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} disabled={uploadingImage} className="text-sm" />}
        {uploadingImage && <p className="text-xs text-brand-slate mt-1">Subiendo...</p>}
      </div>

      {!isEditing && <div><label className="label">Nombre de tu empresa/marca</label><input required className="input text-sm" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} /></div>}
      <div><label className="label">Título del anuncio</label><input required maxLength={80} className="input text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
      <div><label className="label">Descripción</label><textarea required maxLength={300} rows={2} className="input text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Precio (opcional)</label><input type="number" className="input text-sm" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
        <div><label className="label">Texto del botón</label><input className="input text-sm" value={form.ctaText} onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))} /></div>
        <div><label className="label">Link de destino (opcional)</label><input type="url" placeholder="https://..." className="input text-sm" value={form.ctaUrl} onChange={e => setForm(f => ({ ...f, ctaUrl: e.target.value }))} /></div>
        <div>
          <label className="label">Modelo de cobro</label>
          <select className="input text-sm" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value as any }))}>
            <option value="CPC">Por clic (CPC)</option>
            <option value="CPM">Por cada mil vistas (CPM)</option>
          </select>
        </div>
      </div>

      <div><label className="label">Presupuesto diario (USD, mínimo 3)</label><input type="number" min={3} required className="input text-sm w-32" value={form.dailyBudget} onChange={e => setForm(f => ({ ...f, dailyBudget: e.target.value }))} /></div>

      <div className="pt-2 border-t border-gray-100">
        <p className="text-sm font-semibold text-brand-dark mb-1">Datos de contacto <span className="font-normal text-xs text-brand-red">(obligatorios)</span></p>
        <p className="text-xs text-brand-slate mb-3">El botón principal del anuncio abre WhatsApp directo. Los otros tres datos aparecen en la ficha ampliada para quien quiera contactarte por otro medio.</p>
        <div className="space-y-3">
          <CountryPhoneInput label="WhatsApp" countryCode={whatsappCountry} number={whatsappNumber} onCountryChange={setWhatsappCountry} onNumberChange={setWhatsappNumber} />
          <CountryPhoneInput label="Teléfono" countryCode={phoneCountry} number={phoneNumber} onCountryChange={setPhoneCountry} onNumberChange={setPhoneNumber} />
          <div><label className="label">Email de contacto</label><input type="email" required className="input text-sm" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
          <div><label className="label">Sitio web</label><input type="url" required placeholder="https://..." className="input text-sm" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} /></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Empieza (opcional)</label><input type="datetime-local" className="input text-sm" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} /></div>
        <div><label className="label">Termina (opcional)</label><input type="datetime-local" className="input text-sm" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} /></div>
      </div>
      <p className="text-xs text-brand-slate -mt-2">Sin fecha, la campaña corre sin límite de tiempo (hasta que se te acabe el saldo o la pauses).</p>

      <div>
        <label className="label">Rubros</label>
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((c) => (
            <button key={c.id} type="button" onClick={() => toggle(categoryIds, setCategoryIds, c.id)} className={`text-xs py-1.5 px-3 rounded-full border transition-all ${categoryIds.includes(c.id) ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate'}`}>{c.name}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Países</label>
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map((c) => (
            <button key={c.code} type="button" onClick={() => toggle(targetCountries, setTargetCountries, c.code)} className={`text-xs py-1.5 px-3 rounded-full border transition-all ${targetCountries.includes(c.code) ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate'}`}>{c.name}</button>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100">
        <p className="text-sm font-semibold text-brand-dark mb-1">Segmentación por público <span className="font-normal text-xs text-brand-slate">(opcional — sin elegir nada, le llega a todos)</span></p>
        <p className="text-xs text-brand-slate mb-3">Solo se cruza contra usuarios que cargaron estos datos en su perfil — a los que no los cargaron, este anuncio no les va a llegar si elegís algún filtro acá.</p>

        <div className="space-y-3">
          <div>
            <label className="label">Rango de edad</label>
            <div className="flex flex-wrap gap-2">
              {AGE_RANGES.map((r) => <button key={r.value} type="button" onClick={() => toggle(ageRanges, setAgeRanges, r.value)} className={`text-xs py-1.5 px-3 rounded-full border transition-all ${ageRanges.includes(r.value) ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate'}`}>{r.label}</button>)}
            </div>
          </div>
          <div>
            <label className="label">Género</label>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => <button key={g.value} type="button" onClick={() => toggle(genders, setGenders, g.value)} className={`text-xs py-1.5 px-3 rounded-full border transition-all ${genders.includes(g.value) ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate'}`}>{g.label}</button>)}
            </div>
          </div>
          <div>
            <label className="label">Intereses</label>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((c) => <button key={c.slug} type="button" onClick={() => toggle(interests, setInterests, c.slug)} className={`text-xs py-1.5 px-3 rounded-full border transition-all ${interests.includes(c.slug) ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate'}`}>{c.name}</button>)}
            </div>
          </div>
          <div>
            <label className="label">Nivel de ingresos</label>
            <div className="flex flex-wrap gap-2">
              {INCOME_LEVELS.map((l) => <button key={l.value} type="button" onClick={() => toggle(incomeLevels, setIncomeLevels, l.value)} className={`text-xs py-1.5 px-3 rounded-full border transition-all ${incomeLevels.includes(l.value) ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate'}`}>{l.label}</button>)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={submitting || uploadingImage} className="btn-primary flex-1 py-3 text-sm disabled:opacity-50">{submitting ? 'Enviando...' : isEditing ? 'Guardar cambios' : 'Enviar a revisión'}</button>
        {isEditing && onCancel && <button type="button" onClick={onCancel} className="text-sm text-brand-slate hover:underline px-4">Cancelar</button>}
      </div>
    </form>
  )
}
