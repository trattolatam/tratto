import { Suspense } from 'react'
import RestablecerPasswordClient from './RestablecerPasswordClient'

export default function RestablecerPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-sm text-gray-500">Cargando...</div>}>
      <RestablecerPasswordClient />
    </Suspense>
  )
}
