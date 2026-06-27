import { MetadataRoute } from 'next'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const CATEGORY_SLUGS = ['electricistas', 'plomeria', 'aire-acondicionado', 'gasistas', 'pintores', 'cerrajeros', 'construccion', 'peluquerias', 'estetica', 'spas', 'cejas-pestanas-unas', 'nutricion', 'gimnasios', 'psicologos', 'medicos-domicilio', 'escribanos']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tratto.lat'
  const now = new Date()
  const urls: MetadataRoute.Sitemap = []

  const staticPages = [
    { url: '/', priority: 1.0, changeFrequency: 'daily' as const }, { url: '/categorias', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/como-funciona', priority: 0.8, changeFrequency: 'monthly' as const }, { url: '/precios', priority: 0.8, changeFrequency: 'weekly' as const },
    { url: '/reclamar', priority: 0.7, changeFrequency: 'monthly' as const },
  ]
  for (const page of staticPages) urls.push({ url: `${baseUrl}${page.url}`, lastModified: now, changeFrequency: page.changeFrequency, priority: page.priority })

  for (const categorySlug of CATEGORY_SLUGS) {
    urls.push({ url: `${baseUrl}/buscar?categoria=${categorySlug}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 })
  }

  try {
    const res = await fetch(`${API_URL}/api/companies?limit=100`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      for (const company of data.companies || []) {
        urls.push({ url: `${baseUrl}/empresa/${company.slug}`, lastModified: new Date(company.updatedAt || now), changeFrequency: 'weekly', priority: company.plan === 'FREE' ? 0.5 : 0.7 })
      }
    }
  } catch (err) { console.error('Error fetching companies for sitemap:', err) }

  return urls
}
