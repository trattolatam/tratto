import { Suspense } from 'react'
import ConfirmarCuentaClient from './ConfirmarCuentaClient'

export default function ConfirmarCuentaPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto px-4 py-12 text-sm text-gray-500 text-center">Cargando...</div>}>
      <ConfirmarCuentaClient />
    </Suspense>
  )
}
