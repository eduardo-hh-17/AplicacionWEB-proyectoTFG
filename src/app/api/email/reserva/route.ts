import { NextRequest, NextResponse } from 'next/server'
import { enviarConfirmacionReserva } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { nombre, apellido, email, fecha, hora, personas, tipo_evento } = body

    if (!email || !nombre || !fecha || !hora || !personas) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    const resultado = await enviarConfirmacionReserva({
      nombre,
      apellido: apellido ?? '',
      email,
      fecha,
      hora,
      personas: Number(personas),
      tipo_evento: tipo_evento ?? 'standard',
    })

    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/email/reserva]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
