import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { nombre, apellido, telefono, rol, fecha_inicio, email, password, foto_url } = await request.json()

    if (!nombre || !email || !password || !rol) {
      return NextResponse.json({ error: 'Nombre, email, contraseña y rol son obligatorios' }, { status: 400 })
    }

    // Validar rol permitido
    const rolesPermitidos = ['admin', 'camarero', 'cocinero', 'gerente']
    if (!rolesPermitidos.includes(rol)) {
      return NextResponse.json({ error: 'Rol no válido' }, { status: 400 })
    }

    // Validar longitud mínima contraseña
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verificar que el llamante es un admin autenticado
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }
    const { data: caller } = await supabaseAdmin.from('empleados').select('rol, activo').eq('id', user.id).single()
    if (!caller || caller.rol !== 'admin' || !caller.activo) {
      return NextResponse.json({ error: 'Solo los administradores pueden crear empleados' }, { status: 403 })
    }

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
