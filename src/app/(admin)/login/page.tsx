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
    <div className="min-h-screen bg-[#0d1f3c] flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 w-96 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-2xl mx-auto mb-4">
            🍽️
          </div>
          <h1 className="text-white text-xl font-medium">Restaurante Lempira</h1>
          <p className="text-slate-400 text-sm mt-1">Panel de administración</p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-white text-sm font-medium block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="empleado@restaurante.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <div>
            <label className="text-white text-sm font-medium block mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && iniciarSesion()}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-500 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={iniciarSesion}
            disabled={cargando}
            className="w-full bg-[#0d1f3c] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#1e3a6e] transition-colors mt-2 disabled:opacity-50"
          >
            {cargando ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}