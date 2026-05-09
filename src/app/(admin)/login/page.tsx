'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Login() {

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const iniciarSesion = async () => {
    setCargando(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Email o contraseña incorrectos')
      setCargando(false)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-[#0d1f3c] flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 w-96 shadow-2xl">

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-2xl mx-auto mb-4">
            🍽️
          </div>
          <h1 className="text-[#0d1f3c] text-xl font-medium">Restaurante Lempira</h1>
          <p className="text-slate-400 text-sm mt-1">Panel de administración</p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[#0d1f3c] text-sm font-medium block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="empleado@restaurante.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <div>
            <label className="text-[#0d1f3c] text-sm font-medium block mb-1">Contraseña</label>
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