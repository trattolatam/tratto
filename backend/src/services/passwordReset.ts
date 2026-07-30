import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { buildEmailShell, emailButton } from './emailLayout'

/**
 * Genera un token de recuperación y manda el email con el link para elegir
 * una contraseña nueva. Mismo patrón que sendVerificationEmail.
 */
export async function sendPasswordResetEmail(userId: string, email: string, name: string): Promise<void> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora de validez — más corto que el de verificación, es información sensible

  await prisma.user.update({
    where: { id: userId },
    data: { passwordResetToken: token, passwordResetExpiresAt: expiresAt },
  })

  const resetUrl = `${process.env.FRONTEND_URL}/restablecer-password?token=${token}`

  if (!process.env.RESEND_API_KEY) {
    console.log(`⚠️  RESEND_API_KEY no configurada. Link de recuperación: ${resetUrl}`)
    return
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Tratto <${process.env.FROM_EMAIL || 'noreply@tratto.lat'}>`,
        to: [email],
        subject: 'Restablecé tu contraseña de Tratto',
        text: `Hola ${name},\n\nRecibimos una solicitud para restablecer tu contraseña. Hacé click en este link para elegir una nueva:\n${resetUrl}\n\nEste link expira en 1 hora. Si no pediste esto, podés ignorar este email — tu contraseña actual sigue siendo válida.`,
        html: buildPasswordResetEmailHtml(name, resetUrl),
      }),
    })
    if (!response.ok) console.error('Error enviando email de recuperación:', await response.text())
  } catch (err) {
    console.error('Error enviando email de recuperación:', err)
  }
}

function buildPasswordResetEmailHtml(name: string, resetUrl: string): string {
  return buildEmailShell(`
    <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#1f2937;">Hola ${name},</p>
    <p style="margin:0 0 24px 0;font-size:14px;line-height:1.5;color:#4b5563;">Recibimos una solicitud para restablecer tu contraseña. Hacé click en el botón para elegir una nueva.</p>
    ${emailButton(resetUrl, 'Elegir nueva contraseña')}
    <p style="margin:20px 0 0 0;text-align:center;font-size:12px;color:#9ca3af;">Este link expira en 1 hora. Si no pediste esto, ignorá este email.</p>
  `)
}

/**
 * Inicia el flujo: busca al usuario por email y le manda el link.
 * No revela si el email existe o no (mismo criterio que resendVerificationEmail).
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  const user = await prisma.user.findUnique({ where: { email } })
  const genericMessage = 'Si el email existe en Tratto, te enviamos un link para restablecer tu contraseña'

  if (!user) return { success: true, message: genericMessage }

  await sendPasswordResetEmail(user.id, user.email, user.name)
  return { success: true, message: genericMessage }
}

/**
 * Consume el token y setea la contraseña nueva.
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const user = await prisma.user.findFirst({ where: { passwordResetToken: token } })

  if (!user) {
    return { success: false, message: 'Link de recuperación inválido' }
  }

  if (user.passwordResetExpiresAt && user.passwordResetExpiresAt < new Date()) {
    return { success: false, message: 'El link de recuperación expiró. Solicitá uno nuevo.' }
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
  })

  return { success: true, message: 'Contraseña actualizada correctamente' }
}
