import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function generateAiSummary(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      reviews: { where: { status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 200, select: { rating: true, body: true, isVerified: true, createdAt: true } },
      category: { select: { name: true } },
    },
  })

  if (!company || company.reviews.length < 5) return

  const reviewsText = company.reviews.map(r => `[${r.rating}★${r.isVerified ? ' ✓verificada' : ''}] ${r.body}`).join('\n')

  const prompt = `Sos un analista de reseñas de clientes para Tratto, una plataforma de reseñas verificadas de LATAM.

Empresa: "${company.name}" — Categoría: ${company.category.name}
Total de reseñas analizadas: ${company.reviews.length}
Rating promedio: ${company.ratingAvg}

Reseñas:
${reviewsText}

Analizá las reseñas y respondé ÚNICAMENTE con un JSON válido con esta estructura exacta (sin texto adicional, sin markdown):
{
  "summaryText": "Una oración de 2-3 frases que resume la experiencia general de los clientes.",
  "insightBars": [
    { "label": "descripción concisa (máx 30 chars)", "percentage": número_0_a_100, "isNegative": false_o_true },
    { "label": "...", "percentage": ..., "isNegative": ... },
    { "label": "...", "percentage": ..., "isNegative": ... },
    { "label": "...", "percentage": ..., "isNegative": ... },
    { "label": "...", "percentage": ..., "isNegative": ... }
  ]
}

Reglas: exactamente 5 insights basados en lo que realmente mencionan las reseñas. Los primeros 3-4 positivos, al menos 1 negativo si existe. Labels en español, concisos.`

  const message = await anthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 500, messages: [{ role: 'user', content: prompt }] })
  const content = message.content[0]
  if (content.type !== 'text') return

  let parsed: any
  try {
    parsed = JSON.parse(content.text.replace(/```json|```/g, '').trim())
  } catch {
    console.error('Error parsing AI response:', content.text)
    return
  }

  if (!parsed.summaryText || !Array.isArray(parsed.insightBars) || parsed.insightBars.length !== 5) return

  await prisma.aiSummary.upsert({
    where: { companyId },
    create: { companyId, summaryText: parsed.summaryText, insightBars: parsed.insightBars, reviewsCount: company.reviews.length },
    update: { summaryText: parsed.summaryText, insightBars: parsed.insightBars, reviewsCount: company.reviews.length, generatedAt: new Date() },
  })

  console.log(`✅ AI summary generado para: ${company.name}`)
}

export async function runBatchAiSummaries(): Promise<void> {
  const companies = await prisma.company.findMany({
    where: { reviewCount: { gte: 10 }, OR: [{ aiSummary: null }, { aiSummary: { generatedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }] },
    select: { id: true, name: true, reviewCount: true }, take: 50,
  })

  console.log(`🤖 Generando resúmenes IA para ${companies.length} empresas...`)
  for (const company of companies) {
    try {
      await generateAiSummary(company.id)
      await new Promise(r => setTimeout(r, 500))
    } catch (err) {
      console.error(`Error en AI summary para ${company.name}:`, err)
    }
  }
  console.log('✅ Batch de resúmenes IA completado')
}

export async function generateReviewResponseSuggestion(reviewBody: string, rating: number, companyName: string, category: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 250,
    messages: [{ role: 'user', content: `Sos el dueño de "${companyName}" (${category}) en LATAM. Un cliente dejó esta reseña de ${rating} estrellas:\n\n"${reviewBody}"\n\nEscribí una respuesta profesional, breve (máx 3 oraciones) y genuina en español. Tono cálido pero profesional. Sin emojis. Respondé SOLO con el texto de la respuesta, sin comillas.` }],
  })
  const content = message.content[0]
  return content.type === 'text' ? content.text : ''
}

export async function analyzeReviewAuthenticity(reviewBody: string, userId: string, companyId: string): Promise<{ score: number; flags: string[] }> {
  const userReviews = await prisma.review.count({ where: { userId } })
  const existingReview = await prisma.review.findFirst({ where: { userId, companyId } })

  const flags: string[] = []
  let score = 100

  if (reviewBody.length < 30) { flags.push('muy_corta'); score -= 20 }
  if (userReviews === 0) { flags.push('usuario_nuevo'); score -= 10 }
  if (existingReview) { flags.push('reseña_duplicada'); score -= 50 }

  if (score < 80 || reviewBody.length < 50) {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 100,
      messages: [{ role: 'user', content: `Analizá si esta reseña parece auténtica o generada/falsa. Solo respondé con JSON: {"authentic": true/false, "reason": "una frase corta"}\n\nReseña: "${reviewBody}"` }],
    })
    const content = message.content[0]
    if (content.type === 'text') {
      try {
        const result = JSON.parse(content.text.replace(/```json|```/g, '').trim())
        if (!result.authentic) { flags.push('ia_sospechosa'); score -= 30 }
      } catch { /* ignorar */ }
    }
  }

  return { score: Math.max(0, score), flags }
}
