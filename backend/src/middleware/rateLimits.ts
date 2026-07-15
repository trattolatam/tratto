/**
 * Configuraciones de rate limiting específicas para rutas sensibles.
 * Se aplican por ruta además del límite global configurado en index.ts.
 *
 * Uso en una ruta:
 *   app.post('/register', { config: { rateLimit: authRateLimit } }, async (req, reply) => {...})
 */

// ── Registro y login — máximo 5 intentos cada 15 minutos por IP ──────────────
// Evita ataques de fuerza bruta y creación masiva de cuentas falsas
export const authRateLimit = {
  max: 5,
  timeWindow: '15 minutes',
}

// ── Crear reseña — máximo 3 cada 10 minutos por IP ────────────────────────────
// Una persona real no deja más de 2-3 reseñas en poco tiempo
export const createReviewRateLimit = {
  max: 3,
  timeWindow: '10 minutes',
}

// ── Subida de archivos — máximo 10 cada 10 minutos por IP ────────────────────
// Protege contra abuso del storage de Supabase
export const uploadRateLimit = {
  max: 10,
  timeWindow: '10 minutes',
}

// ── Envío de leads/consultas — máximo 5 cada 30 minutos por IP ───────────────
// Evita espam a las empresas
export const leadRateLimit = {
  max: 5,
  timeWindow: '30 minutes',
}

// ── Revelar contacto de empresa — máximo 20 cada 10 minutos por IP ───────────
// Evita scraping masivo de teléfonos/webs, sin molestar a un usuario real
export const contactRevealRateLimit = {
  max: 20,
  timeWindow: '10 minutes',
}

// ── Recuperación de contraseña — máximo 3 cada 30 minutos por IP ─────────────
export const passwordResetRateLimit = {
  max: 3,
  timeWindow: '30 minutes',
}
