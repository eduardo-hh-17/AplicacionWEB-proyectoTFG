'use client'

import React, { useEffect } from 'react'  // ← añade useEffect aquí
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEmpleado } from '@/hooks/useEmpleado'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { empleado, cargando } = useEmpleado()

  const menuItems = () => {
    if (!empleado) return []
    const items: { href: string; label: string }[] = []
    if (empleado.rol === 'admin') {
      items.push({ href: '/dashboard', label: 'Dashboard' })
      items.push({ href: '/pedidos', label: 'Pedidos' })
      items.push({ href: '/menu', label: 'Menú' })
      items.push({ href: '/cocina', label: 'Cocina' })
      items.push({ href: '/qr', label: 'QR Mesas' })
    }
    if (empleado.rol === 'camarero') {
      items.push({ href: '/pedidos', label: 'Pedidos' })
    }
    if (empleado.rol === 'cocinero') {
      items.push({ href: '/cocina', label: 'Cocina' })
    }
    return items
  }

  // ← useEffect ANTES de cualquier return condicional
  useEffect(() => {
    if (cargando) return
    if (!empleado) {
      router.replace('/login')
      return
    }
    const rutasPermitidas = menuItems().map(i => i.href)
    if (!rutasPermitidas.includes(pathname)) {
      router.replace(menuItems()[0]?.href || '/login')
    }
  }, [cargando, empleado, pathname])

  // Returns condicionales DESPUÉS de los hooks
  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Cargando...</p>
      </div>
    )
  }

  // handleLogout aquí también, antes del return principal
  const handleLogout = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const hoy = new Date().toISOString().split('T')[0]
      const ahora = new Date().toISOString()

      // Buscar el empleado por email
      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('email', user.email)
        .single()

      if (empleado) {
        // Registrar salida
        await supabase
          .from('fichajes')
          .update({ salida: ahora })
          .eq('empleado_id', empleado.id)
          .eq('fecha', hoy)
          .is('salida', null)
      }
    }

    await supabase.auth.signOut()
    window.location.href = '/login'
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