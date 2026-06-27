import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Normas de la comunidad — Tratto',
  description: 'Qué reseñas aceptamos y cuáles rechazamos en Tratto, y por qué.',
}

export default function NormasComunidadPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-brand-dark mb-2">Normas de la comunidad</h1>
      <p className="text-sm text-brand-slate mb-10">Qué reseñas publicamos y cuáles no, explicado con claridad.</p>

      <div className="bg-brand-green-dim border border-brand-green/20 rounded-xl p-4 mb-10 flex gap-3">
        <i className="ti ti-shield-check text-xl text-brand-green flex-shrink-0 mt-0.5" />
        <p className="text-sm text-brand-green-text leading-relaxed">
          Nuestro objetivo es que cada reseña en Tratto refleje una experiencia real. Estas normas existen para proteger tanto a usuarios como a empresas de información falsa o malintencionada.
        </p>
      </div>

      <div className="space-y-8">

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-3 flex items-center gap-2">
            <i className="ti ti-circle-check text-brand-green" /> Reseñas que aceptamos
          </h2>
          <div className="space-y-2.5">
            {[
              'Experiencias reales con una empresa, contadas con tus propias palabras.',
              'Críticas negativas honestas, siempre que describan hechos concretos (demoras, cobros indebidos, mala atención) y no sean simplemente insultos.',
              'Reseñas con comprobante de transacción adjunto — estas reciben el badge de verificadas.',
              'Reseñas sin comprobante, siempre que pasen nuestra revisión de moderación.',
              'Actualizaciones de tu propia reseña si la experiencia cambió con el tiempo.',
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-brand-slate">
                <i className="ti ti-point-filled text-brand-green text-xs mt-1.5 flex-shrink-0" />
                <p>{t}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-3 flex items-center gap-2">
            <i className="ti ti-circle-x text-brand-red" /> Reseñas que rechazamos
          </h2>
          <div className="space-y-2.5">
            {[
              { t: 'Reseñas de quien no usó el servicio', d: 'Si nunca contrataste a la empresa, no podés reseñarla. Esto incluye reseñas hechas "por un amigo" o basadas en lo que escuchaste de otra persona.' },
              { t: 'Comprobantes falsificados o editados', d: 'Subir una factura modificada o de otra empresa para simular verificación resulta en la eliminación de la reseña y posible suspensión de la cuenta.' },
              { t: 'Conflicto de interés no declarado', d: 'Empleados, ex-empleados, familiares directos o competidores que reseñan sin aclarar su relación con la empresa.' },
              { t: 'Lenguaje discriminatorio u ofensivo', d: 'Insultos, lenguaje de odio, discriminación por raza, género, orientación sexual, religión o cualquier otra condición.' },
              { t: 'Datos personales de terceros', d: 'Reseñas que incluyan el nombre completo, teléfono o dirección de un empleado específico de la empresa sin su consentimiento.' },
              { t: 'Extorsión o amenazas', d: 'Reseñas usadas como amenaza ("si no me devolvés la plata, dejo una reseña mala") violan nuestras normas independientemente de si la experiencia original fue real.' },
              { t: 'Contenido promocional o espam', d: 'Reseñas que promocionan otro negocio, incluyen links externos o son contenido publicitario disfrazado de opinión.' },
              { t: 'Reseñas duplicadas', d: 'Solo se permite una reseña por usuario por empresa. Reseñas múltiples desde distintas cuentas para inflar o hundir una calificación serán eliminadas.' },
            ].map((item, i) => (
              <div key={i} className="card p-3.5">
                <p className="text-sm font-medium text-brand-dark mb-1">{item.t}</p>
                <p className="text-xs text-brand-slate leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-3">Cómo funciona la moderación</h2>
          <div className="space-y-3 text-sm text-brand-slate leading-relaxed">
            <p><strong className="text-brand-dark">Reseñas con comprobante:</strong> pasan por una revisión rápida del comprobante adjunto. Si todo está en orden, se publican en menos de 24 horas con el badge de verificadas.</p>
            <p><strong className="text-brand-dark">Reseñas sin comprobante:</strong> pasan por una revisión de contenido antes de publicarse, verificando que cumplan estas normas.</p>
            <p><strong className="text-brand-dark">Reseñas reportadas:</strong> cualquier usuario o empresa puede reportar una reseña que considere que viola estas normas. Un reporte no elimina la reseña automáticamente — la revisamos antes de tomar una decisión.</p>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-3">Derecho de respuesta de las empresas</h2>
          <p className="text-sm text-brand-slate leading-relaxed">
            Toda empresa con perfil reclamado tiene derecho a responder públicamente cualquier reseña, sin importar si es positiva o negativa. No eliminamos reseñas negativas verdaderas solo porque la empresa esté en desacuerdo — la respuesta pública es la vía correcta para dar su versión de los hechos.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-3">Consecuencias por incumplir estas normas</h2>
          <div className="space-y-2 text-sm text-brand-slate">
            <p><strong className="text-brand-dark">Primera vez:</strong> la reseña se elimina y se notifica al usuario el motivo.</p>
            <p><strong className="text-brand-dark">Reincidencia:</strong> suspensión temporal de la cuenta.</p>
            <p><strong className="text-brand-dark">Fraude comprobado</strong> (comprobantes falsificados, cuentas múltiples): suspensión permanente sin posibilidad de apelación.</p>
          </div>
        </section>

        <section className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-brand-slate leading-relaxed">
            Si creés que una reseña sobre tu empresa viola estas normas, podés reportarla directamente desde tu panel o escribinos a{' '}
            <a href="mailto:moderacion@tratto.lat" className="text-brand-blue hover:underline">moderacion@tratto.lat</a>.
          </p>
        </section>

      </div>
    </div>
  )
}
