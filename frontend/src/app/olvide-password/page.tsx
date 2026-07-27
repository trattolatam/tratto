'use client'
import { useState } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/api'

export default function OlvidePasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await auth.forgotPassword(email)
      setSent(true)
    } catch (err: any) { setError(err.message || 'Ocurrió un error. Probá de nuevo.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6"><div className="w-8 h-8 rounded-lg bg-brand-dark flex items-center justify-center"><span className="text-brand-green font-bold">T</span></div><span className="font-bold text-brand-dark text-lg">Tratto</span></Link>
          <h1 className="text-2xl font-bold text-brand-dark">¿Olvidaste tu contraseña?</h1>
          <p className="text-sm text-brand-slate mt-1">Te mandamos un link para elegir una nueva</p>
        </div>
        <div className="card p-6">
          {sent ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full bg-brand-green-dim flex items-center justify-center mx-auto mb-4"><i className="ti ti-mail text-2xl text-brand-green" /></div>
              <p className="text-sm text-brand-dark font-medium mb-1">Revisá tu email</p>
              <p className="text-xs text-brand-slate">Si <strong>{email}</strong> está registrado en Tratto, te llegó un link para restablecer tu contraseña (revisá también spam).</p>
            </div>
          ) : (
            <>
              {error && <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 mb-4 text-sm text-brand-red flex items-center gap-2"><i className="ti ti-alert-circle text-base" />{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="label">Email</label><input type="email" required placeholder="tu@email.com" className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm disabled:opacity-50">{loading ? <><i className="ti ti-loader-2 animate-spin" /> Enviando...</> : 'Enviar link de recuperación'}</button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-sm text-brand-slate mt-4"><Link href="/login" className="text-brand-green font-semibold hover:underline">Volver a iniciar sesión</Link></p>
      </div>
    </div>
  )
}
