import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarConfirmacionReserva } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    // ── Verificar que la petición viene de un empleado autenticado
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    // ── Verificar que el usuario es un empleado activo
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: empleado } = await supabaseAdmin
      .from('empleados')
      .select('activo')
      .eq('id', user.id)
      .single()

    if (!empleado?.activo) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // ── Procesar petición
    const body = await req.json()
    const { nombre, apellido, email, fecha, hora, personas, tipo_evento } = body

    if (!email || !nombre || !fecha || !hora || !personas) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    // Sanitizar entradas
    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const resultado = await enviarConfirmacionReserva({
      nombre:      String(nombre).slice(0, 100),
      apellido:    String(apellido ?? '').slice(0, 100),
      email:       String(email).slice(0, 200),
      fecha:       String(fecha),
      hora:        String(hora),
      personas:    Number(personas),
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
