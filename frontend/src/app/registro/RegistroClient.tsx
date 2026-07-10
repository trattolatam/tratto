'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

const COUNTRIES = [{ code: 'UY', name: 'Uruguay' }, { code: 'AR', name: 'Argentina' }, { code: 'CL', name: 'Chile' }, { code: 'MX', name: 'México' }, { code: 'CO', name: 'Colombia' }, { code: 'PE', name: 'Perú' }, { code: 'BR', name: 'Brasil' }, { code: 'OTHER', name: 'Otro' }]

export default function RegistroClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuthStore()
  const initialRole = searchParams.get('role') === 'BUSINESS' ? 'BUSINESS' : 'USER'
  const [form, setForm] = useState({ name: '', email: '', password: '', country: 'UY', role: initialRole })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    setLoading(true); setError('')
    try {
      await auth.register(form)
      await login(form.email, form.password)
      if (form.role === 'BUSINESS') {
        const empresa = searchParams.get('empresa')
        const crear = searchParams.get('crear')
        const params = new URLSearchParams()
        if (empresa) params.set('empresa', empresa)
        if (crear) params.set('crear', crear)
        const qs = params.toString()
        router.push(qs ? `/reclamar?${qs}` : '/reclamar')
      } else {
        router.push('/')
      }
    }
    catch (err: any) { setError(err.message || 'Error al registrarse') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6"><div className="w-8 h-8 rounded-lg bg-brand-dark flex items-center justify-center"><span className="text-brand-green font-bold">T</span></div><span className="font-bold text-brand-dark text-lg">Tratto</span></Link>
          <h1 className="text-2xl font-bold text-brand-dark">Creá tu cuenta</h1><p className="text-sm text-brand-slate mt-1">Gratis, sin tarjeta de crédito</p>
        </div>
        <div className="card p-6">
          {error && <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 mb-4 text-sm text-brand-red flex items-center gap-2"><i className="ti ti-alert-circle text-base" />{error}</div>}
          <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-gray-50 rounded-lg">
            {[{ value: 'USER', label: '👤 Soy usuario', desc: 'Dejo reseñas' }, { value: 'BUSINESS', label: '🏢 Tengo empresa', desc: 'Gestiono mi perfil' }].map(opt => (
              <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, role: opt.value }))} className={`py-2.5 px-2 rounded-lg text-center transition-all ${form.role === opt.value ? 'bg-white shadow text-brand-dark' : 'text-brand-slate hover:text-brand-dark'}`}>
                <div className="text-sm font-semibold">{opt.label}</div><div className="text-xs text-brand-slate">{opt.desc}</div>
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><label className="label">Nombre completo</label><input type="text" required placeholder="Tu nombre" className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="label">Email</label><input type="email" required placeholder="tu@email.com" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="label">País</label><select className="input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>{COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
            <div><label className="label">Contraseña</label><input type="password" required placeholder="Mínimo 8 caracteres" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm disabled:opacity-50 mt-1">{loading ? <><i className="ti ti-loader-2 animate-spin" /> Creando cuenta...</> : 'Crear cuenta gratis'}</button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-3">Al registrarte aceptás los <Link href="/terminos" className="text-brand-blue hover:underline">términos de uso</Link> y la <Link href="/privacidad" className="text-brand-blue hover:underline">política de privacidad</Link>.</p>
        </div>
        <p className="text-center text-sm text-brand-slate mt-4">¿Ya tenés cuenta? <Link href="/login" className="text-brand-green font-semibold hover:underline">Iniciá sesión</Link></p>
      </div>
    </div>
  )
}
