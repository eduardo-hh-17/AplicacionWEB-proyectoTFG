import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { nombre, apellido, telefono, rol, turno_inicio, turno_cierre, fecha_inicio, email, password } = await request.json()

    // Cliente con service_role — solo existe en el servidor
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Crea el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 2. Inserta en la tabla empleados con el mismo id
    const { error: dbError } = await supabaseAdmin
      .from('empleados')
      .insert([{
        id: authData.user.id,
        nombre,
        apellido,
        telefono: telefono || null,
        rol,
        turno_inicio: turno_inicio || null,
        turno_cierre: turno_cierre || null,
        fecha_inicio: fecha_inicio || null,
        activo: true,
        created_at: new Date().toISOString()
      }])

    if (dbError) {
      // Si falla la BD, borra el usuario de Auth para no dejar basura
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}