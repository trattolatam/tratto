'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { companies as companiesApi, reviews as reviewsApi, leads as leadsApi, upload, ai as aiApi } from '@/lib/api'

const TAX_ID_LABELS: Record<string, string> = { UY: 'RUT', AR: 'CUIT', CL: 'RUT', MX: 'RFC', CO: 'NIT', PE: 'RUC', BR: 'CNPJ' }

export default function PanelPage() {
  const { user, fetchMe } = useAuthStore()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [pendingReviews, setPendingReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'leads' | 'competencia' | 'editar'>('overview')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [downloadingCert, setDownloadingCert] = useState(false)
  const [intel, setIntel] = useState<any>(null)
  const [loadingIntel, setLoadingIntel] = useState(false)
  const [logoError, setLogoError] = useState('')
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [respondBody, setRespondBody] = useState('')
  const [respondSubmitting, setRespondSubmitting] = useState(false)
  const [respondError, setRespondError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [summaryMsg, setSummaryMsg] = useState('')
  const [summaryError, setSummaryError] = useState('')
  const [showContactsModal, setShowContactsModal] = useState(false)
  const [contactReveals, setContactReveals] = useState<any[] | null>(null)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [myLeads, setMyLeads] = useState<any[] | null>(null)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [companyDetails, setCompanyDetails] = useState<any>(null)
  const [editForm, setEditForm] = useState({ description: '', phone: '', website: '', email: '', address: '', taxId: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editMsg, setEditMsg] = useState('')
  const [editErr, setEditErr] = useState('')

  const handleLogoClick = () => logoInputRef.current?.click()

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setLogoError('Solo se aceptan imágenes JPG, PNG o WEBP'); return }
    if (file.size > 5 * 1024 * 1024) { setLogoError('El archivo supera el límite de 5MB'); return }
    setUploadingLogo(true); setLogoError('')
    try {
      await upload.companyLogo(file)
      await fetchMe()
      if (user?.company) companiesApi.get(user.company.slug).then(data => setCompanyDetails(data.company))
    } catch (err: any) { setLogoError(err.message || 'Error subiendo el logo') }
    finally { setUploadingLogo(false); if (logoInputRef.current) logoInputRef.current.value = '' }
  }

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'BUSINESS' && user.role !== 'ADMIN') { router.push('/'); return }
    const companyId = user.company?.id
    if (!companyId) { router.push('/reclamar'); return }

    Promise.all([companiesApi.stats(companyId), reviewsApi.list(companyId, { limit: '5' })])
      .then(([statsData, reviewsData]) => { setStats(statsData); setPendingReviews(reviewsData.reviews) })
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (activeTab !== 'editar' || !user?.company || companyDetails) return
    companiesApi.get(user.company.slug).then(data => {
      setCompanyDetails(data.company)
      setEditForm({
        description: data.company.description || '', phone: data.company.phone || '',
        website: data.company.website || '', email: data.company.email || '', address: data.company.address || '',
        taxId: data.company.taxId || '',
      })
    }).catch(() => {})
  }, [activeTab, user])

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.company) return
    setSavingEdit(true); setEditMsg(''); setEditErr('')
    try {
      const body: any = { ...editForm }
      if (!body.website) delete body.website
      if (!body.email) delete body.email
      if (body.taxId) { body.taxIdType = TAX_ID_LABELS[companyDetails?.country] || 'RUT' } else { delete body.taxId }
      const { company: updated } = await companiesApi.update(user.company.id, body)
      setCompanyDetails(updated)
      setEditMsg('Perfil actualizado con éxito.')
      setTimeout(() => router.push(`/empresa/${user.company!.slug}`), 1200)
    } catch (err: any) { setEditErr(err.message || 'Error actualizando el perfil') }
    finally { setSavingEdit(false) }
  }

  if (!user || loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center"><i className="ti ti-loader-2 animate-spin text-3xl text-brand-slate block mb-3" /><p className="text-sm text-brand-slate">Cargando tu panel...</p></div>

  const company = user.company!
  const isPro = ['PROFESSIONAL', 'PREMIUM', 'ENTERPRISE'].includes(company.plan)
  const isPremium = ['PREMIUM', 'ENTERPRISE'].includes(company.plan)

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true); setSummaryError(''); setSummaryMsg('')
    try { const result = await aiApi.generateSummary(company.id); setSummaryMsg(result.message) }
    catch (err: any) { setSummaryError(err.message || 'Error al generar el resumen') }
    finally { setGeneratingSummary(false) }
  }

  const refreshCompanyDetails = () => { if (user?.company) companiesApi.get(user.company.slug).then(data => setCompanyDetails(data.company)) }

  const handlePhotoClick = () => photoInputRef.current?.click()

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setPhotoError('Solo se aceptan imágenes JPG, PNG o WEBP'); return }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('El archivo supera el límite de 5MB'); return }
    setUploadingPhoto(true); setPhotoError('')
    try { await upload.companyPhoto(file); refreshCompanyDetails() }
    catch (err: any) { setPhotoError(err.message || 'Error subiendo la foto') }
    finally { setUploadingPhoto(false); if (photoInputRef.current) photoInputRef.current.value = '' }
  }

  const handleDeletePhoto = async (url: string) => {
    try { await upload.deleteCompanyPhoto(url); refreshCompanyDetails() }
    catch (err: any) { setPhotoError(err.message || 'Error borrando la foto') }
  }

  const handleOpenLeads = async () => {
    setActiveTab('leads')
    if (!isPro || myLeads) return
    setLoadingLeads(true)
    try { const data = await leadsApi.my(); setMyLeads(data.leads) }
    catch (err) { console.error(err) }
    finally { setLoadingLeads(false) }
  }

  const handleOpenContacts = async () => {
    setShowContactsModal(true)
    if (!isPremium || contactReveals) return
    setLoadingContacts(true)
    try { const data = await companiesApi.contactReveals(company.id); setContactReveals(data.reveals) }
    catch (err) { console.error(err) }
    finally { setLoadingContacts(false) }
  }

  const handleRespond = async (reviewId: string) => {
    if (respondBody.trim().length < 5) { setRespondError('Escribí una respuesta un poco más completa.'); return }
    setRespondSubmitting(true); setRespondError('')
    try {
      await reviewsApi.respond(reviewId, respondBody.trim())
      setPendingReviews(prev => prev.map(r => r.id === reviewId ? { ...r, response: { body: respondBody.trim() } } : r))
      setRespondingId(null); setRespondBody('')
    } catch (err: any) { setRespondError(err.message || 'Error al enviar la respuesta') }
    finally { setRespondSubmitting(false) }
  }

  const handleOpenCompetencia = async () => {
    setActiveTab('competencia')
    if (!isPremium || intel) return
    setLoadingIntel(true)
    try { setIntel(await companiesApi.competitiveIntel(company.id)) }
    catch (err: any) { console.error(err) }
    finally { setLoadingIntel(false) }
  }

  const handleDownloadCertificate = async () => {
    setDownloadingCert(true)
    try {
      const blob = await companiesApi.downloadCertificate(company.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `certificado-${company.slug}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) { alert(err.message) }
    finally { setDownloadingCert(false) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {company.logoUrl ? <img src={company.logoUrl} alt={company.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" /> : <div className="w-12 h-12 rounded-xl bg-brand-green/20 flex items-center justify-center text-brand-green font-bold text-lg flex-shrink-0">{company.name.charAt(0)}</div>}
          <div>
            <h1 className="text-xl font-bold text-brand-dark">{company.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {isPro ? <span className="badge-pro"><i className="ti ti-shield-check text-xs" /> {company.plan}</span> : <span className="badge-free">Plan Gratuito</span>}
              {company.isVerified && <span className="badge-verified text-xs"><span className="badge-verified-dot" />Verificada</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/empresa/${company.slug}`} className="btn-secondary text-xs py-2 px-3"><i className="ti ti-external-link text-sm" /> Ver perfil</Link>
          {isPro && <button onClick={handleDownloadCertificate} disabled={downloadingCert} className="btn-secondary text-xs py-2 px-3 disabled:opacity-50"><i className="ti ti-certificate text-sm" /> {downloadingCert ? 'Generando...' : 'Certificado PDF'}</button>}
          {!isPro && <Link href="/precios" className="btn-primary text-xs py-2 px-3"><i className="ti ti-crown text-sm" /> Actualizar plan</Link>}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Calificación', value: (company.ratingAvg ?? 0).toFixed(1), icon: 'ti-star', color: 'text-brand-amber', tab: 'reviews' as const },
            { label: 'Reseñas totales', value: stats.totalReviews, icon: 'ti-message', color: 'text-brand-blue', tab: 'reviews' as const },
            { label: 'Verificadas', value: `${stats.verifiedPct}%`, icon: 'ti-shield-check', color: 'text-brand-green', tab: 'reviews' as const },
            { label: 'Leads este mes', value: stats.leads, icon: 'ti-user-check', color: 'text-brand-dark', tab: null, onClick: () => handleOpenLeads() },
            { label: 'Quisieron tu contacto', value: stats.contactReveals, icon: 'ti-phone-ringing', color: 'text-brand-green', tab: null, onClick: handleOpenContacts },
          ].map(s => <button key={s.label} onClick={() => s.onClick ? s.onClick() : s.tab && setActiveTab(s.tab)} className="card p-4 text-left hover:shadow-card-hover cursor-pointer transition-shadow"><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-brand-slate mt-0.5 flex items-center gap-1"><i className={`ti ${s.icon} text-xs`} /> {s.label}</div></button>)}
        </div>
      )}

      {!isPro && stats && stats.contactReveals > 0 && (
        <div className="bg-brand-dark text-white rounded-xl p-4 mb-4 flex items-center gap-4">
          <i className="ti ti-phone-ringing text-xl text-brand-green flex-shrink-0" />
          <div className="flex-1"><p className="text-sm font-semibold">{stats.contactReveals} {stats.contactReveals === 1 ? 'persona quiso' : 'personas quisieron'} tu teléfono este mes</p><p className="text-xs text-white/60 mt-0.5">Activá Pro para ver quiénes fueron y responderles directo.</p></div>
          <Link href="/precios" className="btn-primary text-xs py-2 px-4 flex-shrink-0 whitespace-nowrap">Activar Pro</Link>
        </div>
      )}

      {!isPro && (
        <div className="bg-brand-dark text-white rounded-xl p-4 mb-6 flex items-center gap-4">
          <i className="ti ti-alert-circle text-xl text-brand-amber flex-shrink-0" />
          <div className="flex-1"><p className="text-sm font-semibold">Tu perfil no tiene botón de contacto</p><p className="text-xs text-white/60 mt-0.5">Los clientes no pueden contactarte directamente. Activá el plan Profesional.</p></div>
          <Link href="/precios" className="btn-primary text-xs py-2 px-4 flex-shrink-0 whitespace-nowrap">Ver planes</Link>
        </div>
      )}

      <div className="flex border-b border-gray-100 gap-4 mb-5">
        {(['overview', 'reviews', 'leads', 'competencia', 'editar'] as const).map(tab => (
          <button key={tab} onClick={() => tab === 'competencia' ? handleOpenCompetencia() : tab === 'leads' ? handleOpenLeads() : setActiveTab(tab)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-brand-green text-brand-green' : 'border-transparent text-brand-slate hover:text-brand-dark'}`}>{{ overview: 'Resumen', reviews: 'Reseñas', leads: 'Consultas', competencia: 'Competencia', editar: 'Editar perfil' }[tab]}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-brand-dark mb-3 flex items-center gap-2"><i className="ti ti-message text-brand-green" /> Reseñas recientes</h2>
            <div className="space-y-2">
              {pendingReviews.length === 0 ? <p className="text-xs text-brand-slate py-4 text-center">Sin reseñas todavía</p> : pendingReviews.slice(0, 3).map(r => (
                <div key={r.id} className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5"><span className="text-xs font-semibold text-brand-dark">{r.user.name}</span>{r.isVerified && <span className="badge-verified text-xs py-0"><span className="badge-verified-dot" />Verificada</span>}</div>
                    <p className="text-xs text-brand-slate truncate mt-0.5">{r.body}</p>
                  </div>
                  <div className="text-brand-amber text-sm flex-shrink-0">{'★'.repeat(r.rating)}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setActiveTab('reviews')} className="text-xs text-brand-green hover:underline mt-2">Ver todas →</button>
          </div>
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-brand-dark mb-3 flex items-center gap-2"><i className="ti ti-bolt text-brand-amber" /> Acciones rápidas</h2>
            <div className="space-y-2">
              <Link href={`/empresa/${company.slug}`} className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm text-brand-dark"><i className="ti ti-eye text-brand-slate" /> Ver mi perfil público</Link>
              {isPro && (
                <>
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
                  <button onClick={handleLogoClick} disabled={uploadingLogo} className="w-full flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm text-brand-dark text-left disabled:opacity-50">
                    <i className={`ti ${uploadingLogo ? 'ti-loader-2 animate-spin' : 'ti-upload'} text-brand-slate`} /> {uploadingLogo ? 'Subiendo...' : 'Subir logo'}
                  </button>
                  {logoError && <p className="text-xs text-brand-red px-2.5">{logoError}</p>}
                  <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                  <button onClick={handlePhotoClick} disabled={uploadingPhoto} className="w-full flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm text-brand-dark text-left disabled:opacity-50">
                    <i className={`ti ${uploadingPhoto ? 'ti-loader-2 animate-spin' : 'ti-photo-plus'} text-brand-slate`} /> {uploadingPhoto ? 'Subiendo...' : 'Subir foto de trabajo'}
                  </button>
                  {photoError && <p className="text-xs text-brand-red px-2.5">{photoError}</p>}
                  {company.reviewCount >= 5 && (
                    <button onClick={handleGenerateSummary} disabled={generatingSummary} className="w-full flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm text-brand-dark text-left disabled:opacity-50">
                      <i className={`ti ${generatingSummary ? 'ti-loader-2 animate-spin' : 'ti-sparkles'} text-brand-slate`} /> {generatingSummary ? 'Generando...' : 'Generar resumen IA'}
                    </button>
                  )}
                  {summaryMsg && <p className="text-xs text-brand-green px-2.5">{summaryMsg}</p>}
                  {summaryError && <p className="text-xs text-brand-red px-2.5">{summaryError}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {pendingReviews.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1"><span className="text-sm font-semibold text-brand-dark">{r.user.name}</span>{r.isVerified && <span className="badge-verified text-xs"><span className="badge-verified-dot" />Verificada</span>}<span className="text-brand-amber">{'★'.repeat(r.rating)}</span></div>
                  <p className="text-sm text-brand-slate">{r.body}</p>
                  {r.photos && r.photos.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {r.photos.map((p: string, i: number) => <img key={i} src={p} alt="" className="w-16 h-16 rounded-lg object-cover" />)}
                    </div>
                  )}
                </div>
              </div>
              {r.response && respondingId !== r.id && (
                <div className="mt-3 pt-3 border-t border-gray-50 bg-gray-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-brand-dark mb-1"><i className="ti ti-corner-down-right text-xs" /> Tu respuesta</p>
                      <p className="text-xs text-brand-slate">{r.response.body}</p>
                    </div>
                    {isPro && <button onClick={() => { setRespondingId(r.id); setRespondBody(r.response.body); setRespondError('') }} className="text-xs text-brand-slate hover:text-brand-green flex items-center gap-1 flex-shrink-0"><i className="ti ti-pencil text-xs" /> Editar</button>}
                  </div>
                </div>
              )}
              {isPro && !r.response && respondingId !== r.id && <div className="mt-3 pt-3 border-t border-gray-50"><button onClick={() => { setRespondingId(r.id); setRespondBody(''); setRespondError('') }} className="text-xs text-brand-green hover:underline flex items-center gap-1"><i className="ti ti-message-reply text-xs" /> Responder esta reseña</button></div>}
              {isPro && respondingId === r.id && (
                <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
                  <textarea autoFocus rows={3} placeholder="Escribí tu respuesta pública..." className="input text-sm" value={respondBody} onChange={e => setRespondBody(e.target.value)} />
                  {respondError && <p className="text-xs text-brand-red">{respondError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => handleRespond(r.id)} disabled={respondSubmitting} className="btn-primary text-xs py-2 px-4 disabled:opacity-50">{respondSubmitting ? 'Guardando...' : r.response ? 'Guardar cambios' : 'Publicar respuesta'}</button>
                    <button onClick={() => { setRespondingId(null); setRespondError('') }} className="btn-secondary text-xs py-2 px-4">Cancelar</button>
                  </div>
                </div>
              )}
              {!isPro && !r.response && <div className="mt-3 pt-3 border-t border-gray-50"><Link href="/precios" className="text-xs text-brand-amber hover:underline flex items-center gap-1"><i className="ti ti-lock text-xs" /> Activá el plan Pro para responder</Link></div>}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'leads' && (
        <>
          {!isPro ? (
            <div className="card p-8 text-center"><i className="ti ti-lock text-4xl text-gray-200 block mb-3" /><p className="text-sm text-brand-dark font-medium mb-1">Función del plan Profesional</p><p className="text-xs text-brand-slate mb-4">Activá el plan Pro para recibir consultas directas.</p><Link href="/precios" className="btn-primary text-sm py-2.5 px-6">Ver planes</Link></div>
          ) : loadingLeads ? (
            <div className="card p-8 text-center"><i className="ti ti-loader-2 animate-spin text-2xl text-brand-slate" /></div>
          ) : myLeads && myLeads.length > 0 ? (
            <div className="space-y-3">
              {myLeads.map((lead: any) => (
                <div key={lead.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="text-sm font-semibold text-brand-dark">{lead.name}</p>
                    <p className="text-xs text-brand-slate flex-shrink-0">{new Date(lead.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <p className="text-sm text-brand-slate mb-2">{lead.message}</p>
                  <div className="flex gap-3 text-xs">
                    {lead.email && <a href={`mailto:${lead.email}`} className="text-brand-blue hover:underline flex items-center gap-1"><i className="ti ti-mail text-xs" /> {lead.email}</a>}
                    {lead.phone && <a href={`tel:${lead.phone}`} className="text-brand-green hover:underline flex items-center gap-1"><i className="ti ti-phone text-xs" /> {lead.phone}</a>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center"><i className="ti ti-inbox text-4xl text-gray-200 block mb-3" /><p className="text-sm text-brand-dark font-medium mb-1">Sin consultas todavía</p><p className="text-xs text-brand-slate">Las consultas de clientes aparecerán acá.</p></div>
          )}
        </>
      )}
      {activeTab === 'competencia' && (
        <div>
          {!isPremium ? (
            <div className="card p-8 text-center">
              <i className="ti ti-lock text-4xl text-gray-200 block mb-3" />
              <p className="text-sm text-brand-dark font-medium mb-1">Función del plan Premium</p>
              <p className="text-xs text-brand-slate mb-4">Comparate contra tu competencia y descubrí tu posición en el ranking.</p>
              <Link href="/precios" className="btn-primary text-sm py-2.5 px-6">Ver planes</Link>
            </div>
          ) : loadingIntel ? (
            <div className="card p-8 text-center"><i className="ti ti-loader-2 animate-spin text-2xl text-brand-slate" /></div>
          ) : intel ? (
            <div className="space-y-4">
              <div className="card p-5">
                <p className="text-xs text-brand-slate mb-4">Comparado con {intel.peerCount} empresas de tu rubro {intel.scope === 'city' ? 'en tu ciudad' : 'en tu país'}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-brand-slate mb-2">Tu calificación</p>
                    <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-brand-dark">{intel.myStats.ratingAvg.toFixed(1)}</span><span className="text-xs text-brand-slate">vs promedio {intel.categoryAvg.ratingAvg.toFixed(1)}</span></div>
                  </div>
                  <div>
                    <p className="text-xs text-brand-slate mb-2">Tus reseñas</p>
                    <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-brand-dark">{intel.myStats.reviewCount}</span><span className="text-xs text-brand-slate">vs promedio {intel.categoryAvg.reviewCount}</span></div>
                  </div>
                </div>
              </div>
              <div className="card p-5">
                <p className="text-sm font-semibold text-brand-dark mb-1">Posición #{intel.rank.position} de {intel.rank.total}</p>
                {intel.companiesAbove.length > 0 ? (
                  <>
                    <p className="text-xs text-brand-slate mb-3">Empresas arriba tuyo en el ranking:</p>
                    <div className="space-y-2">
                      {intel.companiesAbove.map((c: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-t border-gray-50 first:border-0">
                          <span className="text-brand-dark">{c.name}</span>
                          <span className="text-brand-slate">{c.ratingAvg.toFixed(1)} ★ · {c.reviewCount} reseñas</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="text-xs text-brand-slate">¡Estás primero en el ranking de tu rubro!</p>}
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center"><p className="text-sm text-brand-slate">No pudimos cargar la información. Probá de nuevo.</p></div>
          )}
        </div>
      )}
      {activeTab === 'editar' && (
        <div className="max-w-xl space-y-4">
          <div className="card p-6">
            <label className="label mb-2 block">Logo de la empresa</label>
            {isPro ? (
              <div className="flex items-center gap-4">
                {companyDetails?.logoUrl
                  ? <img src={companyDetails.logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  : <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><i className="ti ti-photo text-2xl text-gray-300" /></div>}
                <div>
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
                  <button onClick={handleLogoClick} disabled={uploadingLogo} className="btn-secondary text-xs py-2 px-4 disabled:opacity-50">
                    <i className={`ti ${uploadingLogo ? 'ti-loader-2 animate-spin' : 'ti-upload'} text-sm`} /> {uploadingLogo ? 'Subiendo...' : companyDetails?.logoUrl ? 'Cambiar logo' : 'Agregar logo'}
                  </button>
                  {logoError && <p className="text-xs text-brand-red mt-1.5">{logoError}</p>}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-brand-slate"><i className="ti ti-lock text-sm" /> Disponible en el plan Profesional — <Link href="/precios" className="text-brand-green hover:underline">ver planes</Link></div>
            )}
          </div>

          <div className="card p-6">
            <label className="label mb-2 block">Trabajos realizados</label>
            {isPro ? (
              <>
                <p className="text-xs text-brand-slate mb-3">Mostrales a tus clientes fotos de trabajos que ya hiciste. Hasta 10 fotos.</p>
                <div className="grid grid-cols-4 gap-2">
                  {(companyDetails?.photos || []).map((url: string) => (
                    <div key={url} className="relative group aspect-square">
                      <img src={url} alt="" className="w-full h-full rounded-lg object-cover" />
                      <button onClick={() => handleDeletePhoto(url)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-dark text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i className="ti ti-x" /></button>
                    </div>
                  ))}
                  {(companyDetails?.photos || []).length < 10 && (
                    <button onClick={handlePhotoClick} disabled={uploadingPhoto} className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-brand-green transition-colors disabled:opacity-50">
                      <i className={`ti ${uploadingPhoto ? 'ti-loader-2 animate-spin' : 'ti-plus'} text-xl text-gray-300`} />
                    </button>
                  )}
                </div>
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                {photoError && <p className="text-xs text-brand-red mt-2">{photoError}</p>}
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-brand-slate"><i className="ti ti-lock text-sm" /> Disponible en el plan Profesional — <Link href="/precios" className="text-brand-green hover:underline">ver planes</Link></div>
            )}
          </div>

          <div className="card p-6">
            <label className="label mb-2 block">Resumen IA de tus reseñas</label>
            {isPro ? (
              company.reviewCount < 5 ? (
                <p className="text-xs text-brand-slate">Necesitás al menos 5 reseñas para generar el resumen (tenés {company.reviewCount}).</p>
              ) : (
                <>
                  <p className="text-xs text-brand-slate mb-3">Genera un resumen automático de tus reseñas, visible en tu perfil público.</p>
                  <button onClick={handleGenerateSummary} disabled={generatingSummary} className="btn-secondary text-xs py-2 px-4 disabled:opacity-50">
                    <i className={`ti ${generatingSummary ? 'ti-loader-2 animate-spin' : 'ti-sparkles'} text-sm`} /> {generatingSummary ? 'Generando...' : 'Generar resumen IA'}
                  </button>
                  {summaryMsg && <p className="text-xs text-brand-green mt-2">{summaryMsg}</p>}
                  {summaryError && <p className="text-xs text-brand-red mt-2">{summaryError}</p>}
                </>
              )
            ) : (
              <div className="flex items-center gap-2 text-xs text-brand-slate"><i className="ti ti-lock text-sm" /> Disponible en el plan Profesional — <Link href="/precios" className="text-brand-green hover:underline">ver planes</Link></div>
            )}
          </div>

          <div className="card p-6">
          {!companyDetails ? (
            <div className="text-center py-8"><i className="ti ti-loader-2 animate-spin text-2xl text-brand-slate" /></div>
          ) : (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editErr && <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-brand-red">{editErr}</div>}
              {editMsg && <div className="bg-brand-green-dim border border-brand-green/20 rounded-lg p-3 text-sm text-brand-green">{editMsg}</div>}
              <div><label className="label">Descripción</label><textarea rows={4} className="input" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Contales a tus clientes qué hace tu empresa" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Teléfono</label><input type="text" className="input" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label className="label">Email de contacto</label><input type="email" className="input" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <div><label className="label">Sitio web</label><input type="url" placeholder="https://..." className="input" value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} /></div>
              <div><label className="label">Dirección</label><input type="text" className="input" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div>
                <label className="label">{TAX_ID_LABELS[companyDetails?.country] || 'RUT'} <span className="font-normal normal-case text-gray-400">(opcional, acelera la verificación)</span></label>
                <input type="text" className="input" value={editForm.taxId} onChange={e => setEditForm(f => ({ ...f, taxId: e.target.value }))} />
              </div>
              <button type="submit" disabled={savingEdit} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">{savingEdit ? 'Guardando...' : 'Guardar cambios'}</button>
            </form>
          )}
          </div>
        </div>
      )}

      {showContactsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowContactsModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-brand-dark">Quisieron tu contacto</p>
              <button onClick={() => setShowContactsModal(false)} className="text-brand-slate hover:text-brand-dark"><i className="ti ti-x text-lg" /></button>
            </div>
            <div className="p-4">
              {!isPremium ? (
                <div className="text-center py-6">
                  <i className="ti ti-lock text-3xl text-gray-200 block mb-3" />
                  <p className="text-sm text-brand-dark font-medium mb-1">Función del plan Premium</p>
                  <p className="text-xs text-brand-slate mb-4">Activá Premium para ver quiénes pidieron tu contacto.</p>
                  <Link href="/precios" className="btn-primary text-sm py-2.5 px-6">Ver planes</Link>
                </div>
              ) : loadingContacts ? (
                <div className="text-center py-8"><i className="ti ti-loader-2 animate-spin text-2xl text-brand-slate" /></div>
              ) : contactReveals && contactReveals.length > 0 ? (
                <div className="space-y-3">
                  {contactReveals.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green text-xs font-semibold flex-shrink-0">{r.user ? r.user.name.charAt(0) : '?'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-brand-dark truncate">{r.user ? r.user.name : 'Visitante anónimo'}</p>
                        <p className="text-xs text-brand-slate">{new Date(r.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-brand-slate text-center py-6">Todavía nadie pidió tu contacto este mes.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
