import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarAutorespuestaContacto } from '@/lib/email'

// Service role para insertar aunque RLS esté activo
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, email, asunto, mensaje } = body

    if (!nombre || !email || !mensaje) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    // 1. Guardar en Supabase
    const { error: dbError } = await supabaseAdmin
      .from('mensajes_contacto')
      .insert([{ nombre, email, asunto: asunto ?? null, mensaje }])

    if (dbError) {
      console.error('[api/email/contacto] Error Supabase:', dbError)
      return NextResponse.json({ error: 'Error al guardar el mensaje' }, { status: 500 })
    }

    // 2. Enviar autorespuesta al cliente (no crítico — si falla no bloqueamos)
    await enviarAutorespuestaContacto({ nombre, email, asunto, mensaje }).catch(e =>
      console.error('[api/email/contacto] Error autorespuesta:', e)
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/email/contacto]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
