'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'

type Vista = 'login' | 'solicitar' | 'verificar' | 'nueva'

export default function Login() {
  const [vista, setVista] = useState<Vista>('login')

  // ── Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  // ── Recuperación
  const [emailRecuperacion, setEmailRecuperacion] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [mensajeOk, setMensajeOk] = useState('')

  // ─────────────────────────────────────────────
  const iniciarSesion = async () => {
    setCargando(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email o contraseña incorrectos')
      setCargando(false)
      return
    }

    const { data: empleado, error: empError } = await supabase
      .from('empleados')
      .select('id, rol, activo')
      .eq('email', email)
      .single()

    if (empError || !empleado) {
      setError('Usuario no autorizado como empleado')
      await supabase.auth.signOut()
      setCargando(false)
      return
    }

    if (!empleado.activo) {
      setError('Tu cuenta está dada de baja. Contacta con el administrador.')
      await supabase.auth.signOut()
      setCargando(false)
      return
    }

    const ahora = new Date()
    await supabase.from('fichajes').insert({
      empleado_id: empleado.id,
      fecha: ahora.toISOString().split('T')[0],
      entrada: ahora.toISOString()
    })

    if (empleado.rol === 'cocinero') window.location.href = '/cocina'
    else if (empleado.rol === 'camarero') window.location.href = '/pedidos'
    else window.location.href = '/dashboard'

    setCargando(false)
  }

  // ─────────────────────────────────────────────
  const solicitarCodigo = async () => {
    if (!emailRecuperacion.trim()) {
      setError('Introduce tu correo electrónico')
      return
    }
    setCargando(true)
    setError('')

    const res = await fetch('/api/recuperar-password/solicitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailRecuperacion })
    })

    setCargando(false)

    if (res.ok) {
      setMensajeOk('Si el correo está registrado, recibirás el código en breve.')
      setVista('verificar')
    } else {
      setError('Error al enviar el código. Inténtalo de nuevo.')
    }
  }

  // ─────────────────────────────────────────────
  const verificarCodigo = async () => {
    if (!codigo.trim() || !nuevaPassword || !confirmarPassword) {
      setError('Rellena todos los campos')
      return
    }
    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (nuevaPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setCargando(true)
    setError('')

    const res = await fetch('/api/recuperar-password/verificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailRecuperacion, codigo, nuevaPassword })
    })

    const json = await res.json()
    setCargando(false)

    if (res.ok) {
      setMensajeOk('Contraseña cambiada con éxito. Ya puedes iniciar sesión.')
      setVista('login')
      setEmail(emailRecuperacion)
      setEmailRecuperacion('')
      setCodigo('')
      setNuevaPassword('')
      setConfirmarPassword('')
    } else {
      setError(json.error ?? 'Código inválido o caducado')
    }
  }

  // ─────────────────────────────────────────────
  const volverAlLogin = () => {
    setVista('login')
    setError('')
    setMensajeOk('')
    setEmailRecuperacion('')
    setCodigo('')
    setNuevaPassword('')
    setConfirmarPassword('')
  }

  // ═══════════════════════════════════════════════
  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0d1f3c] flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1f3c] via-[#112a50] to-[#0a1628]" />
        <div className="relative z-10 text-center px-12">
          <p className="text-blue-300 text-sm font-medium tracking-widest uppercase mb-3">
            Panel de administración
          </p>
          <h1 className="text-white text-4xl font-bold leading-tight">
            Restaurante<br />Lempira
          </h1>
          <div className="mt-8 w-16 h-1 bg-blue-500 mx-auto rounded-full" />
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">

          {/* ───── VISTA LOGIN ───── */}
          {vista === 'login' && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Inicia sesión</h2>
              <p className="text-gray-500 text-sm mb-8">
                Accede a tu cuenta para continuar en el panel.
              </p>

              <div className="flex flex-col gap-5">
                <div>
                  <label className="text-gray-700 text-sm font-medium block mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">✉</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ej. empleado@restaurante.com"
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-700 text-sm font-medium block mb-1.5">Contraseña</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔒</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña"
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && iniciarSesion()}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setVista('solicitar'); setError(''); setMensajeOk('') }}
                  className="text-blue-600 text-sm text-right hover:underline -mt-2"
                >
                  ¿Olvidaste tu contraseña?
                </button>

                {mensajeOk && (
                  <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
                    {mensajeOk}
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                    {error}
                  </div>
                )}

                <button
                  onClick={iniciarSesion}
                  disabled={cargando}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #1a56db, #1e40af)', boxShadow: '0 4px 14px rgba(26,86,219,0.35)' }}
                >
                  {cargando ? 'Entrando…' : 'Iniciar sesión'}
                </button>
              </div>
            </>
          )}

          {/* ───── VISTA SOLICITAR CÓDIGO ───── */}
          {vista === 'solicitar' && (
            <>
              <button onClick={volverAlLogin} className="text-gray-400 text-sm flex items-center gap-1 mb-6 hover:text-gray-600">
                ← Volver al login
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Recuperar contraseña</h2>
              <p className="text-gray-500 text-sm mb-8">
                Introduce tu correo y te enviaremos un código de 6 dígitos.
              </p>

              <div className="flex flex-col gap-5">
                <div>
                  <label className="text-gray-700 text-sm font-medium block mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">✉</span>
                    <input
                      type="email"
                      value={emailRecuperacion}
                      onChange={(e) => setEmailRecuperacion(e.target.value)}
                      placeholder="Tu correo registrado"
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && solicitarCodigo()}
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                    {error}
                  </div>
                )}

                <button
                  onClick={solicitarCodigo}
                  disabled={cargando}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #1a56db, #1e40af)', boxShadow: '0 4px 14px rgba(26,86,219,0.35)' }}
                >
                  {cargando ? 'Enviando…' : 'Enviar código'}
                </button>
              </div>
            </>
          )}

          {/* ───── VISTA VERIFICAR CÓDIGO + NUEVA CONTRASEÑA ───── */}
          {vista === 'verificar' && (
            <>
              <button onClick={volverAlLogin} className="text-gray-400 text-sm flex items-center gap-1 mb-6 hover:text-gray-600">
                ← Volver al login
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Introduce el código</h2>
              <p className="text-gray-500 text-sm mb-8">
                Revisa tu correo y escribe el código de 6 dígitos recibido.
              </p>

              {mensajeOk && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-5">
                  {mensajeOk}
                </div>
              )}

              <div className="flex flex-col gap-5">
                <div>
                  <label className="text-gray-700 text-sm font-medium block mb-1.5">
                    Código de verificación
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold text-center tracking-widest text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label className="text-gray-700 text-sm font-medium block mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔒</span>
                    <input
                      type="password"
                      value={nuevaPassword}
                      onChange={(e) => setNuevaPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-700 text-sm font-medium block mb-1.5">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔒</span>
                    <input
                      type="password"
                      value={confirmarPassword}
                      onChange={(e) => setConfirmarPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && verificarCodigo()}
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                    {error}
                  </div>
                )}

                <button
                  onClick={verificarCodigo}
                  disabled={cargando}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #1a56db, #1e40af)', boxShadow: '0 4px 14px rgba(26,86,219,0.35)' }}
                >
                  {cargando ? 'Verificando…' : 'Cambiar contraseña'}
                </button>

                <button
                  type="button"
                  onClick={() => { setVista('solicitar'); setError(''); setMensajeOk('') }}
                  className="text-blue-600 text-sm text-center hover:underline"
                >
                  No recibí el código, reenviar
                </button>
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  )
}
