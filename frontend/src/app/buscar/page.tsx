import { Suspense } from 'react'
import BuscarClient from './BuscarClient'

export default function BuscarPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-500">Cargando...</div>}>
      <BuscarClient />
    </Suspense>
  )
}
