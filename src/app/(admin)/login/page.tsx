'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const iniciarSesion = async () => {
    setCargando(true)
    setError('')

    // 1. Autenticar en Supabase
    const { error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    })
    
    if (authError) {
      setError('Email o contraseña incorrectos')
      setCargando(false)
      return
    }

    // 2. Obtener el empleado por email para saber su rol
    const { data: empleado, error: empError } = await supabase
      .from('empleados')
      .select('id, rol')
      .eq('email', email)
      .single()

    if (empError || !empleado) {
      console.error('Empleado no encontrado:', empError)
      setError('Usuario no autorizado como empleado')
      await supabase.auth.signOut()
      setCargando(false)
      return
    }

    // 3. Registrar entrada en fichajes
    const ahora = new Date()
    const fechaActual = ahora.toISOString().split('T')[0]
    const timestamp = ahora.toISOString()

    const { error: fichajeError } = await supabase
      .from('fichajes')
      .insert({
        empleado_id: empleado.id,
        fecha: fechaActual,
        entrada: timestamp
      })

    if (fichajeError) {
      console.error('Error al registrar entrada:', fichajeError)
    }

    // 4. Redirigir según el rol
    if (empleado.rol === 'admin') {
      window.location.href = '/dashboard'
    } else if (empleado.rol === 'cocinero') {
      window.location.href = '/cocina'
    } else if (empleado.rol === 'camarero') {
      window.location.href = '/pedidos'
    } else {
      window.location.href = '/dashboard'
    }

    setCargando(false)
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0d1f3c] flex-col items-center justify-center relative overflow-hidden">
        {/* Degradado decorativo */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1f3c] via-[#112a50] to-[#0a1628]" />
        {/* Aquí podrás añadir tu imagen más adelante */}
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

      {/* ── Panel derecho (formulario) ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Inicia sesión</h2>
          <p className="text-gray-500 text-sm mb-8">
            Accede a tu cuenta para continuar en el panel.
          </p>

          <div className="flex flex-col gap-5">

            {/* Email */}
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

            {/* Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-gray-700 text-sm font-medium">Contraseña</label>
              </div>
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

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              onClick={iniciarSesion}
              disabled={cargando}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1a56db, #1e40af)', boxShadow: '0 4px 14px rgba(26,86,219,0.35)' }}
            >
              {cargando ? 'Entrando…' : 'Iniciar sesión'}
            </button>

          </div>
        </div>
      </div>

    </div>
  )
}