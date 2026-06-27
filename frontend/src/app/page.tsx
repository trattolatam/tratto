import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tratto — Reseñas verificadas para LATAM', description: 'Encontrá los mejores electricistas, plomeros, peluquerías y profesionales con reseñas verificadas con comprobante.' }

const STATS = [
  { value: '12.847', label: 'Empresas registradas' }, { value: '89.312', label: 'Reseñas verificadas' },
  { value: '73%', label: 'Con comprobante real' }, { value: '18', label: 'Países LATAM' },
]

const FEATURED_CATEGORIES = [
  { emoji: '⚡', name: 'Electricistas', slug: 'electricistas', count: 2341 }, { emoji: '🔧', name: 'Plomería', slug: 'plomeria', count: 1876 },
  { emoji: '✂️', name: 'Peluquerías', slug: 'peluquerias', count: 3102 }, { emoji: '✨', name: 'Clínicas de estética', slug: 'estetica', count: 987 },
  { emoji: '🧠', name: 'Psicólogos', slug: 'psicologos', count: 987 }, { emoji: '🏗️', name: 'Construcción', slug: 'construccion', count: 4210 },
  { emoji: '🩺', name: 'Médicos a domicilio', slug: 'medicos-domicilio', count: 634 }, { emoji: '📝', name: 'Escribanos', slug: 'escribanos', count: 521 },
]

export default function HomePage() {
  return (
    <>
      <section className="bg-brand-dark text-white">
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-brand-green/10 border border-brand-green/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse-green" />
              <span className="text-brand-green text-xs font-semibold">La única plataforma con reseñas verificadas con comprobante</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4">Encontrá quién <span className="text-brand-green">realmente</span> cumple en LATAM</h1>
            <p className="text-white/60 text-lg mb-8 leading-relaxed">Reseñas verificadas con factura, recibo o comprobante. No palabras — evidencia real.</p>
            <div className="flex gap-2 max-w-lg mx-auto mb-10">
              <div className="relative flex-1">
                <i className="ti ti-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                <input type="text" placeholder="¿Qué servicio buscás?" className="w-full pl-10 pr-4 py-3 rounded-lg bg-white text-brand-dark placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/40" />
              </div>
              <Link href="/buscar" className="btn-primary px-5 py-3 text-sm"><i className="ti ti-search text-base" />Buscar</Link>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {['Electricistas', 'Plomeros', 'Peluquerías', 'Psicólogos', 'Escribanos'].map(c => (
                <Link key={c} href={`/buscar?q=${c.toLowerCase()}`} className="text-xs text-white/50 hover:text-brand-green border border-white/10 hover:border-brand-green/40 rounded-full px-3 py-1 transition-colors">{c}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 bg-white/5">
          <div className="max-w-6xl mx-auto px-4 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {STATS.map(s => <div key={s.label} className="text-center"><div className="text-2xl font-bold text-brand-green">{s.value}</div><div className="text-xs text-white/40 mt-0.5">{s.label}</div></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10"><h2 className="section-title">Por qué Tratto es diferente</h2><p className="section-sub">Lo que Google Maps y Facebook no pueden darte</p></div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: 'ti-shield-check', color: 'text-brand-green', bg: 'bg-brand-green-dim', title: 'Reseñas con comprobante', desc: 'Solo puede reseñar quien tiene factura, recibo o confirmación de la transacción. Nada de reseñas inventadas.' },
            { icon: 'ti-robot', color: 'text-brand-blue', bg: 'bg-brand-blue-dim', title: 'Resumen IA de opiniones', desc: 'En vez de leer 200 reseñas, nuestra IA te dice: "El 94% volvería a contratar. El 8% menciona demoras."' },
            { icon: 'ti-map-pin', color: 'text-brand-amber', bg: 'bg-brand-amber-dim', title: 'Hecho para LATAM', desc: 'Soporte para RUT, CUIT, RFC y RUC. Rankings por ciudad y país. 18 países de América Latina.' },
          ].map(d => (
            <div key={d.title} className="card p-6">
              <div className={`w-10 h-10 rounded-lg ${d.bg} flex items-center justify-center mb-4`}><i className={`ti ${d.icon} text-xl ${d.color}`} /></div>
              <h3 className="font-semibold text-brand-dark mb-2">{d.title}</h3><p className="text-sm text-brand-slate leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div><h2 className="section-title">Explorá por categoría</h2><p className="section-sub">Servicios donde más necesitás confianza</p></div>
            <Link href="/categorias" className="btn-secondary text-sm py-2 hidden sm:flex">Ver todas <i className="ti ti-arrow-right text-base" /></Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FEATURED_CATEGORIES.map(cat => (
              <Link key={cat.slug} href={`/buscar?categoria=${cat.slug}`} className="card card-hover p-4 text-center group">
                <div className="text-3xl mb-2">{cat.emoji}</div>
                <div className="text-sm font-semibold text-brand-dark group-hover:text-brand-green transition-colors">{cat.name}</div>
                <div className="text-xs text-brand-slate mt-0.5">{cat.count.toLocaleString()} empresas</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-dark text-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-3">¿Tu empresa ya aparece en Tratto?</h2>
            <p className="text-white/60 mb-8 text-sm leading-relaxed">Puede que ya tengas reseñas sin saberlo. Reclamá tu perfil gratis, respondé a tus clientes y empezá a capturar leads directos.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/reclamar" className="btn-primary px-6 py-3"><i className="ti ti-building-store text-base" />Reclamar mi perfil gratis</Link>
              <Link href="/precios" className="btn-outline-green px-6 py-3">Ver planes y precios</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
