import { Suspense } from 'react'
import VerificarEmailClient from './VerificarEmailClient'

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-sm text-gray-500">Verificando...</div>}>
      <VerificarEmailClient />
    </Suspense>
  )
}
