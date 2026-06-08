import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, codigo, nuevaPassword } = await req.json()

    if (!email || !codigo || !nuevaPassword) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    // 1. Buscar el código en la base de datos
    const { data: reset } = await supabaseAdmin
      .from('password_reset_codes')
      .select('*')
      .eq('email', email)
      .eq('codigo', codigo)
      .single()

    if (!reset) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    // 2. Comprobar si ha caducado
    if (new Date() > new Date(reset.expira_en)) {
      await supabaseAdmin.from('password_reset_codes').delete().eq('email', email)
      return NextResponse.json({ error: 'El código ha caducado. Solicita uno nuevo.' }, { status: 400 })
    }

    // 3. Obtener el user_id del empleado para actualizar su contraseña
    const { data: empleado } = await supabaseAdmin
      .from('empleados')
      .select('id')
      .eq('email', email)
      .single()

    if (!empleado) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // 4. Actualizar contraseña en Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      empleado.id,
      { password: nuevaPassword }
    )

    if (updateError) {
      return NextResponse.json({ error: 'Error al actualizar la contraseña' }, { status: 500 })
    }

    // 5. Borrar el código ya usado
    await supabaseAdmin.from('password_reset_codes').delete().eq('email', email)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/recuperar-password/verificar]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
