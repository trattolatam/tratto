import Link from 'next/link'
import { Category } from '@/types'

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {categories.map(cat => (
        <Link key={cat.id} href={`/buscar?categoria=${cat.slug}`} className="card card-hover p-4 text-center group">
          <div className="text-3xl mb-2">{cat.emoji}</div>
          <div className="text-sm font-semibold text-brand-dark group-hover:text-brand-green transition-colors leading-tight">{cat.name}</div>
          {cat._count && <div className="text-xs text-brand-slate mt-1">{cat._count.companies.toLocaleString()} empresas</div>}
        </Link>
      ))}
    </div>
  )
}
