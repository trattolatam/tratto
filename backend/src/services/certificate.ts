import PDFDocument from 'pdfkit'

interface CertificateCompany {
  name: string
  slug: string
  city: string
  country: string
  categoryName: string
  ratingAvg: number
  reviewCount: number
  verifiedReviewCount: number
  isVerified: boolean
}

/**
 * Genera el certificado PDF descargable de una empresa (feature del plan Profesional+).
 * Devuelve un Buffer con el PDF ya armado, listo para enviar como respuesta HTTP.
 */
export function generateCertificatePdf(company: CertificateCompany): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth = doc.page.width
    const pageHeight = doc.page.height
    const brandGreen = '#16a34a'
    const brandDark = '#0f172a'
    const brandSlate = '#64748b'

    // ─── Marco exterior ───────────────────────────────────────────────
    doc.rect(24, 24, pageWidth - 48, pageHeight - 48).lineWidth(2).stroke(brandGreen)
    doc.rect(34, 34, pageWidth - 68, pageHeight - 68).lineWidth(0.5).stroke('#cbd5e1')

    // ─── Encabezado ───────────────────────────────────────────────────
    doc.fontSize(14).fillColor(brandSlate).font('Helvetica').text('TRATTO', 0, 90, { align: 'center', characterSpacing: 4 })
    doc.fontSize(28).fillColor(brandDark).font('Helvetica-Bold').text('Certificado de Empresa Verificada', 0, 115, { align: 'center' })

    doc.moveTo(pageWidth / 2 - 60, 165).lineTo(pageWidth / 2 + 60, 165).lineWidth(2).stroke(brandGreen)

    // ─── Cuerpo ───────────────────────────────────────────────────────
    doc.fontSize(12).fillColor(brandSlate).font('Helvetica').text('Se certifica que', 0, 200, { align: 'center' })

    doc.fontSize(26).fillColor(brandDark).font('Helvetica-Bold').text(company.name, 0, 225, { align: 'center' })

    doc.fontSize(12).fillColor(brandSlate).font('Helvetica').text(
      `${company.categoryName} · ${company.city}, ${company.country}`,
      0, 262, { align: 'center' }
    )

    doc.fontSize(12).fillColor(brandDark).font('Helvetica').text(
      'es una empresa con identidad verificada en Tratto, la plataforma de reseñas\nverificadas para Latinoamérica.',
      60, 300, { align: 'center', width: pageWidth - 120, lineGap: 4 }
    )

    // ─── Métricas ───────────────────────────────────────────────────────
    const statsY = 390
    const statW = (pageWidth - 120) / 3
    const stats: [string, string][] = [
      [company.ratingAvg.toFixed(1), 'Calificación promedio'],
      [String(company.reviewCount), 'Reseñas totales'],
      [`${company.reviewCount > 0 ? Math.round((company.verifiedReviewCount / company.reviewCount) * 100) : 0}%`, 'Reseñas verificadas'],
    ]
    stats.forEach(([value, label], i) => {
      const x = 60 + i * statW
      doc.fontSize(24).fillColor(brandGreen).font('Helvetica-Bold').text(value, x, statsY, { width: statW, align: 'center' })
      doc.fontSize(10).fillColor(brandSlate).font('Helvetica').text(label, x, statsY + 32, { width: statW, align: 'center' })
    })

    // ─── Pie ───────────────────────────────────────────────────────────
    const issuedDate = new Date().toLocaleDateString('es-UY', { year: 'numeric', month: 'long', day: 'numeric' })
    doc.fontSize(10).fillColor(brandSlate).font('Helvetica').text(`Emitido el ${issuedDate}`, 0, pageHeight - 130, { align: 'center' })
    doc.fontSize(10).fillColor(brandSlate).font('Helvetica').text(`tratto.lat/empresa/${company.slug}`, 0, pageHeight - 112, { align: 'center' })
    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica').text(
      'Este certificado confirma la identidad legal de la empresa verificada por Tratto. No constituye una garantía de calidad del servicio.',
      60, pageHeight - 80, { align: 'center', width: pageWidth - 120 }
    )

    doc.end()
  })
}
