import crypto from 'crypto'
import { prisma } from '../index'

/**
 * Genera un token de verificación y lo envía por email.
 * Se llama justo después de crear un usuario nuevo.
 */
export async function sendVerificationEmail(userId: string, email: string, name: string): Promise<void> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24hs de validez

  // Guardar el token (requiere agregar estos campos al modelo User en schema.prisma):
  // emailVerificationToken String?
  // emailVerificationExpiresAt DateTime?
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationToken: token,
      emailVerificationExpiresAt: expiresAt,
    },
  })

  const verifyUrl = `${process.env.FRONTEND_URL}/verificar-email?token=${token}`

  if (!process.env.RESEND_API_KEY) {
    console.log(`⚠️  RESEND_API_KEY no configurada. Link de verificación: ${verifyUrl}`)
    return
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Tratto <${process.env.FROM_EMAIL || 'noreply@tratto.lat'}>`,
        to: [email],
        subject: 'Confirmá tu cuenta en Tratto',
        text: `Hola ${name},\n\nConfirmá tu cuenta en Tratto haciendo click en este link:\n${verifyUrl}\n\nEste link expira en 24 horas.\n\nSi no creaste esta cuenta, podés ignorar este email.`,
      }),
    })

    if (!response.ok) {
      console.error('Error enviando email de verificación:', await response.text())
    }
  } catch (err) {
    console.error('Error enviando email de verificación:', err)
  }
}

/**
 * Verifica el token y marca al usuario como verificado.
 */
export async function verifyEmailToken(token: string): Promise<{ success: boolean; message: string }> {
  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: token },
  })

  if (!user) {
    return { success: false, message: 'Link de verificación inválido' }
  }

  if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
    return { success: false, message: 'El link de verificación expiró. Solicitá uno nuevo.' }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  })

  return { success: true, message: 'Email confirmado correctamente' }
}

/**
 * Reenvía el email de verificación (con su propio rate limit en la ruta).
 */
export async function resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    // No revelamos si el email existe o no, por seguridad
    return { success: true, message: 'Si el email existe, te enviamos un nuevo link de verificación' }
  }

  if (user.isVerified) {
    return { success: false, message: 'Esta cuenta ya está verificada' }
  }

  await sendVerificationEmail(user.id, user.email, user.name)
  return { success: true, message: 'Te enviamos un nuevo link de verificación' }
}
