import { Suspense } from 'react'
import ReclamarClient from './ReclamarClient'

export default function ReclamarPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-10 text-sm text-gray-500">Cargando...</div>}>
      <ReclamarClient />
    </Suspense>
  )
}
