'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { subscriptions } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

const PLANS = [
  { id: 'FREE' as const, name: 'Gratuito', price: 0, desc: 'Presencia mínima. Aparecés en el ranking pero sin poder actuar.', color: 'border-gray-200', btn: 'Plan actual',
    features: [{ text: 'Aparecés en el ranking', ok: true }, { text: 'Recibís reseñas', ok: true }, { text: 'Botón de contacto directo', ok: false }, { text: 'Respondés reseñas', ok: false }, { text: 'Sello empresa verificada', ok: false }, { text: 'Resumen IA de reseñas', ok: false }] },
  { id: 'PROFESSIONAL' as const, name: 'Profesional', price: 29, desc: 'El plan que convierte visitas en clientes reales.', color: 'border-brand-green', popular: true, btn: 'Empezar 30 días gratis', btnClass: 'bg-brand-green text-brand-dark hover:bg-brand-green/90',
    features: [{ text: 'Botón "Solicitar presupuesto"', ok: true }, { text: 'Respondés reseñas públicamente', ok: true }, { text: 'Sello empresa verificada', ok: true }, { text: 'Resumen IA de tus reseñas', ok: true }, { text: 'Alerta WhatsApp por nueva reseña', ok: true }, { text: 'Certificado PDF descargable', ok: true }] },
  { id: 'PREMIUM' as const, name: 'Premium', price: 79, desc: 'Para empresas que quieren dominar su categoría.', color: 'border-brand-blue', btn: 'Elegir Premium', btnClass: 'bg-brand-dark text-white hover:bg-brand-dark/90',
    features: [{ text: 'Todo lo del plan Profesional', ok: true }, { text: 'Posición destacada en búsquedas', ok: true }, { text: 'Inteligencia competitiva', ok: true }, { text: 'API para integrar calificaciones', ok: true }, { text: 'Account manager dedicado', ok: true }] },
]

export default function PreciosPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [provider, setProvider] = useState<'STRIPE' | 'DLOCALGO'>('STRIPE')
  const [loading, setLoading] = useState<string | null>(null)

  const handlePlan = async (planId: 'PROFESSIONAL' | 'PREMIUM') => {
    if (!user) { router.push('/registro?role=BUSINESS'); return }
    if (user.role !== 'BUSINESS' || !user.company) { router.push('/reclamar'); return }
    setLoading(planId)
    try { const data = await subscriptions.checkout(planId, provider) as any; window.location.href = data.checkoutUrl }
    catch (err: any) { alert(err.message); setLoading(null) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-brand-dark mb-3">Planes para empresas</h1>
        <p className="text-brand-slate text-sm max-w-md mx-auto leading-relaxed">Las medallas son siempre públicas — no se compran ni se ocultan. Los planes te dan las herramientas para capitalizarlas.</p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          {([{ id: 'STRIPE', label: 'Tarjeta internacional', flag: '💳' }, { id: 'DLOCALGO', label: 'dLocal Go', flag: '🇺🇾' }] as const).map(p => (
            <button key={p.id} onClick={() => setProvider(p.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${provider === p.id ? 'bg-white shadow text-brand-dark' : 'text-brand-slate hover:text-brand-dark'}`}><span>{p.flag}</span> {p.label}</button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-12">
        {PLANS.map(plan => (
          <div key={plan.id} className={`card relative flex flex-col ${plan.popular ? `border-2 ${plan.color}` : `border ${plan.color}`}`}>
            {plan.popular && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-green text-brand-dark text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">Más elegido</div>}
            <div className="p-5 flex-1">
              <h2 className="font-bold text-brand-dark mb-1">{plan.name}</h2>
              <div className="flex items-baseline gap-1 mb-2"><span className="text-3xl font-bold text-brand-dark">{plan.price === 0 ? 'Gratis' : `USD ${plan.price}`}</span>{plan.price > 0 && <span className="text-sm text-brand-slate">/mes</span>}</div>
              <p className="text-xs text-brand-slate mb-5 leading-relaxed">{plan.desc}</p>
              <div className="space-y-2.5">
                {plan.features.map((f, i) => <div key={i} className="flex items-start gap-2"><i className={`ti ${f.ok ? 'ti-check text-brand-green' : 'ti-x text-gray-300'} text-sm flex-shrink-0 mt-0.5`} /><span className={`text-xs ${f.ok ? 'text-brand-dark' : 'text-gray-300'}`}>{f.text}</span></div>)}
              </div>
            </div>
            <div className="p-5 pt-0">
              {plan.id === 'FREE' ? (
                !user?.company ? (
                  <Link href="/reclamar" className="w-full text-center block py-2.5 rounded-lg border border-brand-green text-brand-green text-sm font-semibold hover:bg-brand-green-dim transition-colors">Crear mi empresa gratis</Link>
                ) : (
                  <div className="w-full text-center py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-400">{user.company.plan === 'FREE' ? 'Plan actual' : 'Plan gratuito'}</div>
                )
              ) : (
                <button onClick={() => handlePlan(plan.id as 'PROFESSIONAL' | 'PREMIUM')} disabled={loading === plan.id} className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${plan.btnClass}`}>
                  {loading === plan.id ? <><i className="ti ti-loader-2 animate-spin text-base" /> Redirigiendo...</> : <>{plan.btn}</>}
                </button>
              )}
              {plan.id !== 'FREE' && <p className="text-xs text-center text-gray-400 mt-2">{provider === 'STRIPE' ? '30 días gratis · cancela cuando quieras' : 'Sin permanencia'}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto">
        <h2 className="text-lg font-bold text-brand-dark mb-5 text-center">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {[
            { q: '¿Los 30 días gratis requieren tarjeta?', a: 'Sí, Stripe requiere datos de pago para activar la prueba, pero no te cobra nada durante 30 días.' },
            { q: '¿Puedo cancelar cuando quiero?', a: 'Sí. Si cancelás, tu plan sigue activo hasta el fin del período ya pago.' },
            { q: '¿Las medallas son permanentes aunque no pague?', a: 'Sí. Las medallas que ganaste son tuyas y siempre aparecen públicamente, independientemente de tu plan.' },
          ].map((faq, i) => (
            <details key={i} className="card p-4 group">
              <summary className="flex items-center justify-between cursor-pointer font-medium text-sm text-brand-dark list-none">{faq.q}<i className="ti ti-chevron-down text-brand-slate group-open:rotate-180 transition-transform text-base flex-shrink-0 ml-3" /></summary>
              <p className="text-sm text-brand-slate mt-3 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
