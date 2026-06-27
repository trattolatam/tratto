import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Categorías de servicios — Tratto', description: 'Explorá todas las categorías de servicios con reseñas verificadas en LATAM.' }

const PHASE1 = [
  { emoji: '⚡', name: 'Electricistas', slug: 'electricistas', count: 2341, section: 'Hogar' }, { emoji: '🔧', name: 'Plomería', slug: 'plomeria', count: 1876, section: 'Hogar' },
  { emoji: '❄️', name: 'Aire acondicionado', slug: 'aire-acondicionado', count: 892, section: 'Hogar' }, { emoji: '🔥', name: 'Gasistas matriculados', slug: 'gasistas', count: 634, section: 'Hogar' },
  { emoji: '🎨', name: 'Pintores', slug: 'pintores', count: 1102, section: 'Hogar' }, { emoji: '🔑', name: 'Cerrajeros', slug: 'cerrajeros', count: 743, section: 'Hogar' },
  { emoji: '🏗️', name: 'Construcción y reforma', slug: 'construccion', count: 4210, section: 'Hogar' },
  { emoji: '✂️', name: 'Peluquerías y salones', slug: 'peluquerias', count: 3102, section: 'Belleza' }, { emoji: '✨', name: 'Clínicas de estética', slug: 'estetica', count: 987, section: 'Belleza' },
  { emoji: '💆', name: 'Spas y masajes', slug: 'spas', count: 521, section: 'Belleza' }, { emoji: '👁️', name: 'Cejas, pestañas y uñas', slug: 'cejas-pestanas-unas', count: 678, section: 'Belleza' },
  { emoji: '🥗', name: 'Nutrición y dietistas', slug: 'nutricion', count: 445, section: 'Belleza' }, { emoji: '🏃', name: 'Gimnasios y pilates', slug: 'gimnasios', count: 834, section: 'Belleza' },
  { emoji: '🧠', name: 'Psicólogos', slug: 'psicologos', count: 1234, section: 'Profesionales' }, { emoji: '🩺', name: 'Médicos a domicilio', slug: 'medicos-domicilio', count: 456, section: 'Profesionales' },
  { emoji: '📝', name: 'Escribanos y notarios', slug: 'escribanos', count: 321, section: 'Profesionales' },
]

const PHASE2 = [
  { emoji: '⚖️', name: 'Abogados', slug: 'abogados', count: 3102, section: 'Profesionales' }, { emoji: '🧮', name: 'Contadores', slug: 'contadores', count: 1543, section: 'Profesionales' },
  { emoji: '🐾', name: 'Veterinarios', slug: 'veterinarios', count: 892, section: 'Profesionales' }, { emoji: '💻', name: 'Técnicos IT', slug: 'tecnicos-it', count: 1234, section: 'Profesionales' },
  { emoji: '🚗', name: 'Talleres mecánicos', slug: 'talleres-mecanicos', count: 2341, section: 'Autos' }, { emoji: '🔨', name: 'Chapistas y pintores', slug: 'chapistas', count: 876, section: 'Autos' },
  { emoji: '⭕', name: 'Gomerías y neumáticos', slug: 'gomerias', count: 1102, section: 'Autos' }, { emoji: '📚', name: 'Academias y tutores', slug: 'academias', count: 1876, section: 'Educación' },
]

export default function CategoriasPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8"><h1 className="text-2xl font-bold text-brand-dark mb-2">Todas las categorías</h1><p className="text-sm text-brand-slate">Servicios con reseñas verificadas con comprobante en toda LATAM.</p></div>

      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">Lanzamiento prioritario</span></div>
        {Array.from(new Set(PHASE1.map(c => c.section))).map(section => (
          <div key={section} className="mb-6">
            <h2 className="text-xs font-semibold text-brand-slate uppercase tracking-wider mb-3 pl-1">{section}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {PHASE1.filter(c => c.section === section).map(cat => (
                <Link key={cat.slug} href={`/buscar?categoria=${cat.slug}`} className="card card-hover p-4 text-center group">
                  <div className="text-2xl mb-2">{cat.emoji}</div>
                  <div className="text-sm font-semibold text-brand-dark group-hover:text-brand-green transition-colors leading-tight mb-1">{cat.name}</div>
                  <div className="text-xs text-brand-slate">{cat.count.toLocaleString()} empresas</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4"><span className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200">Fase 2 — Próximamente</span></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {PHASE2.map(cat => (
            <div key={cat.slug} className="card p-4 text-center opacity-60 cursor-not-allowed">
              <div className="text-2xl mb-2">{cat.emoji}</div><div className="text-sm font-semibold text-brand-slate leading-tight mb-1">{cat.name}</div>
              <div className="text-xs text-brand-slate">{cat.count.toLocaleString()} empresas</div>
              <span className="mt-2 inline-block text-xs text-brand-blue bg-brand-blue-dim px-2 py-0.5 rounded-full">Próximamente</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-brand-dark text-white rounded-xl p-6 text-center mt-4">
        <p className="font-bold mb-1">¿Tu rubro no está todavía?</p><p className="text-sm text-white/60 mb-4">Estamos expandiendo categorías cada mes. Registrá tu empresa ahora y la agregamos.</p>
        <Link href="/reclamar" className="btn-primary text-sm px-6 py-2.5 inline-flex">Registrar mi empresa</Link>
      </div>
    </div>
  )
}
