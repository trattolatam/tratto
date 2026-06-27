import type { Metadata } from 'next'
import '../styles/globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: { template: '%s | Tratto', default: 'Tratto — Reseñas verificadas para LATAM' },
  description: 'Encontrá los mejores electricistas, plomeros, peluquerías y profesionales con reseñas verificadas con comprobante. La plataforma de confianza de América Latina.',
  keywords: ['reseñas verificadas', 'servicios', 'LATAM', 'electricistas', 'plomeros', 'peluquerías'],
  openGraph: { siteName: 'Tratto', locale: 'es_419', type: 'website' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
