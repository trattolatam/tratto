'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { companies as companiesApi, reviews as reviewsApi, upload } from '@/lib/api'

export default function PanelPage() {
  const { user, fetchMe } = useAuthStore()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [pendingReviews, setPendingReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'leads' | 'editar'>('overview')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [companyDetails, setCompanyDetails] = useState<any>(null)
  const [editForm, setEditForm] = useState({ description: '', phone: '', website: '', email: '', address: '' })
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
          {!isPro && <Link href="/precios" className="btn-primary text-xs py-2 px-3"><i className="ti ti-crown text-sm" /> Actualizar plan</Link>}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Calificación', value: (company.ratingAvg ?? 0).toFixed(1), icon: 'ti-star', color: 'text-brand-amber' },
            { label: 'Reseñas totales', value: stats.totalReviews, icon: 'ti-message', color: 'text-brand-blue' },
            { label: 'Verificadas', value: `${stats.verifiedPct}%`, icon: 'ti-shield-check', color: 'text-brand-green' },
            { label: 'Leads este mes', value: stats.leads, icon: 'ti-user-check', color: 'text-brand-dark' },
          ].map(s => <div key={s.label} className="card p-4"><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-brand-slate mt-0.5 flex items-center gap-1"><i className={`ti ${s.icon} text-xs`} /> {s.label}</div></div>)}
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
        {(['overview', 'reviews', 'leads', 'editar'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-brand-green text-brand-green' : 'border-transparent text-brand-slate hover:text-brand-dark'}`}>{{ overview: 'Resumen', reviews: 'Reseñas', leads: 'Consultas', editar: 'Editar perfil' }[tab]}</button>
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
                </div>
              </div>
              {isPro && !r.response && <div className="mt-3 pt-3 border-t border-gray-50"><button className="text-xs text-brand-green hover:underline flex items-center gap-1"><i className="ti ti-message-reply text-xs" /> Responder esta reseña</button></div>}
              {!isPro && !r.response && <div className="mt-3 pt-3 border-t border-gray-50"><Link href="/precios" className="text-xs text-brand-amber hover:underline flex items-center gap-1"><i className="ti ti-lock text-xs" /> Activá el plan Pro para responder</Link></div>}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="card p-8 text-center">
          {isPro ? <><i className="ti ti-inbox text-4xl text-gray-200 block mb-3" /><p className="text-sm text-brand-dark font-medium mb-1">Sin consultas todavía</p><p className="text-xs text-brand-slate">Las consultas de clientes aparecerán acá.</p></>
            : <><i className="ti ti-lock text-4xl text-gray-200 block mb-3" /><p className="text-sm text-brand-dark font-medium mb-1">Función del plan Profesional</p><p className="text-xs text-brand-slate mb-4">Activá el plan Pro para recibir consultas directas.</p><Link href="/precios" className="btn-primary text-sm py-2.5 px-6">Ver planes</Link></>}
        </div>
      )}
      {activeTab === 'editar' && (
        <div className="card p-6 max-w-xl">
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
              <button type="submit" disabled={savingEdit} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">{savingEdit ? 'Guardando...' : 'Guardar cambios'}</button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
