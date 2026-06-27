'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { reviews as reviewsApi, upload } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export default function EscribirResenaPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyId = searchParams.get('empresa') || ''

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [form, setForm] = useState({ title: '', body: '', proofType: '' })
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofUrl, setProofUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <i className="ti ti-lock text-4xl text-gray-200 block mb-4" />
        <h1 className="text-lg font-semibold text-brand-dark mb-2">Iniciá sesión para dejar una reseña</h1>
        <p className="text-sm text-brand-slate mb-6">Solo usuarios registrados pueden dejar reseñas en Tratto.</p>
        <Link href="/login" className="btn-primary px-6 py-2.5">Iniciar sesión</Link>
      </div>
    )
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProofFile(file); setUploading(true)
    try { const result = await upload.proof(file); setProofUrl(result.url) }
    catch (err: any) { alert('Error subiendo el archivo: ' + err.message) }
    finally { setUploading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) { alert('Por favor seleccioná una calificación'); return }
    if (form.body.length < 20) { alert('La reseña debe tener al menos 20 caracteres'); return }
    setSubmitting(true)
    try {
      await reviewsApi.create({ companyId, rating, title: form.title || undefined, body: form.body, proofUrl: proofUrl || undefined, proofType: form.proofType || undefined })
      setSuccess(true)
    } catch (err: any) { alert(err.message) } finally { setSubmitting(false) }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-green-dim flex items-center justify-center mx-auto mb-4"><i className="ti ti-circle-check text-3xl text-brand-green" /></div>
        <h1 className="text-xl font-bold text-brand-dark mb-2">¡Reseña enviada!</h1>
        <p className="text-sm text-brand-slate mb-6 leading-relaxed">{proofUrl ? 'Tu reseña verificada será publicada en menos de 24hs tras revisión.' : 'Tu reseña será publicada tras moderación.'}</p>
        <div className="flex gap-3 justify-center"><button onClick={() => router.back()} className="btn-primary px-5 py-2.5">Ver empresa</button><Link href="/" className="btn-secondary px-5 py-2.5">Ir al inicio</Link></div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href={companyId ? `/empresa/${companyId}` : '/'} className="flex items-center gap-1.5 text-sm text-brand-slate hover:text-brand-dark mb-4"><i className="ti ti-arrow-left text-base" /> Volver</Link>
        <h1 className="text-2xl font-bold text-brand-dark">Escribir reseña</h1>
        <p className="text-sm text-brand-slate mt-1">Tu experiencia real ayuda a otros a tomar mejores decisiones.</p>
      </div>

      <div className="bg-brand-green-dim border border-brand-green/20 rounded-xl p-4 mb-6 flex gap-3">
        <i className="ti ti-shield-check text-xl text-brand-green flex-shrink-0 mt-0.5" />
        <div><p className="text-sm font-semibold text-brand-green-text">Reseña verificada = 3× más visibilidad</p><p className="text-xs text-brand-slate mt-0.5">Al adjuntar un comprobante, tu reseña recibe el badge de verificada y aparece primero en el ranking.</p></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Calificación *</label>
          <div className="flex gap-2 mt-1">
            {[1,2,3,4,5].map(n => <button key={n} type="button" onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(n)} className={`text-4xl transition-all ${n <= (hoverRating || rating) ? 'text-brand-amber scale-110' : 'text-gray-200'}`}>★</button>)}
          </div>
          {rating > 0 && <p className="text-xs text-brand-slate mt-1.5">{['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][rating]}</p>}
        </div>

        <div><label className="label">Título <span className="font-normal normal-case text-gray-400">(opcional)</span></label><input type="text" placeholder="Resumí tu experiencia en una frase" className="input" maxLength={100} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>

        <div>
          <label className="label">Tu experiencia *</label>
          <textarea required placeholder="Contá con detalle tu experiencia. ¿Cumplieron los tiempos? ¿Fue el precio acordado?" className="input min-h-[120px] resize-none leading-relaxed" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          <p className="text-xs text-gray-400 mt-1">{form.body.length}/2000 · mínimo 20 caracteres</p>
        </div>

        <div>
          <label className="label">Comprobante de transacción <span className="font-normal normal-case text-brand-green ml-1">→ para reseña verificada</span></label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {['factura', 'recibo', 'transferencia', 'comprobante de pago', 'confirmación'].map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, proofType: f.proofType === t ? '' : t }))} className={`text-xs py-2 px-3 rounded-lg border transition-all capitalize ${form.proofType === t ? 'bg-brand-green-dim border-brand-green text-brand-green-text font-semibold' : 'border-gray-200 text-brand-slate hover:border-gray-300'}`}>{t}</button>
            ))}
          </div>
          <label className={`block border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${proofUrl ? 'border-brand-green bg-brand-green-dim' : 'border-gray-200 hover:border-brand-green/50'}`}>
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={handleFileChange} disabled={uploading} />
            {uploading ? <div className="flex items-center justify-center gap-2 text-sm text-brand-slate"><i className="ti ti-loader-2 animate-spin text-base" />Subiendo...</div>
              : proofUrl ? <div className="flex items-center justify-center gap-2 text-sm text-brand-green font-semibold"><i className="ti ti-circle-check text-base" />{proofFile?.name} — cargado</div>
              : <><i className="ti ti-upload text-2xl text-gray-300 block mb-2" /><p className="text-sm text-brand-slate">Subí tu comprobante aquí</p><p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP o PDF · máx 5MB</p></>}
          </label>
        </div>

        <button type="submit" disabled={submitting || rating === 0} className="btn-primary w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? <><i className="ti ti-loader-2 animate-spin text-base" /> Publicando...</> : <><i className="ti ti-send text-base" />{proofUrl ? 'Publicar reseña verificada' : 'Publicar reseña'}</>}
        </button>
        <p className="text-xs text-gray-400 text-center leading-relaxed">Al publicar tu reseña aceptás nuestros <Link href="/terminos" className="text-brand-blue hover:underline">términos de uso</Link>.</p>
      </form>
    </div>
  )
}
