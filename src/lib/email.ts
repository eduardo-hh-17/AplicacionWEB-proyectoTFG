import { Resend } from 'resend'

// Lazy: se instancia solo al enviar, nunca en tiempo de build
function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? '')
}

function getFrom() {
  return process.env.RESEND_FROM_EMAIL ?? 'Restaurante Lempira <onboarding@resend.dev>'
}

/* ─── Plantilla base compartida ─────────────────────────────────────────── */
function wrapEmail(contenido: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Restaurante Lempira</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

        <!-- CABECERA -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a2010 0%,#1a4a2e 50%,#0a2010 100%);padding:32px 40px;text-align:center;">
            <div style="display:inline-block;width:56px;height:56px;background:linear-gradient(135deg,#d4a040,#c47a28);border-radius:14px;line-height:56px;font-size:28px;margin-bottom:12px;">🍽️</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Restaurante Lempira</h1>
            <p style="margin:4px 0 0;color:#9adab4;font-size:13px;letter-spacing:1px;text-transform:uppercase;">San Pedro Sula, Honduras</p>
          </td>
        </tr>

        <!-- CONTENIDO -->
        <tr>
          <td style="padding:36px 40px;">
            ${contenido}
          </td>
        </tr>

        <!-- PIE -->
        <tr>
          <td style="background:#f8faf8;border-top:1px solid #e8f0e8;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 6px;color:#888;font-size:12px;">
              ⚠️ Este correo es solo informativo — por favor, no respondas a este mensaje.
            </p>
            <p style="margin:0;color:#aaa;font-size:11px;">
              © ${new Date().getFullYear()} Restaurante Lempira · San Pedro Sula, Honduras
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/* ─── Email 1: Confirmación de reserva ──────────────────────────────────── */
export async function enviarConfirmacionReserva(reserva: {
  nombre: string
  apellido: string
  email: string
  fecha: string       // 'YYYY-MM-DD'
  hora: string        // 'HH:MM'
  personas: number
  tipo_evento: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY no configurada — email omitido')
    return { ok: false, error: 'No API key' }
  }

  const fechaFormateada = new Date(reserva.fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const tipoLabel: Record<string, string> = {
    standard:   'Reserva estándar',
    cumpleanos: 'Cumpleaños',
    pedida:     'Pedida de mano',
    evento:     'Evento especial',
    empresa:    'Empresa / grupo',
  }

  const contenido = `
    <h2 style="margin:0 0 8px;color:#0a2010;font-size:20px;font-weight:700;">
      ✅ Reserva confirmada
    </h2>
    <p style="margin:0 0 24px;color:#3d6a4a;font-size:15px;line-height:1.6;">
      Hola <strong>${reserva.nombre} ${reserva.apellido}</strong>, tu reserva en el
      <strong>Restaurante Lempira</strong> se ha realizado con éxito.
    </p>

    <!-- Tarjeta de reserva -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f0faf4;border:1px solid #c8e6d0;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:24px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;color:#5a9a6a;font-size:13px;font-weight:600;width:40%;text-transform:uppercase;letter-spacing:0.5px;">📅 Fecha</td>
              <td style="padding:6px 0;color:#0a2010;font-size:14px;font-weight:700;text-transform:capitalize;">${fechaFormateada}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#5a9a6a;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">🕐 Hora</td>
              <td style="padding:6px 0;color:#0a2010;font-size:14px;font-weight:700;">${reserva.hora} h</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#5a9a6a;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">👥 Personas</td>
              <td style="padding:6px 0;color:#0a2010;font-size:14px;font-weight:700;">${reserva.personas} persona${reserva.personas !== 1 ? 's' : ''}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#5a9a6a;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">🎉 Tipo</td>
              <td style="padding:6px 0;color:#0a2010;font-size:14px;font-weight:700;">${tipoLabel[reserva.tipo_evento] ?? reserva.tipo_evento}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Aviso retraso -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#fff8e6;border:1px solid #f0d080;border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;color:#7a5000;font-size:13px;line-height:1.6;">
            ⚠️ <strong>Importante:</strong> Si llegas con un retraso de más de
            <strong>15 minutos</strong>, no podrás acceder al establecimiento
            y la reserva quedará anulada automáticamente.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#3d6a4a;font-size:14px;line-height:1.7;">
      Gracias por confiar en nosotros. ¡Esperamos verte pronto!
    </p>
    <p style="margin:16px 0 0;color:#0a2010;font-size:14px;font-weight:600;">
      — El equipo del Restaurante Lempira
    </p>
  `

  const { error } = await getResend().emails.send({
    from: getFrom(),
    to:   reserva.email,
    subject: `✅ Reserva confirmada — ${fechaFormateada} a las ${reserva.hora}`,
    html: wrapEmail(contenido),
  })

  if (error) {
    console.error('[email] Error al enviar confirmación de reserva:', error)
    return { ok: false, error }
  }
  return { ok: true }
}

/* ─── Email 3: Código de recuperación de contraseña ────────────────────── */
export async function enviarCodigoRecuperacion(datos: {
  email: string
  codigo: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY no configurada — email omitido')
    return { ok: false, error: 'No API key' }
  }

  const contenido = `
    <h2 style="margin:0 0 8px;color:#0a2010;font-size:20px;font-weight:700;">
      🔐 Código de recuperación
    </h2>
    <p style="margin:0 0 20px;color:#3d6a4a;font-size:15px;line-height:1.6;">
      Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.
      Usa el siguiente código para continuar:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f0faf4;border:1px solid #c8e6d0;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:28px;text-align:center;">
          <p style="margin:0 0 8px;color:#5a9a6a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Tu código</p>
          <p style="margin:0;color:#0a2010;font-size:36px;font-weight:800;letter-spacing:10px;">${datos.codigo}</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#fff8e6;border:1px solid #f0d080;border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;color:#7a5000;font-size:13px;line-height:1.6;">
            ⚠️ <strong>Importante:</strong> Este código es válido durante
            <strong>10 minutos</strong>. Si no has solicitado este cambio,
            ignora este correo.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#0a2010;font-size:14px;font-weight:600;">
      — El equipo del Restaurante Lempira
    </p>
  `

  const { error } = await getResend().emails.send({
    from: getFrom(),
    to:   datos.email,
    subject: '🔐 Código de recuperación — Restaurante Lempira',
    html: wrapEmail(contenido),
  })

  if (error) {
    console.error('[email] Error al enviar código de recuperación:', error)
    return { ok: false, error }
  }
  return { ok: true }
}

/* ─── Email 2: Autorespuesta de formulario de contacto ──────────────────── */
export async function enviarAutorespuestaContacto(datos: {
  nombre: string
  email: string
  asunto?: string
  mensaje: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY no configurada — email omitido')
    return { ok: false, error: 'No API key' }
  }

  const contenido = `
    <h2 style="margin:0 0 8px;color:#0a2010;font-size:20px;font-weight:700;">
      📩 Hemos recibido tu mensaje
    </h2>
    <p style="margin:0 0 20px;color:#3d6a4a;font-size:15px;line-height:1.6;">
      Hola <strong>${datos.nombre}</strong>, gracias por contactar con el
      <strong>Restaurante Lempira</strong>.
    </p>
    <p style="margin:0 0 24px;color:#3d6a4a;font-size:15px;line-height:1.6;">
      Hemos recibido tu mensaje y en breve nos pondremos en contacto contigo.
    </p>

    <!-- Resumen del mensaje -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f0faf4;border:1px solid #c8e6d0;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 6px;color:#5a9a6a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Tu mensaje</p>
          <p style="margin:0;color:#0a2010;font-size:14px;line-height:1.6;white-space:pre-line;">${datos.mensaje.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#3d6a4a;font-size:14px;line-height:1.7;">
      Un cordial saludo,
    </p>
    <p style="margin:8px 0 0;color:#0a2010;font-size:14px;font-weight:600;">
      — El equipo del Restaurante Lempira
    </p>
  `

  const { error } = await getResend().emails.send({
    from: getFrom(),
    to:   datos.email,
    subject: '📩 Hemos recibido tu mensaje — Restaurante Lempira',
    html: wrapEmail(contenido),
  })

  if (error) {
    console.error('[email] Error al enviar autorespuesta de contacto:', error)
    return { ok: false, error }
  }
  return { ok: true }
}
