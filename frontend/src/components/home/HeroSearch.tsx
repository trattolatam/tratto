'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function HeroSearch() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/buscar${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mx-auto mb-10">
      <div className="relative flex-1">
        <i className="ti ti-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
        <input
          type="text"
          placeholder="¿Qué servicio buscás?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-lg bg-white text-brand-dark placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/40"
        />
      </div>
      <button type="submit" className="btn-primary px-5 py-3 text-sm"><i className="ti ti-search text-base" />Buscar</button>
    </form>
  )
}
