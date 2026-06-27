# Control de costos — Antes de activar IA en producción

## 1. Límite de gasto en Anthropic Console

1. Entrar a **console.anthropic.com**
2. Ir a **Settings → Billing → Usage limits**
3. Configurar:
   - **Límite mensual:** empezar con USD 20 (el cálculo estimado es ~USD 12/mes con 1.000 empresas activas, así que esto da margen)
   - **Alerta al 80%:** activar notificación por email cuando se alcance el 80% del límite
4. Guardar — esto evita que un error en el código (por ejemplo, el batch corriendo en loop) genere una factura sorpresa

## 2. Límite de requests en el código del batch de IA

Ya está implementado en `summaries.ts` — el batch procesa máximo 50 empresas por ejecución y espera 500ms entre llamadas. Esto previene tanto sobrecostos como rate limiting de la propia API de Anthropic.

Verificar antes de producción que el cron job que llama a `runBatchAiSummaries()` esté configurado para correr **una sola vez por semana**, no más seguido.

## 3. Límites en Stripe

1. **Stripe Dashboard → Settings → Radar** — activar las reglas de detección de fraude por default
2. **Webhooks** — verificar que `STRIPE_WEBHOOK_SECRET` esté correctamente configurado para que nadie pueda simular webhooks falsos y activarse un plan gratis

## 4. Límites en Supabase

1. **Settings → Billing** — revisar el plan gratuito incluye 500MB de BD y 1GB de storage
2. Configurar alerta cuando se acerque al límite (Supabase notifica automáticamente al 80% en el plan free)
3. Si el storage de comprobantes crece rápido, considerar comprimir imágenes antes de subirlas (ya se puede agregar con `sharp` en el backend si hace falta más adelante)

## 5. Límites en Render

1. El plan free tiene 750 horas/mes — suficiente para un servicio corriendo 24/7 (un mes tiene ~720 horas)
2. El servicio se "duerme" tras 15 min de inactividad en el plan free — esto es aceptable al principio, pero genera una demora de ~30 segundos en la primera request después de inactividad
3. Cuando el tráfico crezca, pasar al plan Starter (USD 7/mes) elimina ese problema

## 6. Checklist rápido antes de ir a producción

- [ ] Límite mensual configurado en Anthropic Console
- [ ] Alerta de uso al 80% activada en Anthropic
- [ ] STRIPE_WEBHOOK_SECRET verificado y correcto en Render
- [ ] Radar de Stripe activado
- [ ] Alertas de Supabase revisadas
- [ ] Rate limiting del backend probado (ver `RATE_LIMITING_TEST.md`)
