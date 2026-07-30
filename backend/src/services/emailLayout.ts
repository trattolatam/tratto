/**
 * Plantilla base para TODOS los emails de Tratto. Cada email arma solo su
 * contenido interno (bodyHtml) y le pide a esta función que lo envuelva con
 * el encabezado, el fondo y el pie de página estándar — así el diseño queda
 * consistente en todos los correos, y un cambio de marca (logo, colores) se
 * hace en un solo lugar en vez de en cada template por separado.
 *
 * Diseño: fondo exterior claro, cuerpo blanco con bordes redondeados,
 * encabezado azul oscuro con el isotipo (círculo verde + "T") y "Tratto"
 * alineados a la izquierda, botones CTA en verde cuando corresponde.
 */
export function buildEmailShell(bodyHtml: string): string {
  const frontendUrl = process.env.FRONTEND_URL || 'https://tratto.lat'

  return `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#0f172a;padding:20px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="width:32px;height:32px;border-radius:9999px;background-color:#10b981;text-align:center;">
                  <span style="color:#ffffff;font-size:16px;font-weight:700;line-height:32px;">T</span>
                </td>
                <td style="padding-left:10px;"><span style="color:#ffffff;font-size:20px;font-weight:700;">Tratto</span></td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr><td style="padding:20px 32px;background-color:#f9fafb;text-align:center;"><a href="${frontendUrl}" style="color:#9ca3af;font-size:12px;text-decoration:none;">tratto.lat</a></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Botón de acción principal — siempre verde, mismo estilo en todos los emails. */
export function emailButton(url: string, label: string): string {
  return `<table role="presentation" width="100%"><tr><td align="center">
    <a href="${url}" style="display:inline-block;background-color:#10b981;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:999px;">${label}</a>
  </td></tr></table>`
}
