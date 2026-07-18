'use client'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

export function Navbar() {
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const userMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/buscar${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ''}`)
  }

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    setUserMenuOpen(false)
    router.push('/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-brand-dark flex items-center justify-center">
            <span className="text-brand-green font-bold text-sm">T</span>
          </div>
          <span className="font-bold text-brand-dark text-base tracking-tight">Tratto</span>
        </Link>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md relative">
          <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-green transition-colors"><i className="ti ti-search text-base" /></button>
          <input type="text" placeholder="Buscar electricistas, peluquerías, psicólogos..." className="input pl-9 py-2 text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </form>

        <div className="hidden md:flex items-center gap-1">
          <Link href="/categorias" className="text-sm text-gray-600 hover:text-brand-dark px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">Categorías</Link>
          <Link href="/como-funciona" className="text-sm text-gray-600 hover:text-brand-dark px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">Cómo funciona</Link>
          <Link href="/precios" className="text-sm text-gray-600 hover:text-brand-dark px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">Para empresas</Link>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              {user.role === 'BUSINESS' && (
                <Link href="/panel" className="btn-secondary py-1.5 text-xs hidden md:flex"><i className="ti ti-layout-dashboard text-sm" />Mi panel</Link>
              )}
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(v => !v)} className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green font-semibold text-sm">{user.name.charAt(0).toUpperCase()}</button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-10 w-44 bg-white shadow-card-hover rounded-lg border border-gray-100 py-1 z-50">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-brand-dark truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    <Link href="/perfil" onClick={() => setUserMenuOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-dark hover:bg-gray-50 text-left"><i className="ti ti-user-circle text-sm" /> Mi perfil</Link>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-red hover:bg-red-50 text-left"><i className="ti ti-logout text-sm" /> Cerrar sesión</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" className="btn-secondary py-1.5 text-xs hidden sm:flex">Iniciar sesión</Link>
              <Link href="/registro" className="btn-primary py-1.5 text-xs"><i className="ti ti-pencil text-sm" />Escribir reseña</Link>
            </>
          )}
          <button className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
            <i className={`ti ${menuOpen ? 'ti-x' : 'ti-menu-2'} text-lg`} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          <Link href="/categorias" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50" onClick={() => setMenuOpen(false)}><i className="ti ti-category text-base" /> Categorías</Link>
          <Link href="/como-funciona" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50" onClick={() => setMenuOpen(false)}><i className="ti ti-help text-base" /> Cómo funciona</Link>
          <Link href="/precios" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50" onClick={() => setMenuOpen(false)}><i className="ti ti-building-store text-base" /> Para empresas</Link>
          {!user && (
            <div className="pt-2 border-t border-gray-100 flex gap-2">
              <Link href="/login" className="btn-secondary flex-1 py-2 text-sm" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link>
              <Link href="/registro" className="btn-primary flex-1 py-2 text-sm" onClick={() => setMenuOpen(false)}>Registrarse</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
