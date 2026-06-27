import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tratto.lat'
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/panel', '/admin', '/api/'] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
