import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de privacidad — Tratto',
  description: 'Cómo Tratto recopila, usa y protege tu información personal.',
}

export default function PrivacidadPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-brand-dark mb-2">Política de privacidad</h1>
      <p className="text-sm text-brand-slate mb-10">Última actualización: {new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="space-y-8 text-sm text-brand-slate leading-relaxed">

        <section>
          <p>En Tratto nos tomamos en serio la protección de tu información personal. Esta política explica qué datos recopilamos, cómo los usamos, y qué derechos tenés sobre ellos. Cumplimos con los principios de protección de datos aplicables en los países de América Latina donde operamos, incluyendo la Ley General de Protección de Datos (LGPD) de Brasil cuando corresponda.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">1. Qué información recopilamos</h2>
          <p className="mb-2"><strong className="text-brand-dark">Información que nos proporcionás directamente:</strong></p>
          <ul className="list-disc pl-5 space-y-1.5 mb-3">
            <li>Nombre, email y contraseña al registrarte.</li>
            <li>País y ciudad de residencia.</li>
            <li>Número de teléfono, si lo proporcionás voluntariamente.</li>
            <li>El contenido de tus reseñas y los comprobantes de transacción que adjuntes.</li>
            <li>Para empresas: identificación fiscal (RUT, CUIT, RFC, RUC), dirección, sitio web y descripción del negocio.</li>
            <li>Información de pago, procesada de forma segura por Stripe o MercadoPago — Tratto nunca almacena los datos completos de tu tarjeta.</li>
          </ul>
          <p className="mb-2"><strong className="text-brand-dark">Información que recopilamos automáticamente:</strong></p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Dirección IP y datos de navegación para fines de seguridad y analítica.</li>
            <li>Información sobre el dispositivo y navegador que usás para acceder a la plataforma.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">2. Cómo usamos tu información</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Para crear y gestionar tu cuenta en la plataforma.</li>
            <li>Para verificar la autenticidad de las reseñas y comprobantes que subís.</li>
            <li>Para procesar pagos de suscripciones empresariales.</li>
            <li>Para enviarte notificaciones relevantes (nuevas reseñas, respuestas, medallas obtenidas) por email o WhatsApp, según tus preferencias.</li>
            <li>Para generar resúmenes con inteligencia artificial sobre el conjunto de reseñas de una empresa (los resúmenes se generan a nivel agregado, no exponen tu identidad individual).</li>
            <li>Para detectar y prevenir fraude, incluyendo reseñas falsas o cuentas duplicadas.</li>
            <li>Para mejorar la plataforma mediante análisis estadístico agregado.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">3. Comprobantes de transacción</h2>
          <p>Los comprobantes que subís para verificar una reseña (facturas, recibos, capturas de transferencia) se almacenan de forma privada y segura. No se muestran públicamente — solo se indica si la reseña tiene o no comprobante asociado. Tratto puede revisar estos comprobantes internamente para validar la autenticidad de las reseñas y prevenir fraude.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">4. Con quién compartimos tu información</h2>
          <p className="mb-2">No vendemos tu información personal a terceros. Compartimos datos limitados con:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong className="text-brand-dark">Procesadores de pago</strong> (Stripe, MercadoPago) para procesar transacciones.</li>
            <li><strong className="text-brand-dark">Proveedores de infraestructura</strong> (Supabase, Render, Netlify) que almacenan y procesan datos en nuestro nombre bajo acuerdos de confidencialidad.</li>
            <li><strong className="text-brand-dark">Servicios de comunicación</strong> (SendGrid para email, Twilio para WhatsApp) para enviarte notificaciones.</li>
            <li><strong className="text-brand-dark">Anthropic</strong> (proveedor de la IA Claude) para generar resúmenes agregados de reseñas — no se envía información personal identificable en este proceso.</li>
            <li>Autoridades legales, únicamente cuando sea requerido por ley o para proteger nuestros derechos legales.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">5. Tus derechos sobre tus datos</h2>
          <p className="mb-2">Tenés derecho a:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong className="text-brand-dark">Acceder</strong> a la información personal que tenemos sobre vos.</li>
            <li><strong className="text-brand-dark">Corregir</strong> datos inexactos o incompletos.</li>
            <li><strong className="text-brand-dark">Eliminar</strong> tu cuenta y datos asociados, salvo aquellos que debamos retener por obligaciones legales o contables.</li>
            <li><strong className="text-brand-dark">Oponerte</strong> al uso de tus datos para fines de marketing.</li>
            <li><strong className="text-brand-dark">Exportar</strong> tus datos en un formato legible por máquina.</li>
          </ul>
          <p className="mt-2">Para ejercer cualquiera de estos derechos, escribinos a <a href="mailto:privacidad@tratto.lat" className="text-brand-blue hover:underline">privacidad@tratto.lat</a>.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">6. Retención de datos</h2>
          <p>Conservamos tu información personal mientras tu cuenta esté activa. Si eliminás tu cuenta, eliminamos o anonimizamos tus datos personales en un plazo razonable, excepto cuando debamos conservar cierta información por obligaciones legales, contables o para resolver disputas.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">7. Seguridad de la información</h2>
          <p>Implementamos medidas técnicas y organizativas razonables para proteger tu información, incluyendo encriptación de contraseñas, conexiones seguras (HTTPS) y acceso restringido a datos sensibles. Sin embargo, ningún sistema es 100% seguro y no podemos garantizar la seguridad absoluta de la información transmitida por internet.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">8. Menores de edad</h2>
          <p>Tratto no está dirigido a menores de 18 años. No recopilamos intencionalmente información de menores. Si creés que un menor nos ha proporcionado información personal, contactanos para eliminarla.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">9. Transferencias internacionales de datos</h2>
          <p>Tu información puede ser almacenada y procesada en servidores ubicados fuera de tu país de residencia, incluyendo Brasil (Supabase) y Estados Unidos (algunos proveedores de infraestructura). Tomamos medidas razonables para asegurar que estas transferencias cumplan con estándares adecuados de protección de datos.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">10. Cambios a esta política</h2>
          <p>Podemos actualizar esta política de privacidad periódicamente. Te notificaremos sobre cambios materiales por correo electrónico o mediante un aviso visible en la plataforma.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">11. Contacto</h2>
          <p>Si tenés preguntas sobre esta política de privacidad o sobre cómo manejamos tu información, escribinos a <a href="mailto:privacidad@tratto.lat" className="text-brand-blue hover:underline">privacidad@tratto.lat</a>.</p>
        </section>

      </div>
    </div>
  )
}
