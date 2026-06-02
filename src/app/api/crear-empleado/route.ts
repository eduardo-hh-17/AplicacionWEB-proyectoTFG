import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { nombre, apellido, telefono, rol, fecha_inicio, email, password, foto_url } = await request.json()

    if (!nombre || !email || !password || !rol) {
      return NextResponse.json({ error: 'Nombre, email, contraseña y rol son obligatorios' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Crear usuario en Auth con copia informativa en user_metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        apellido,
        rol,
        display_name: `${nombre}${apellido ? ' ' + apellido : ''}`,
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 2. Insertar en empleados con el mismo id que Auth
    const { error: dbError } = await supabaseAdmin
      .from('empleados')
      .insert([{
        id:           authData.user.id,
        nombre,
        apellido:     apellido     || null,
        telefono:     telefono     || null,
        rol,
        email,                            // sincronizado con Auth
        foto_url:     foto_url     || null,
        fecha_inicio: fecha_inicio || null,
        activo:       true,
        created_at:   new Date().toISOString(),
      }])

    if (dbError) {
      // Revertir: si la BD falla, eliminar el usuario de Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
