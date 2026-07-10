import { Suspense } from 'react'
import RegistroClient from './RegistroClient'

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto px-4 py-12 text-sm text-gray-500 text-center">Cargando...</div>}>
      <RegistroClient />
    </Suspense>
  )
}
