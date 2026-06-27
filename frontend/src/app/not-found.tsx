import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Página no encontrada — Tratto' }

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-brand-green mb-2">404</div>
        <h1 className="text-xl font-bold text-brand-dark mb-2">Página no encontrada</h1>
        <p className="text-sm text-brand-slate mb-8 leading-relaxed">La página que buscás no existe o fue movida.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn-primary px-6 py-2.5"><i className="ti ti-home text-base" /> Ir al inicio</Link>
          <Link href="/buscar" className="btn-secondary px-6 py-2.5"><i className="ti ti-search text-base" /> Buscar servicios</Link>
        </div>
      </div>
    </div>
  )
}
