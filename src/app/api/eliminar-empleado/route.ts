import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID obligatorio' }, { status: 400 })
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
      return NextResponse.json({ error: 'Solo los administradores pueden eliminar empleados' }, { status: 403 })
    }

    // Evitar que el admin se elimine a sí mismo
    if (id === user.id) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
    }

    // 1. Borrar de la tabla empleados
    const { error: dbError } = await supabaseAdmin
      .from('empleados')
      .delete()
      .eq('id', id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    // 2. Borrar de Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
