/**
 * Precios de Tratto Ads. Números de partida informados por benchmarks reales
 * de mercado LatAm (Meta Ads: CPC ~USD 0.20–1.50, CPM ~USD 3–12), no un valor
 * arbitrario — pero siguen siendo una decisión de negocio, no algo técnico.
 * Cambiá estos dos números cuando quieras ajustar el precio; no hay que tocar
 * nada más del código para eso.
 *
 * Nota para más adelante: cuando haya varios anunciantes compitiendo por el
 * mismo rubro/país al mismo tiempo, ahí sí tiene sentido pasar a un sistema
 * de subasta en tiempo real (así funciona Yelp, por ejemplo) — con uno o dos
 * anunciantes como hoy, una subasta no tiene "mercado" real para determinar nada.
 */
export const DEFAULT_CPC_USD = 0.5
export const DEFAULT_CPM_USD = 3.0
