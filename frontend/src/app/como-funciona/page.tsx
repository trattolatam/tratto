import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Cómo funciona Tratto — Reseñas verificadas con comprobante' }

export default function ComoFuncionaPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 bg-brand-green-dim border border-brand-green/20 rounded-full px-4 py-1.5 mb-5"><span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse-green" /><span className="text-brand-green text-xs font-semibold">La diferencia que importa</span></div>
        <h1 className="text-3xl font-bold text-brand-dark mb-4 leading-tight">Por qué Tratto es diferente<br />a Google Maps y Facebook</h1>
        <p className="text-brand-slate leading-relaxed max-w-xl mx-auto">Cualquiera puede dejar una reseña falsa en Google. En Tratto, solo podés reseñar si tenés un comprobante real de la transacción.</p>
      </div>

      <div className="mb-14">
        <h2 className="text-xl font-bold text-brand-dark mb-6 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-brand-green-dim flex items-center justify-center text-brand-green text-sm font-bold">U</span>Para usuarios</h2>
        <div className="space-y-4">
          {[
            { step: '01', icon: 'ti-search', title: 'Buscás el servicio que necesitás', desc: 'Filtrá por rubro, ciudad y país.' },
            { step: '02', icon: 'ti-robot', title: 'Leés el resumen IA en lugar de 200 reseñas', desc: 'Nuestra IA analiza todas las reseñas y te dice en 3 oraciones lo que más valoran los clientes.' },
            { step: '03', icon: 'ti-tools', title: 'Contratás el servicio', desc: 'La empresa te da una factura, recibo o confirmación de la transacción.' },
            { step: '04', icon: 'ti-shield-check', title: 'Dejás tu reseña con comprobante', desc: 'Tu opinión recibe el badge verde de verificada.' },
          ].map(s => (
            <div key={s.step} className="card p-5 flex gap-4">
              <div className="flex-shrink-0"><div className="w-10 h-10 rounded-xl bg-brand-green-dim flex items-center justify-center"><i className={`ti ${s.icon} text-lg text-brand-green`} /></div></div>
              <div><div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-brand-green">{s.step}</span><h3 className="text-sm font-semibold text-brand-dark">{s.title}</h3></div><p className="text-sm text-brand-slate leading-relaxed">{s.desc}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-14">
        <h2 className="text-xl font-bold text-brand-dark mb-6 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-brand-blue-dim flex items-center justify-center text-brand-blue text-sm font-bold">E</span>Para empresas</h2>
        <div className="space-y-4">
          {[
            { step: '01', icon: 'ti-building-store', title: 'Tu empresa ya puede aparecer en Tratto', desc: 'Reclamá el perfil gratis si tus clientes ya te reseñaron.' },
            { step: '02', icon: 'ti-id-badge', title: 'Verificamos tu identidad fiscal', desc: 'RUT, CUIT, RFC o RUC según tu país.' },
            { step: '03', icon: 'ti-message-check', title: 'Respondés a tus clientes públicamente', desc: 'Con el plan Profesional podés responder cada reseña.' },
            { step: '04', icon: 'ti-user-check', title: 'Recibís consultas directas', desc: 'Un botón de presupuesto convierte visitas en leads reales.' },
          ].map(s => (
            <div key={s.step} className="card p-5 flex gap-4">
              <div className="flex-shrink-0"><div className="w-10 h-10 rounded-xl bg-brand-blue-dim flex items-center justify-center"><i className={`ti ${s.icon} text-lg text-brand-blue`} /></div></div>
              <div><div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-brand-blue">{s.step}</span><h3 className="text-sm font-semibold text-brand-dark">{s.title}</h3></div><p className="text-sm text-brand-slate leading-relaxed">{s.desc}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-brand-dark text-white rounded-xl p-6 mb-10">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><i className="ti ti-medal text-brand-amber" />El sistema de medallas</h2>
        <p className="text-white/70 text-sm leading-relaxed mb-4">Las medallas reconocen el desempeño real de las empresas. Son siempre públicas — no se compran ni se esconden.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[{ emoji: '⭐', label: 'Top del rubro', desc: 'Top 10% de su categoría y ciudad' }, { emoji: '🏅', label: '50+ reseñas verificadas', desc: 'Acumuló 50 reseñas con comprobante' }, { emoji: '📈', label: 'En ascenso', desc: 'Subió 0.5+ puntos en 3 meses' }, { emoji: '👍', label: 'Muy recomendado', desc: '90%+ de reseñas de 4-5 estrellas' }].map(m => (
            <div key={m.label} className="flex items-center gap-3 bg-white/8 rounded-lg p-3"><span className="text-xl">{m.emoji}</span><div><p className="text-sm font-semibold">{m.label}</p><p className="text-xs text-white/50">{m.desc}</p></div></div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5 text-center"><i className="ti ti-search text-2xl text-brand-green block mb-3" /><h3 className="font-semibold text-brand-dark mb-1 text-sm">Buscá un servicio</h3><p className="text-xs text-brand-slate mb-4">Encontrá el mejor profesional con reseñas verificadas.</p><Link href="/buscar" className="btn-primary w-full py-2.5 text-sm">Empezar a buscar</Link></div>
        <div className="card p-5 text-center"><i className="ti ti-building-store text-2xl text-brand-blue block mb-3" /><h3 className="font-semibold text-brand-dark mb-1 text-sm">Registrá tu empresa</h3><p className="text-xs text-brand-slate mb-4">Reclamá tu perfil gratis.</p><Link href="/reclamar" className="btn-dark w-full py-2.5 text-sm">Reclamar perfil</Link></div>
      </div>
    </div>
  )
}
