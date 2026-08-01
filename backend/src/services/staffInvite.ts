import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { buildEmailShell, emailButton } from './emailLayout'
import { sendEmail } from './notifications'

const INVITE_VALID_HOURS = 7 * 24 // 7 días

/**
 * Genera el token de activación y manda el email con el link para que la
 * persona elija su propia contraseña. Mismo patrón que sendPasswordResetEmail,
 * pero para cuentas de staff creadas de entrada por un administrador (todavía
 * sin contraseña utilizable).
 */
export async function sendStaffInviteEmail(userId: string, email: string, name: string, roleLabel: string): Promise<void> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + INVITE_VALID_HOURS * 60 * 60 * 1000)

  await prisma.user.update({
    where: { id: userId },
    data: { staffInviteToken: token, staffInviteExpiresAt: expiresAt },
  })

  const activateUrl = `${process.env.FRONTEND_URL}/activar-colaborador?token=${token}`
  const html = buildEmailShell(`
    <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#1f2937;">Hola ${name},</p>
    <p style="margin:0 0 24px 0;font-size:14px;line-height:1.5;color:#4b5563;">Te sumaron como <strong>${roleLabel}</strong> al panel de administración de Tratto. Activá tu cuenta eligiendo una contraseña para empezar a usarla.</p>
    ${emailButton(activateUrl, 'Activar mi cuenta')}
    <p style="margin:20px 0 0 0;text-align:center;font-size:12px;color:#9ca3af;">Este link expira en 7 días. Si no esperabas esta invitación, podés ignorar este email.</p>
  `)

  await sendEmail(email, `Te invitaron a Tratto como ${roleLabel}`, `Activá tu cuenta acá: ${activateUrl}`, html)
}

/**
 * Consume el token de invitación, setea la contraseña elegida y marca la
 * cuenta como activada. Devuelve el usuario para poder loguearlo de una.
 */
export async function activateStaffAccount(token: string, password: string) {
  const user = await prisma.user.findFirst({ where: { staffInviteToken: token } })

  if (!user) {
    return { success: false as const, message: 'Link de invitación inválido' }
  }
  if (user.staffInviteExpiresAt && user.staffInviteExpiresAt < new Date()) {
    return { success: false as const, message: 'El link de invitación expiró. Pedile a un administrador que te reenvíe la invitación.' }
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, staffInviteToken: null, staffInviteExpiresAt: null, staffActivatedAt: new Date() },
  })

  return { success: true as const, message: 'Cuenta activada', user: updated }
}
