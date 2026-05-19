'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'  // ← IMPORTAR SUPABASE AQUÍ
import { useEmpleado } from '@/hooks/useEmpleado'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { empleado, cargando } = useEmpleado()
  console.log('Empleado cargado:', empleado)
  console.log('Rol:', empleado?.rol)

  // Función de cierre - AHORA supabase SÍ está definido
  const handleLogout = async () => {
    try {
      // Cerrar sesión en Supabase
      await supabase.auth.signOut()
    } catch (e) {
      console.error('Error:', e)
    }
    
    // Limpiar TODOS los datos del navegador relacionados con la sesión
    localStorage.clear()
    sessionStorage.clear()
    
    // Eliminar cookies específicas de Supabase
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.split('=')
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    })
    
    // Redirigir
    window.location.href = '/login'
  }

  const menuItems = () => {
    if (!empleado) return []
    const items: { href: string; label: string }[] = []

    if (empleado.rol === 'admin') {
      items.push({ href: '/dashboard', label: 'Dashboard' })
      items.push({ href: '/pedidos', label: 'Pedidos' })
      items.push({ href: '/menu', label: 'Menú' })
      items.push({ href: '/cocina', label: 'Cocina' })
    }
    if (empleado.rol === 'camarero') {
      items.push({ href: '/pedidos', label: 'Pedidos' })
    }
    if (empleado.rol === 'cocinero') {
      items.push({ href: '/cocina', label: 'Cocina' })
    }
    return items
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="h-14 bg-[#0d1f3c] flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-sm">
            🍽️
          </div>
          <span className="text-white text-sm font-medium">
            Restaurante Lempira — {empleado?.nombre} ({empleado?.rol})
          </span>
        </div>

        <div className="flex items-center gap-6">
          {menuItems().map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition-colors ${
                pathname === item.href
                  ? 'text-white font-medium'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>
      <main className="p-8">
        {children}
      </main>
    </div>
  )
}