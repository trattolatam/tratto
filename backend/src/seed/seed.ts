import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const CATEGORIES = [
  { name: 'Electricistas', slug: 'electricistas', emoji: '⚡', phase: 1, priority: true },
  { name: 'Plomería', slug: 'plomeria', emoji: '🔧', phase: 1, priority: true },
  { name: 'Aire acondicionado', slug: 'aire-acondicionado', emoji: '❄️', phase: 1, priority: true },
  { name: 'Gasistas matriculados', slug: 'gasistas', emoji: '🔥', phase: 1, priority: true },
  { name: 'Pintores', slug: 'pintores', emoji: '🎨', phase: 1, priority: true },
  { name: 'Cerrajeros', slug: 'cerrajeros', emoji: '🔑', phase: 1, priority: true },
  { name: 'Construcción y reforma', slug: 'construccion', emoji: '🏗️', phase: 1, priority: true },
  { name: 'Peluquerías y salones', slug: 'peluquerias', emoji: '✂️', phase: 1, priority: true },
  { name: 'Clínicas de estética', slug: 'estetica', emoji: '✨', phase: 1, priority: true },
  { name: 'Spas y masajes', slug: 'spas', emoji: '💆', phase: 1, priority: true },
  { name: 'Cejas, pestañas y uñas', slug: 'cejas-pestanas-unas', emoji: '👁️', phase: 1, priority: true },
  { name: 'Nutrición y dietistas', slug: 'nutricion', emoji: '🥗', phase: 1, priority: true },
  { name: 'Gimnasios y pilates', slug: 'gimnasios', emoji: '🏃', phase: 1, priority: true },
  { name: 'Psicólogos', slug: 'psicologos', emoji: '🧠', phase: 1, priority: true },
  { name: 'Médicos a domicilio', slug: 'medicos-domicilio', emoji: '🩺', phase: 1, priority: true },
  { name: 'Escribanos y notarios', slug: 'escribanos', emoji: '📝', phase: 1, priority: true },
  { name: 'Abogados', slug: 'abogados', emoji: '⚖️', phase: 2, priority: false },
  { name: 'Contadores', slug: 'contadores', emoji: '🧮', phase: 2, priority: false },
  { name: 'Veterinarios', slug: 'veterinarios', emoji: '🐾', phase: 2, priority: false },
  { name: 'Técnicos IT', slug: 'tecnicos-it', emoji: '💻', phase: 2, priority: false },
  { name: 'Talleres mecánicos', slug: 'talleres-mecanicos', emoji: '🚗', phase: 2, priority: false },
  { name: 'Chapistas y pintores', slug: 'chapistas', emoji: '🔨', phase: 2, priority: false },
  { name: 'Gomerías y neumáticos', slug: 'gomerias', emoji: '⭕', phase: 2, priority: false },
  { name: 'Electricistas de autos', slug: 'electricistas-autos', emoji: '🔌', phase: 2, priority: false },
  { name: 'Gestores administrativos', slug: 'gestores', emoji: '📋', phase: 2, priority: false },
  { name: 'Academias y tutores', slug: 'academias', emoji: '📚', phase: 2, priority: false },
]

const SAMPLE_COMPANIES = [
  { name: 'ElectroPlus Uruguay', city: 'Montevideo', country: 'UY', categorySlug: 'electricistas', phone: '+598 99 123 456', description: 'Instalaciones eléctricas residenciales y comerciales. 15 años de experiencia en Montevideo.' },
  { name: 'Plomería García', city: 'Montevideo', country: 'UY', categorySlug: 'plomeria', phone: '+598 98 234 567', description: 'Servicio de plomería 24hs. Urgencias y trabajos programados.' },
  { name: 'AireClima UY', city: 'Montevideo', country: 'UY', categorySlug: 'aire-acondicionado', phone: '+598 97 345 678', description: 'Instalación y service de aire acondicionado. Todas las marcas.' },
  { name: 'Studio Pelo Montevideo', city: 'Montevideo', country: 'UY', categorySlug: 'peluquerias', phone: '+598 96 456 789', description: 'Salón de peluquería premium. Especialistas en color y tratamientos.' },
  { name: 'Estética Renata', city: 'Montevideo', country: 'UY', categorySlug: 'estetica', phone: '+598 95 567 890', description: 'Clínica de estética facial y corporal. Laser, rellenos y tratamientos.' },
  { name: 'Dra. Sofía Méndez', city: 'Montevideo', country: 'UY', categorySlug: 'psicologos', phone: '+598 94 678 901', description: 'Psicóloga clínica. Atención adultos y adolescentes.' },
  { name: 'Escribanía Rodríguez', city: 'Montevideo', country: 'UY', categorySlug: 'escribanos', phone: '+598 93 789 012', description: 'Escribanía pública. Compraventas, sucesiones, poderes.' },
  { name: 'Cerrajería 24hs Montevideo', city: 'Montevideo', country: 'UY', categorySlug: 'cerrajeros', phone: '+598 92 890 123', description: 'Servicio de cerrajería las 24 horas.' },
  { name: 'Electricidad Ramos', city: 'Buenos Aires', country: 'AR', categorySlug: 'electricistas', phone: '+54 11 4123 4567', description: 'Electricista matriculado. Instalaciones, tableros y reparaciones.' },
  { name: 'Plomería Fernández', city: 'Buenos Aires', country: 'AR', categorySlug: 'plomeria', phone: '+54 11 4234 5678', description: 'Plomería general y gas. Urgencias 24hs en CABA y GBA.' },
  { name: 'Salon Belleza Palermo', city: 'Buenos Aires', country: 'AR', categorySlug: 'peluquerias', phone: '+54 11 4345 6789', description: 'Peluquería y salón de belleza en Palermo.' },
  { name: 'Centro Estético Recoleta', city: 'Buenos Aires', country: 'AR', categorySlug: 'estetica', phone: '+54 11 4456 7890', description: 'Centro de estética médica. Botox, rellenos, laser.' },
  { name: 'Dr. Martín Álvarez', city: 'Buenos Aires', country: 'AR', categorySlug: 'psicologos', phone: '+54 11 4567 8901', description: 'Psicólogo. Terapia cognitivo conductual.' },
  { name: 'Taller Mecánico San Telmo', city: 'Buenos Aires', country: 'AR', categorySlug: 'talleres-mecanicos', phone: '+54 11 4678 9012', description: 'Taller mecánico integral. Todas las marcas.' },
  { name: 'ElectroSur Santiago', city: 'Santiago', country: 'CL', categorySlug: 'electricistas', phone: '+56 9 8123 4567', description: 'Electricista certificado SEC.' },
  { name: 'Peluquería Las Condes', city: 'Santiago', country: 'CL', categorySlug: 'peluquerias', phone: '+56 9 8234 5678', description: 'Salón de peluquería y estética en Las Condes.' },
  { name: 'Electricistas CDMX', city: 'CDMX', country: 'MX', categorySlug: 'electricistas', phone: '+52 55 1234 5678', description: 'Servicio eléctrico residencial y comercial.' },
  { name: 'Dra. Ramírez Psicología', city: 'CDMX', country: 'MX', categorySlug: 'psicologos', phone: '+52 55 2345 6789', description: 'Psicóloga clínica con 10 años de experiencia.' },
]

const REVIEW_TEMPLATES = [
  { rating: 5, body: 'Excelente servicio. Llegaron a tiempo, el trabajo quedó perfecto y el precio fue exactamente el presupuestado. 100% recomendable.', isVerified: true, proofType: 'factura' },
  { rating: 5, body: 'Muy profesionales. Resolvieron el problema rápido y dejaron todo limpio. Ya los contraté dos veces y siempre conformes.', isVerified: true, proofType: 'recibo' },
  { rating: 4, body: 'Buen trabajo en general. Tardaron un poco más de lo acordado pero el resultado final fue muy bueno.', isVerified: true, proofType: 'transferencia' },
  { rating: 5, body: 'La mejor experiencia que tuve con este tipo de servicio. Muy amables, puntuales y el precio fue justo.', isVerified: true, proofType: 'factura' },
  { rating: 4, body: 'Muy buen servicio. El trabajo quedó prolijo y limpio. Me explicaron todo lo que hicieron.', isVerified: false, proofType: null },
  { rating: 3, body: 'Servicio correcto pero tardaron más de lo prometido. La comunicación mejorable.', isVerified: false, proofType: null },
  { rating: 5, body: 'Increíble. Vinieron al día siguiente, resolvieron todo en dos horas y el precio fue razonable.', isVerified: true, proofType: 'comprobante de pago' },
  { rating: 4, body: 'Muy conformes. Profesionales, limpios y cumplieron con el presupuesto.', isVerified: true, proofType: 'factura' },
]

function generateSlug(name: string, city: string): string {
  const base = `${name}-${city}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

const REVIEWER_NAMES = ['María García', 'Carlos Rodríguez', 'Ana López', 'Juan Martínez', 'Laura Fernández', 'Diego González', 'Sofía Torres', 'Pablo Díaz', 'Valentina Ruiz', 'Mateo Sánchez', 'Isabella Pérez', 'Sebastián Morales', 'Camila Jiménez', 'Nicolás Castro', 'Lucía Vargas', 'Andrés Romero']

async function main() {
  console.log('🌱 Iniciando seed de Tratto...\n')

  console.log('👤 Creando usuario admin...')
  const adminHash = await bcrypt.hash('admin123456', 12)
  await prisma.user.upsert({
    where: { email: 'admin@tratto.lat' }, update: {},
    create: { email: 'admin@tratto.lat', passwordHash: adminHash, name: 'Admin Tratto', role: 'ADMIN', country: 'UY', isVerified: true },
  })
  console.log(`   ✅ Admin creado: admin@tratto.lat / admin123456\n`)

  console.log('📂 Creando categorías...')
  const categoryMap: Record<string, string> = {}
  for (const cat of CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug }, update: { name: cat.name, emoji: cat.emoji, phase: cat.phase, priority: cat.priority },
      create: { name: cat.name, slug: cat.slug, emoji: cat.emoji, phase: cat.phase, priority: cat.priority },
    })
    categoryMap[cat.slug] = created.id
  }
  console.log(`   ✅ ${CATEGORIES.length} categorías creadas\n`)

  console.log('👥 Creando usuarios de ejemplo...')
  const reviewerHash = await bcrypt.hash('reviewer123', 12)
  const reviewers = []
  for (let i = 0; i < REVIEWER_NAMES.length; i++) {
    const name = REVIEWER_NAMES[i]
    const email = `reviewer${i + 1}@example.com`
    const countries = ['UY', 'AR', 'CL', 'MX']
    const user = await prisma.user.upsert({
      where: { email }, update: {},
      create: { email, passwordHash: reviewerHash, name, role: 'USER', country: countries[i % countries.length], isVerified: true },
    })
    reviewers.push(user)
  }
  console.log(`   ✅ ${reviewers.length} usuarios de ejemplo creados\n`)

  console.log('🏢 Creando empresas de ejemplo...')
  const createdCompanies = []
  for (const companyData of SAMPLE_COMPANIES) {
    const categoryId = categoryMap[companyData.categorySlug]
    if (!categoryId) continue
    const slug = generateSlug(companyData.name, companyData.city)
    const company = await prisma.company.upsert({
      where: { slug }, update: {},
      create: { name: companyData.name, slug, description: companyData.description, categoryId, country: companyData.country, city: companyData.city, phone: companyData.phone, plan: 'FREE', isVerified: false, ratingAvg: 0, reviewCount: 0 },
    })
    createdCompanies.push(company)
  }
  console.log(`   ✅ ${createdCompanies.length} empresas creadas\n`)

  console.log('⭐ Creando reseñas de ejemplo...')
  let totalReviews = 0
  for (const company of createdCompanies) {
    const numReviews = Math.floor(Math.random() * 8) + 5
    const usedReviewers = new Set<string>()

    for (let i = 0; i < numReviews; i++) {
      const availableReviewers = reviewers.filter(r => !usedReviewers.has(r.id))
      if (availableReviewers.length === 0) break
      const reviewer = availableReviewers[Math.floor(Math.random() * availableReviewers.length)]
      usedReviewers.add(reviewer.id)
      const template = REVIEW_TEMPLATES[Math.floor(Math.random() * REVIEW_TEMPLATES.length)]
      const daysAgo = Math.floor(Math.random() * 180)
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

      await prisma.review.create({
        data: { companyId: company.id, userId: reviewer.id, rating: template.rating, body: template.body, isVerified: template.isVerified, verifiedAt: template.isVerified ? createdAt : null, proofType: template.proofType || undefined, status: 'APPROVED', createdAt },
      })
      totalReviews++
    }

    const result = await prisma.review.aggregate({ where: { companyId: company.id, status: 'APPROVED' }, _avg: { rating: true }, _count: { id: true } })
    const verifiedCount = await prisma.review.count({ where: { companyId: company.id, status: 'APPROVED', isVerified: true } })

    await prisma.company.update({
      where: { id: company.id },
      data: { ratingAvg: Math.round((result._avg.rating || 0) * 10) / 10, reviewCount: result._count.id, verifiedReviewCount: verifiedCount },
    })
  }
  console.log(`   ✅ ${totalReviews} reseñas creadas\n`)

  console.log('💎 Activando plan Pro en empresas de demo...')
  const demoCompanies = createdCompanies.slice(0, 3)
  for (const company of demoCompanies) {
    await prisma.company.update({ where: { id: company.id }, data: { plan: 'PROFESSIONAL', isVerified: true, verifiedAt: new Date() } })
    const periodEnd = new Date(); periodEnd.setMonth(periodEnd.getMonth() + 1)
    await prisma.subscription.upsert({
      where: { companyId: company.id }, update: {},
      create: { companyId: company.id, plan: 'PROFESSIONAL', provider: 'STRIPE', providerSubId: `demo_sub_${company.id.substring(0, 8)}`, status: 'ACTIVE', amountUsd: 29, currentPeriodEnd: periodEnd },
    })
  }
  console.log(`   ✅ ${demoCompanies.length} empresas con plan Pro demo\n`)

  console.log('🏅 Otorgando medallas iniciales...')
  const year = new Date().getFullYear()
  for (const company of demoCompanies) {
    await prisma.medal.createMany({
      data: [{ companyId: company.id, type: 'TOP_CATEGORY', year, visible: true }, { companyId: company.id, type: 'HIGHLY_RECOMMENDED', year, visible: true }],
      skipDuplicates: true,
    })
  }
  console.log(`   ✅ Medallas otorgadas\n`)

  const stats = await Promise.all([prisma.category.count(), prisma.company.count(), prisma.review.count(), prisma.user.count()])
  console.log('─'.repeat(50))
  console.log('✅ Seed completado exitosamente\n')
  console.log(`📊 Resumen:`)
  console.log(`   Categorías:  ${stats[0]}`)
  console.log(`   Empresas:    ${stats[1]}`)
  console.log(`   Reseñas:     ${stats[2]}`)
  console.log(`   Usuarios:    ${stats[3]}`)
  console.log('\n🔐 Credenciales de acceso:')
  console.log('   Admin:    admin@tratto.lat / admin123456')
  console.log('   Reviewer: reviewer1@example.com / reviewer123')
  console.log('─'.repeat(50))
}

main().catch(console.error).finally(() => prisma.$disconnect())
