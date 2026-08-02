import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Categorías de servicios — Tratto', description: 'Explorá todas las categorías de servicios con reseñas verificadas en LATAM.' }

async function getCategories() {
  try {
    // includeHidden trae también las de fase 2 todavía no lanzadas, para
    // mostrarlas como "Próximamente" — el admin las activa desde el panel.
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories?includeHidden=true`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return data.categories as { id: string; name: string; slug: string; emoji: string; phase: number; isHidden: boolean; _count: { companies: number } }[]
  } catch { return [] }
}

export default async function CategoriasPage() {
  const categories = await getCategories()
  const live = categories.filter((c) => !c.isHidden)
  const upcoming = categories.filter((c) => c.isHidden)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8"><h1 className="text-2xl font-bold text-brand-dark mb-2">Todas las categorías</h1><p className="text-sm text-brand-slate">Servicios con reseñas verificadas con comprobante en toda LATAM.</p></div>

      {live.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">Disponibles ahora</span></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {live.map((cat) => (
              <Link key={cat.slug} href={`/buscar?categoria=${cat.slug}`} className="card card-hover p-4 text-center group">
                <div className="text-2xl mb-2">{cat.emoji}</div>
                <div className="text-sm font-semibold text-brand-dark group-hover:text-brand-green transition-colors leading-tight mb-1">{cat.name}</div>
                <div className="text-xs text-brand-slate">{cat._count.companies.toLocaleString()} empresas</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4"><span className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200">Próximamente</span></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {upcoming.map((cat) => (
              <div key={cat.slug} className="card p-4 text-center opacity-60 cursor-not-allowed">
                <div className="text-2xl mb-2">{cat.emoji}</div><div className="text-sm font-semibold text-brand-slate leading-tight mb-1">{cat.name}</div>
                <span className="mt-2 inline-block text-xs text-brand-blue bg-brand-blue-dim px-2 py-0.5 rounded-full">Próximamente</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-brand-dark text-white rounded-xl p-6 text-center mt-4">
        <p className="font-bold mb-1">¿Tu rubro no está todavía?</p><p className="text-sm text-white/60 mb-4">Estamos expandiendo categorías cada mes. Registrá tu empresa ahora y la agregamos.</p>
        <Link href="/reclamar" className="btn-primary text-sm px-6 py-2.5 inline-flex">Registrar mi empresa</Link>
      </div>
    </div>
  )
}
