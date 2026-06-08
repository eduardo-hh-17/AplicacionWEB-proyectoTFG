import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarCodigoRecuperacion } from '@/lib/email'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'El correo es obligatorio' }, { status: 400 })
    }

    // 1. Verificar que el empleado existe y está activo
    const { data: empleado } = await supabaseAdmin
      .from('empleados')
      .select('id, activo')
      .eq('email', email)
      .single()

    // Siempre respondemos OK aunque no exista, por seguridad (no revelar si el email está registrado)
    if (!empleado || !empleado.activo) {
      return NextResponse.json({ ok: true })
    }

    // 2. Generar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString()
    const expira = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutos

    // 3. Guardar código en tabla password_reset_codes
    await supabaseAdmin
      .from('password_reset_codes')
      .delete()
      .eq('email', email)

    await supabaseAdmin
      .from('password_reset_codes')
      .insert({ email, codigo, expira_en: expira })

    // 4. Enviar email con el código
    await enviarCodigoRecuperacion({ email, codigo })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/recuperar-password/solicitar]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
