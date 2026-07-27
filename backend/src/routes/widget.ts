import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

/**
 * Widget embebible de calificación (plan Premium).
 * Distinto de /api/v1/rating (la API con key): esto es 100% público, no necesita
 * key ni login — el companyId ya es información pública (se ve en la URL del perfil).
 * Lo separamos de la API con key a propósito: un widget puede recibir miles de
 * vistas si la web de la empresa tiene tráfico, y no tendría sentido que eso
 * consuma el límite mensual de 1000 solicitudes pensado para integraciones reales.
 *
 * Uso: <div id="tratto-widget"></div><script src=".../api/v1/widget/COMPANY_ID.js"></script>
 */
export default async function widgetRoutes(app: FastifyInstance) {
  // El CORS global de la app (registrado una vez en index.ts) solo permite pedidos
  // desde FRONTEND_URL (tratto.lat) — correcto para el resto de la API, pero el
  // widget está pensado justamente para que lo llame el navegador de un visitante
  // desde la web DE LA EMPRESA (un dominio de un tercero), no desde tratto.lat.
  //
  // OJO: no podemos registrar el plugin @fastify/cors una segunda vez acá — a
  // diferencia de una ruta normal, ese plugin se instala a nivel global sin
  // importar en qué archivo lo registres, así que una segunda vez choca con la
  // primera y tira el servidor entero al arrancar (FST_ERR_DEC_ALREADY_PRESENT).
  // En vez de eso, agregamos el header de CORS a mano, solo en las respuestas
  // de estas dos rutas — sin tocar el plugin global para nada.
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')
  })

  // ─── Datos públicos para el widget (JSON, cacheado 5 min) ───────────────────
  app.get('/:companyId/data', async (request, reply) => {
    const { companyId } = request.params as { companyId: string }
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, slug: true, ratingAvg: true, reviewCount: true, isVerified: true, plan: true },
    })

    if (!company || !['PREMIUM', 'ENTERPRISE'].includes(company.plan)) {
      // Si la empresa bajó de plan, el widget deja de mostrar datos solo —
      // así no queda un widget de Premium funcionando gratis en una web de terceros.
      return reply.status(404).send({ error: true, message: 'Widget no disponible' })
    }

    reply.header('Cache-Control', 'public, max-age=300') // 5 min: baja la carga sin volverse desactualizado
    return reply.send({
      name: company.name,
      slug: company.slug,
      rating: company.ratingAvg,
      reviewCount: company.reviewCount,
      verified: company.isVerified,
      profileUrl: `${process.env.FRONTEND_URL || 'https://tratto.lat'}/empresa/${company.slug}`,
    })
  })

  // ─── El script en sí — esto es lo que la empresa pega en su web ───────────
  app.get('/:companyId.js', async (request, reply) => {
    const { companyId } = request.params as { companyId: string }
    // Usamos el host real del pedido que llegó, no una variable de entorno —
    // así el script funciona sea cual sea el dominio desde el que se sirve (Render,
    // un dominio propio si lo cambian, o incluso pruebas locales), sin depender de
    // que alguien haya configurado bien API_URL en el entorno.
    const apiBase = `https://${request.hostname}`

    reply.header('Content-Type', 'application/javascript; charset=utf-8')
    reply.header('Cache-Control', 'public, max-age=3600') // el script cambia poco — cachea más tiempo que los datos

    return reply.send(buildWidgetScript(companyId, apiBase))
  })
}

function buildWidgetScript(companyId: string, apiBase: string): string {
  // Todo en un IIFE para no filtrar variables globales a la página que lo embebe.
  // Usa Shadow DOM para que el CSS de la página anfitriona no le rompa el diseño.
  return `(function () {
  var script = document.currentScript;
  var host = document.createElement('div');
  script.parentNode.insertBefore(host, script.nextSibling);
  var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  fetch('${apiBase}/api/v1/widget/${companyId}/data')
    .then(function (r) { if (!r.ok) throw new Error('sin datos'); return r.json(); })
    .then(function (d) {
      var stars = '';
      var full = Math.round(d.rating);
      for (var i = 0; i < 5; i++) stars += i < full ? '★' : '☆';

      shadow.innerHTML =
        '<a href="' + d.profileUrl + '" target="_blank" rel="noopener noreferrer" ' +
        'style="all:initial;display:flex;align-items:center;gap:10px;padding:12px 16px;' +
        'border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;' +
        'font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;text-decoration:none;' +
        'max-width:320px;box-shadow:0 1px 2px rgba(0,0,0,0.04);cursor:pointer;">' +
          '<div style="width:32px;height:32px;border-radius:8px;background:#0f172a;' +
          'display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
            '<span style="color:#10b981;font-weight:700;font-size:15px;">T</span>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:12px;color:#6b7280;line-height:1.3;">' +
              (d.verified ? '✓ Verificado en Tratto' : 'En Tratto') +
            '</div>' +
            '<div style="font-size:14px;color:#0f172a;font-weight:600;line-height:1.4;">' +
              '<span style="color:#f59e0b;letter-spacing:1px;">' + stars + '</span> ' +
              d.rating.toFixed(1) + ' · ' + d.reviewCount + ' reseñas' +
            '</div>' +
          '</div>' +
        '</a>';

      // Marcado para buscadores (schema.org) — no se ve, pero ayuda a que Google
      // pueda mostrar estrellas en el resultado de búsqueda de la empresa.
      var ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.text = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'LocalBusiness', name: d.name,
        aggregateRating: { '@type': 'AggregateRating', ratingValue: d.rating, reviewCount: d.reviewCount },
      });
      host.appendChild(ld);
    })
    .catch(function () { host.style.display = 'none'; });
})();`
}
