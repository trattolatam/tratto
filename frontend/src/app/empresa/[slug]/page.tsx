import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CompanyProfile } from '@/components/company/CompanyProfile'

interface Props { params: { slug: string } }

async function getCompany(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/companies/${slug}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getCompany(params.slug)
  if (!data) return { title: 'Empresa no encontrada' }
  const { company } = data
  return {
    title: `${company.name} — ${company.category.name} en ${company.city} ⭐${company.ratingAvg.toFixed(1)}`,
    description: `${company.reviewCount} reseñas verificadas de ${company.name} en ${company.city}, ${company.country}. Calificación: ${company.ratingAvg.toFixed(1)}/5.`,
    openGraph: { title: company.name, description: `⭐ ${company.ratingAvg.toFixed(1)} · ${company.reviewCount} reseñas verificadas`, images: company.logoUrl ? [company.logoUrl] : [] },
  }
}

export default async function EmpresaPage({ params }: Props) {
  const data = await getCompany(params.slug)
  if (!data) notFound()
  return <CompanyProfile company={data.company} ads={data.ads} />
}
