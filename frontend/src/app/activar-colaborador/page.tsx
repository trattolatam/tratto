import { Suspense } from 'react'
import ActivarColaboradorClient from './ActivarColaboradorClient'

export default function ActivarColaboradorPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-sm text-gray-500">Cargando...</div>}>
      <ActivarColaboradorClient />
    </Suspense>
  )
}
