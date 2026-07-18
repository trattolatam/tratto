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

function starPoints(cx: number, cy: number, points: number, outerR: number, innerR: number): [number, number][] {
  const coords: [number, number][] = []
  const step = Math.PI / points
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = i * step - Math.PI / 2
    coords.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
  }
  return coords
}

function drawArcText(
  doc: PDFKit.PDFDocument, text: string, cx: number, cy: number, radius: number,
  startAngleDeg: number, endAngleDeg: number, color: string, fontSize: number, font: string, flip: boolean = false
) {
  doc.font(font).fontSize(fontSize).fillColor(color)
  const totalAngle = endAngleDeg - startAngleDeg
  const chars = text.split('')
  const charWidths = chars.map((c) => doc.widthOfString(c))
  const totalWidth = charWidths.reduce((a, b) => a + b, 0)
  let angleCursor = startAngleDeg
  for (let i = 0; i < chars.length; i++) {
    const charAngleSpan = (charWidths[i] / totalWidth) * totalAngle
    const charCenterAngle = angleCursor + charAngleSpan / 2
    const rad = (charCenterAngle * Math.PI) / 180
    const x = cx + radius * Math.cos(rad)
    const y = cy + radius * Math.sin(rad)
    doc.save()
    doc.translate(x, y)
    doc.rotate(flip ? charCenterAngle - 90 : charCenterAngle + 90)
    doc.text(chars[i], -charWidths[i] / 2, -fontSize / 2, { lineBreak: false })
    doc.restore()
    angleCursor += charAngleSpan
  }
}

export function generateCertificatePdf(company: CertificateCompany): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth = doc.page.width
    const pageHeight = doc.page.height
    const cream = '#FDFBF5'
    const teal = '#0F6E56'
    const gold = '#F5A623'
    const goldDark = '#C9860F'
    const brandDark = '#0F1B2D'
    const red = '#C0392B'
    const redLight = '#E24B4A'
    const slate = '#64748B'

    doc.rect(0, 0, pageWidth, pageHeight).fill(cream)
    doc.rect(20, 20, pageWidth - 40, pageHeight - 40).lineWidth(1.5).stroke(teal)
    doc.rect(28, 28, pageWidth - 56, pageHeight - 56).lineWidth(1).stroke(gold)

    const logoY = 55
    const badgeSize = 30
    const badgeX = pageWidth / 2 - 62
    doc.roundedRect(badgeX, logoY, badgeSize, badgeSize, 7).fill(teal)
    doc.fontSize(16).fillColor('#FFFFFF').font('Helvetica-Bold').text('T', badgeX, logoY + badgeSize / 2 - 5.7, { width: badgeSize, align: 'center' })
    doc.fontSize(19).fillColor(brandDark).font('Helvetica-Bold').text('Tratto', badgeX + badgeSize + 8, logoY + 6)

    doc.fontSize(11).fillColor(teal).font('Helvetica-Bold').text('CERTIFICADO DE EMPRESA VERIFICADA', 40, 112, { align: 'center', width: pageWidth - 80, characterSpacing: 2.5 })

    doc.fontSize(13).fillColor(slate).font('Times-Italic').text('Se certifica que', 0, 150, { align: 'center' })

    doc.fontSize(34).fillColor(brandDark).font('Times-Bold').text(company.name, 40, 178, { align: 'center', width: pageWidth - 80 })

    doc.fontSize(12).fillColor('#374151').font('Helvetica').text(
      `${company.categoryName} - ${company.city}, ${company.country}`,
      0, 222, { align: 'center' }
    )

    doc.fontSize(11.5).fillColor(brandDark).font('Helvetica').text(
      'es una empresa con identidad verificada en Tratto, la plataforma de reseñas\nverificadas para Latinoamérica.',
      60, 258, { align: 'center', width: pageWidth - 120, lineGap: 4 }
    )

    const statsY = 335
    const statW = (pageWidth - 120) / 3
    const stats: [string, string][] = [
      [company.ratingAvg.toFixed(1), 'CALIFICACIÓN PROMEDIO'],
      [String(company.reviewCount), 'RESEÑAS TOTALES'],
      [`${company.reviewCount > 0 ? Math.round((company.verifiedReviewCount / company.reviewCount) * 100) : 0}%`, 'RESEÑAS VERIFICADAS'],
    ]
    stats.forEach(([value, label], i) => {
      const x = 60 + i * statW
      doc.fontSize(26).fillColor(teal).font('Times-Bold').text(value, x, statsY, { width: statW, align: 'center' })
      doc.fontSize(8.5).fillColor(slate).font('Helvetica-Bold').text(label, x, statsY + 34, { width: statW, align: 'center', characterSpacing: 0.5 })
      if (i < 2) doc.moveTo(x + statW - 4, statsY - 2).lineTo(x + statW - 4, statsY + 30).lineWidth(0.75).stroke('#D1D5DB')
    })

    const sealCx = pageWidth / 2
    const sealCy = 590
    const outerR = 88
    doc.save()
    ;[-1, 1].forEach((side) => {
      const tail = [
        [sealCx + side * 20, sealCy + 55],
        [sealCx + side * 40, sealCy + 12],
        [sealCx + side * 12, sealCy + 12],
        [sealCx + side * 8, sealCy + 130],
        [sealCx + side * 24, sealCy + 118],
      ] as [number, number][]
      doc.polygon(...tail).fill(red)
      const inner = [
        [sealCx + side * 17, sealCy + 50],
        [sealCx + side * 32, sealCy + 16],
        [sealCx + side * 18, sealCy + 16],
        [sealCx + side * 15, sealCy + 108],
      ] as [number, number][]
      doc.polygon(...inner).fill(redLight)
    })
    doc.polygon(...starPoints(sealCx, sealCy, 24, outerR, outerR - 14)).fill(gold)
    doc.circle(sealCx, sealCy, outerR - 16).fill(goldDark)
    doc.circle(sealCx, sealCy, outerR - 20).fill(red)
    doc.circle(sealCx, sealCy, outerR - 36).fill(cream)
    drawArcText(doc, 'EMPRESA', sealCx, sealCy, outerR - 28, 195, 345, '#FFFFFF', 11, 'Helvetica-Bold')
    drawArcText(doc, 'VERIFICADA', sealCx, sealCy, outerR - 28, 165, 15, '#FFFFFF', 11, 'Helvetica-Bold', true)
    ;[192, 348, 12, 168].forEach((deg) => {
      const rad = (deg * Math.PI) / 180
      const sx = sealCx + (outerR - 28) * Math.cos(rad)
      const sy = sealCy + (outerR - 28) * Math.sin(rad)
      doc.polygon(...starPoints(sx, sy, 4, 3, 1.3)).fill('#FFFFFF')
    })
    doc.circle(sealCx, sealCy, outerR - 36).lineWidth(1.5).stroke(gold)
    doc.save()
    doc.lineWidth(6).lineCap('round').strokeColor(teal)
      .moveTo(sealCx - 16, sealCy + 2).lineTo(sealCx - 5, sealCy + 14).lineTo(sealCx + 18, sealCy - 14).stroke()
    doc.restore()
    doc.restore()

    doc.fontSize(10.5).fillColor(teal).font('Helvetica-Bold').text('CALIDAD VERIFICADA', 0, sealCy + 148, { align: 'center', characterSpacing: 2 })

    const issuedDate = new Date().toLocaleDateString('es-UY', { year: 'numeric', month: 'long', day: 'numeric' })
    doc.fontSize(10).fillColor(brandDark).font('Helvetica').text(`Emitido el ${issuedDate}`, 55, pageHeight - 78)
    doc.fontSize(10).fillColor(teal).font('Helvetica-Bold').text(`tratto.lat/empresa/${company.slug}`, 55, pageHeight - 62)
    doc.fontSize(8.5).fillColor(slate).font('Helvetica').text(
      'Este certificado confirma la identidad legal de\nla empresa verificada por Tratto. No constituye\nuna garantía de calidad del servicio.',
      pageWidth - 280, pageHeight - 82, { align: 'right', width: 225, lineGap: 2 }
    )

    doc.end()
  })
}
