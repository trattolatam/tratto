import { Suspense } from 'react'
import EscribirResenaClient from './EscribirResenaClient'

export default function EscribirResenaPage() {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-10 text-sm text-gray-500">Cargando...</div>}>
      <EscribirResenaClient />
    </Suspense>
  )
}
