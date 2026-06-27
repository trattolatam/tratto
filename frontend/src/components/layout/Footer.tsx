import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-brand-dark text-white mt-24">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-brand-green/20 flex items-center justify-center"><span className="text-brand-green font-bold text-sm">T</span></div>
              <span className="font-bold text-base">Tratto</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed mb-4">La plataforma de reseñas verificadas con comprobante de América Latina.</p>
            <span className="badge-verified text-xs"><span className="badge-verified-dot" />Reseñas verificadas</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Explorar</p>
            <div className="space-y-2">
              {['Electricistas', 'Plomeros', 'Peluquerías', 'Psicólogos', 'Escribanos', 'Ver todo'].map(c => (
                <Link key={c} href="/categorias" className="block text-sm text-white/60 hover:text-white transition-colors">{c}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Empresas</p>
            <div className="space-y-2">
              {[{ label: 'Reclamar perfil', href: '/reclamar' }, { label: 'Planes y precios', href: '/precios' }, { label: 'Normas de la comunidad', href: '/normas-comunidad' }].map(l => (
                <Link key={l.label} href={l.href} className="block text-sm text-white/60 hover:text-white transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Tratto</p>
            <div className="space-y-2">
              {[{ label: 'Cómo funciona', href: '/como-funciona' }, { label: 'Términos', href: '/terminos' }, { label: 'Privacidad', href: '/privacidad' }].map(l => (
                <Link key={l.label} href={l.href} className="block text-sm text-white/60 hover:text-white transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/30">© 2026 Tratto. Todos los derechos reservados.</p>
          <span className="text-xs text-white/30">🇺🇾 Uruguay · 🇦🇷 Argentina · 🇨🇱 Chile · 🇲🇽 México · +14 países</span>
        </div>
      </div>
    </footer>
  )
}
