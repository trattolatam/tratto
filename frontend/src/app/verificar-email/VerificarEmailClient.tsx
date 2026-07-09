'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function VerificarEmailClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Link de verificación inválido'); return }
    fetch(`${API_URL}/api/auth/verify-email?token=${token}`)
      .then(res => res.json())
      .then(data => { if (data.error) { setStatus('error'); setMessage(data.message) } else { setStatus('success'); setMessage(data.message) } })
      .catch(() => { setStatus('error'); setMessage('Error al verificar tu email.') })
  }, [token])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {status === 'loading' && <><i className="ti ti-loader-2 animate-spin text-4xl text-brand-slate block mb-4" /><p className="text-sm text-brand-slate">Verificando...</p></>}
        {status === 'success' && <><div className="w-16 h-16 rounded-full bg-brand-green-dim flex items-center justify-center mx-auto mb-4"><i className="ti ti-circle-check text-3xl text-brand-green" /></div><h1 className="text-xl font-bold text-brand-dark mb-2">¡Email confirmado!</h1><p className="text-sm text-brand-slate mb-6">{message}</p><Link href="/login" className="btn-primary px-6 py-2.5 inline-flex">Iniciar sesión</Link></>}
        {status === 'error' && <><div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><i className="ti ti-alert-circle text-3xl text-brand-red" /></div><h1 className="text-xl font-bold text-brand-dark mb-2">No pudimos verificar</h1><p className="text-sm text-brand-slate mb-6">{message}</p><Link href="/login" className="btn-secondary px-6 py-2.5 inline-flex">Volver al inicio</Link></>}
      </div>
    </div>
  )
}
