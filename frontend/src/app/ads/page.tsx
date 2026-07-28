import { Suspense } from 'react'
import AdsClient from './AdsClient'

export default function AdsPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-500">Cargando...</div>}>
      <AdsClient />
    </Suspense>
  )
}
