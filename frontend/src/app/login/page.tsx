'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const loggedUser = await login(form.email, form.password)
      const next = loggedUser.role === 'BUSINESS' ? '/panel' : '/'
      if (!loggedUser.isVerified) {
        router.push(`/confirmar-cuenta?email=${encodeURIComponent(loggedUser.email)}&next=${encodeURIComponent(next)}`)
      } else {
        router.push(next)
      }
    }
    catch (err: any) { setError(err.message || 'Credenciales incorrectas') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6"><div className="w-8 h-8 rounded-lg bg-brand-dark flex items-center justify-center"><span className="text-brand-green font-bold">T</span></div><span className="font-bold text-brand-dark text-lg">Tratto</span></Link>
          <h1 className="text-2xl font-bold text-brand-dark">Bienvenido de vuelta</h1><p className="text-sm text-brand-slate mt-1">Iniciá sesión en tu cuenta</p>
        </div>
        <div className="card p-6">
          {error && <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 mb-4 text-sm text-brand-red flex items-center gap-2"><i className="ti ti-alert-circle text-base" />{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="label">Email</label><input type="email" required placeholder="tu@email.com" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="label">Contraseña</label><input type="password" required placeholder="••••••••" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm disabled:opacity-50">{loading ? <><i className="ti ti-loader-2 animate-spin" /> Ingresando...</> : 'Iniciar sesión'}</button>
          </form>
        </div>
        <p className="text-center text-sm text-brand-slate mt-4">¿No tenés cuenta? <Link href="/registro" className="text-brand-green font-semibold hover:underline">Registrate gratis</Link></p>
      </div>
    </div>
  )
}
