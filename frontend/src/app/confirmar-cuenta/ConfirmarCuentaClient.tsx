'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export default function ConfirmarCuentaClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { logout } = useAuthStore()
  const email = searchParams.get('email') || ''
  const next = searchParams.get('next') || '/'

  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')

  const handleResend = async () => {
    setResending(true); setResendMsg('')
    try { await auth.resendVerification(email); setResendMsg('Te reenviamos el link. Revisá tu casilla (y spam).') }
    catch (err: any) { setResendMsg(err.message || 'Error al reenviar') }
    finally { setResending(false) }
  }

  const handleContinue = async () => {
    setChecking(true); setCheckError('')
    try {
      const { user } = await auth.me()
      if (user?.isVerified) {
        router.push(next)
      } else {
        setCheckError('Todavía no confirmaste tu cuenta. Abrí el email y hacé click en el link antes de continuar.')
      }
    } catch (err: any) {
      setCheckError(err.message || 'No pudimos comprobar tu verificación. Intentá de nuevo.')
    } finally {
      setChecking(false)
    }
  }

  const handleLogout = () => { logout(); router.push('/registro') }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-brand-green-dim flex items-center justify-center mx-auto mb-5">
          <i className="ti ti-mail text-3xl text-brand-green" />
        </div>
        <h1 className="text-2xl font-bold text-brand-dark mb-2">Confirmá tu cuenta</h1>
        <p className="text-sm text-brand-slate leading-relaxed mb-1">
          Te enviamos un link de confirmación a
        </p>
        <p className="text-sm font-semibold text-brand-dark mb-6">{email || 'tu email'}</p>
        <p className="text-xs text-brand-slate leading-relaxed mb-6">
          Abrí ese email y hacé click en el link para activar tu cuenta. Si no lo encontrás, revisá la carpeta de spam.
        </p>

        <div className="card p-5 space-y-3">
          <button onClick={handleContinue} disabled={checking} className="btn-primary w-full py-2.5 text-sm disabled:opacity-50">{checking ? 'Comprobando...' : 'Ya confirmé, continuar'}</button>
          {checkError && <p className="text-xs text-brand-red">{checkError}</p>}
          <button onClick={handleResend} disabled={resending} className="btn-secondary w-full py-2.5 text-sm disabled:opacity-50">{resending ? 'Enviando...' : 'Reenviar email'}</button>
          {resendMsg && <p className="text-xs text-brand-slate">{resendMsg}</p>}
        </div>

        <button onClick={handleLogout} className="text-xs text-brand-slate mt-6 hover:underline">¿Te equivocaste de email? Volver a registrarte</button>
        <p className="text-xs text-gray-400 mt-4">¿Ya tenés cuenta confirmada? <Link href="/login" className="text-brand-green font-semibold hover:underline">Iniciá sesión</Link></p>
      </div>
    </div>
  )
}
