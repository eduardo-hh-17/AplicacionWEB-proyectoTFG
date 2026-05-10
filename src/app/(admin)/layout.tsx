'use client'
import React from 'react'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) 

{

  const router = useRouter()

const cerrarSesion = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}
  return (
    <div className="min-h-screen bg-slate-100">
      
      {/* Navbar del admin */}
      <nav className="h-14 bg-[#0d1f3c] flex items-center px-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-sm">
            🍽️
          </div>
          <span className="text-white text-sm font-medium">Restaurante Lempira — Admin</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="/dashboard" className="text-slate-300 hover:text-white text-sm transition-colors">Dashboard</a>
          <a href="/pedidos" className="text-slate-300 hover:text-white text-sm transition-colors">Pedidos</a>
          <a href="/menu" className="text-slate-300 hover:text-white text-sm transition-colors">Menú</a>
          <a href="/cocina" className="text-slate-300 hover:text-white text-sm transition-colors">Cocina</a>
          <button
            onClick={cerrarSesion}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Contenido de cada página */}
      <main className="p-8">
        {children}
      </main>

    </div>
  )
}