'use client'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export default function ActivarColaboradorClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setUser, setToken } = useAuthStore()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!token) { setError('Link de invitación inválido'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return }

    setLoading(true)
    try {
      const data = await auth.activateStaff(token, password)
      setToken(data.token)
      setUser(data.user)
      setSuccess(true)
      setTimeout(() => router.push('/admin'), 2000)
    } catch (err: any) { setError(err.message || 'El link expiró o es inválido. Pedile a un administrador que te reenvíe la invitación.') }
    finally { setLoading(false) }
  }

  if (!token) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><i className="ti ti-alert-circle text-3xl text-brand-red" /></div>
          <h1 className="text-xl font-bold text-brand-dark mb-2">Link inválido</h1>
          <p className="text-sm text-brand-slate mb-6">Este link de invitación no es válido. Pedile a un administrador que te reenvíe la invitación.</p>
          <Link href="/login" className="btn-primary px-6 py-2.5 inline-flex">Ir a iniciar sesión</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6"><div className="w-8 h-8 rounded-lg bg-brand-dark flex items-center justify-center"><span className="text-brand-green font-bold">T</span></div><span className="font-bold text-brand-dark text-lg">Tratto</span></Link>
          <h1 className="text-2xl font-bold text-brand-dark">Activá tu cuenta</h1>
          <p className="text-sm text-brand-slate mt-1">Elegí una contraseña para empezar a usar el panel.</p>
        </div>
        <div className="card p-6">
          {success ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full bg-brand-green-dim flex items-center justify-center mx-auto mb-4"><i className="ti ti-circle-check text-2xl text-brand-green" /></div>
              <p className="text-sm text-brand-dark font-medium mb-1">¡Cuenta activada!</p>
              <p className="text-xs text-brand-slate">Te llevamos al panel...</p>
            </div>
          ) : (
            <>
              {error && <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 mb-4 text-sm text-brand-red flex items-center gap-2"><i className="ti ti-alert-circle text-base" />{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="label">Contraseña</label><input type="password" required placeholder="••••••••" className="input" value={password} onChange={e => setPassword(e.target.value)} /></div>
                <div><label className="label">Repetí la contraseña</label><input type="password" required placeholder="••••••••" className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm disabled:opacity-50">{loading ? <><i className="ti ti-loader-2 animate-spin" /> Activando...</> : 'Activar mi cuenta'}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
