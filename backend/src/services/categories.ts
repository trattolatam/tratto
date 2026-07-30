import { prisma } from '../lib/prisma'

/**
 * Los "intereses" de un usuario y los "intereses a apuntar" de un anuncio
 * ahora son los mismos rubros reales del sitio (Category), no una lista
 * genérica aparte — así lo que un usuario dice que le interesa siempre
 * calza con lo que un anunciante puede elegir al crear su anuncio.
 */
export async function getValidCategorySlugs(): Promise<string[]> {
  const categories = await prisma.category.findMany({ where: { isHidden: false }, select: { slug: true } })
  return categories.map((c) => c.slug)
}
