import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Términos de uso — Tratto',
  description: 'Términos y condiciones de uso de la plataforma Tratto.',
}

export default function TerminosPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-brand-dark mb-2">Términos de uso</h1>
      <p className="text-sm text-brand-slate mb-10">Última actualización: {new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="space-y-8 text-sm text-brand-slate leading-relaxed">

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">1. Aceptación de los términos</h2>
          <p>Al registrarte o usar Tratto ("la Plataforma"), aceptás estos Términos de Uso en su totalidad. Si no estás de acuerdo con alguna parte de estos términos, no debés usar la Plataforma. Tratto es operada con el objetivo de conectar usuarios con empresas de servicios en América Latina a través de un sistema de reseñas verificadas.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">2. Quién puede usar Tratto</h2>
          <p>Debés tener al menos 18 años o la mayoría de edad legal en tu país de residencia para crear una cuenta. Al registrarte, declarás que la información que proporcionás es verdadera, exacta y completa.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">3. Cuentas de usuario</h2>
          <p className="mb-2">Existen dos tipos de cuenta:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong className="text-brand-dark">Usuario:</strong> puede buscar empresas, dejar reseñas y contactar empresas para solicitar servicios.</li>
            <li><strong className="text-brand-dark">Empresa:</strong> puede reclamar y gestionar el perfil de su negocio, responder reseñas y acceder a herramientas adicionales según su plan.</li>
          </ul>
          <p className="mt-2">Sos responsable de mantener la confidencialidad de tu contraseña y de toda actividad que ocurra en tu cuenta.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">4. Reseñas y contenido del usuario</h2>
          <p className="mb-2">Al publicar una reseña en Tratto, declarás y garantizás que:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>La experiencia que describís es real y ocurrió tal como la relatás.</li>
            <li>Si adjuntás un comprobante de transacción, este es auténtico y corresponde a una transacción real con la empresa reseñada.</li>
            <li>No tenés ningún vínculo laboral, familiar o de competencia con la empresa que estás reseñando que pudiera sesgar tu opinión de forma no declarada.</li>
            <li>El contenido no es difamatorio, ofensivo, discriminatorio ni viola derechos de terceros.</li>
          </ul>
          <p className="mt-2">Tratto se reserva el derecho de moderar, ocultar o eliminar cualquier reseña que viole estos términos, sin necesidad de notificación previa. Las reseñas falsas, fabricadas o que utilicen comprobantes falsificados pueden resultar en la suspensión permanente de la cuenta.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">5. Verificación de reseñas</h2>
          <p>El sistema de verificación de Tratto se basa en la presentación voluntaria de comprobantes de transacción (facturas, recibos, confirmaciones de pago) por parte del usuario que deja la reseña. Tratto realiza revisiones razonables pero no garantiza la autenticidad absoluta de cada comprobante presentado. El badge de "reseña verificada" indica que se presentó un comprobante, no constituye una certificación legal de veracidad absoluta.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">6. Perfiles de empresa y reclamación</h2>
          <p>Las empresas pueden aparecer en Tratto con perfiles creados a partir de información pública, incluso antes de ser reclamados por su propietario. Cualquier empresa puede reclamar su perfil de forma gratuita proporcionando su identificación fiscal correspondiente (RUT, CUIT, RFC, RUC u otro documento equivalente según el país). Tratto se reserva el derecho de verificar esta información y de rechazar reclamaciones fraudulentas.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">7. Planes de suscripción y pagos</h2>
          <p>Las empresas pueden acceder a planes de pago (Profesional, Premium) que desbloquean funcionalidades adicionales. Los pagos se procesan a través de Stripe o MercadoPago según la elección del usuario. Las suscripciones se renuevan automáticamente cada mes salvo cancelación. Podés cancelar en cualquier momento desde tu panel; el plan permanece activo hasta el final del período ya pago.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">8. Medallas y reconocimientos</h2>
          <p>Las medallas otorgadas por desempeño (Top del rubro, 50+ reseñas verificadas, etc.) se calculan mediante reglas automáticas basadas en el historial real de reseñas de cada empresa. Las medallas no pueden comprarse, removerse a pedido, ni se ven afectadas por el plan de suscripción de la empresa.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">9. Conducta prohibida</h2>
          <p className="mb-2">Está prohibido:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Crear cuentas falsas o múltiples cuentas para manipular calificaciones.</li>
            <li>Publicar reseñas sobre tu propia empresa o la de un competidor con intención de manipular el mercado.</li>
            <li>Falsificar comprobantes de transacción.</li>
            <li>Usar la plataforma para acosar, difamar o extorsionar a empresas o usuarios.</li>
            <li>Intentar vulnerar la seguridad de la plataforma o acceder a datos de otros usuarios sin autorización.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">10. Limitación de responsabilidad</h2>
          <p>Tratto es un intermediario que facilita información entre usuarios y empresas. No somos parte de ninguna transacción de servicios que se realice entre un usuario y una empresa listada en la plataforma. No garantizamos la calidad, seguridad o legalidad de los servicios ofrecidos por las empresas listadas, más allá de la información de reseñas disponible.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">11. Modificaciones a estos términos</h2>
          <p>Podemos actualizar estos términos periódicamente. Te notificaremos sobre cambios materiales por correo electrónico o mediante un aviso en la plataforma. El uso continuado de Tratto después de dichos cambios constituye tu aceptación de los términos actualizados.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">12. Ley aplicable</h2>
          <p>Estos términos se rigen por las leyes de la República Oriental del Uruguay, sin perjuicio de las normas de protección al consumidor que puedan aplicar en tu país de residencia dentro de América Latina.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-dark mb-2">13. Contacto</h2>
          <p>Para consultas sobre estos términos, podés escribirnos a <a href="mailto:legal@tratto.lat" className="text-brand-blue hover:underline">legal@tratto.lat</a>.</p>
        </section>

      </div>
    </div>
  )
}
