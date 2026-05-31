'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEmpleado } from '@/hooks/useEmpleado'

/* ── Decoraciones palmeras (igual que cliente) ── */
function PalmTopRightAdmin() {
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M170 0 C155 25,130 35,100 40 C120 45,145 55,155 80" stroke="rgba(45,138,68,0.22)" strokeWidth="3" fill="none"/>
      <path d="M180 10 C155 35,110 42,80 55 C105 52,140 62,148 90" stroke="rgba(45,138,68,0.18)" strokeWidth="2.5" fill="none"/>
      <path d="M165 5 C158 30,148 50,128 70" stroke="rgba(45,138,68,0.15)" strokeWidth="2" fill="none"/>
      <ellipse cx="152" cy="32" rx="18" ry="8" fill="rgba(45,138,68,0.14)" transform="rotate(-30 152 32)"/>
      <ellipse cx="136" cy="48" rx="16" ry="7" fill="rgba(45,138,68,0.12)" transform="rotate(-50 136 48)"/>
      <ellipse cx="118" cy="62" rx="14" ry="6" fill="rgba(45,138,68,0.10)" transform="rotate(-70 118 62)"/>
    </svg>
  )
}

function PalmBottomLeftAdmin() {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 160 C20 135,40 120,60 110 C38 120,18 132,12 108" stroke="rgba(45,138,68,0.22)" strokeWidth="3" fill="none"/>
      <path d="M5 155 C30 128,60 112,90 105 C65 118,35 130,30 105" stroke="rgba(45,138,68,0.16)" strokeWidth="2.5" fill="none"/>
      <ellipse cx="28" cy="128" rx="16" ry="7" fill="rgba(45,138,68,0.14)" transform="rotate(30 28 128)"/>
      <ellipse cx="50" cy="112" rx="14" ry="6" fill="rgba(45,138,68,0.11)" transform="rotate(50 50 112)"/>
    </svg>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { empleado, cargando } = useEmpleado()

  const menuItems = () => {
    if (!empleado) return []
    const items: { href: string; label: string; icon: string }[] = []
    if (empleado.rol === 'admin') {
      items.push({ href: '/dashboard', label: 'Dashboard',  icon: '📊' })
      items.push({ href: '/pedidos',   label: 'Pedidos',    icon: '🧾' })
      items.push({ href: '/menu',      label: 'Menú',       icon: '🍽️' })
      items.push({ href: '/cocina',    label: 'Cocina',     icon: '👨‍🍳' })
      items.push({ href: '/qr',        label: 'QR Mesas',   icon: '📷' })
    }
    if (empleado.rol === 'camarero') {
      items.push({ href: '/pedidos', label: 'Pedidos', icon: '🧾' })
    }
    if (empleado.rol === 'cocinero') {
      items.push({ href: '/cocina', label: 'Cocina', icon: '👨‍🍳' })
    }
    return items
  }

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

  if (cargando) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #08142a 0%, #0d2040 50%, #08142a 100%)' }}
      >
        <div className="flex flex-col items-center gap-3 animate-pulse-soft">
          <span className="text-3xl">🍽️</span>
          <p className="text-slate-400 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  const handleLogout = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const hoy   = new Date().toISOString().split('T')[0]
      const ahora = new Date().toISOString()
      const { data: emp } = await supabase.from('empleados').select('id').eq('email', user.email).single()
      if (emp) {
        await supabase.from('fichajes').update({ salida: ahora }).eq('empleado_id', emp.id).eq('fecha', hoy).is('salida', null)
      }
    }
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const items = menuItems()

  return (
    /* h-screen + overflow-hidden: igual que el cliente — solo el <main> hace scroll */
    <div
      className="admin-theme h-screen overflow-hidden flex flex-col relative"
      style={{
        background:
          'radial-gradient(ellipse at 85% 10%, rgba(30,92,46,0.18) 0%, transparent 45%),' +
          'radial-gradient(ellipse at 10% 90%, rgba(13,31,60,0.35) 0%, transparent 45%),' +
          'radial-gradient(ellipse at 92% 88%, rgba(37,99,235,0.10) 0%, transparent 40%),' +
          'linear-gradient(160deg, #08142a 0%, #0d2040 50%, #08142a 100%)',
      }}
    >
      {/* Palmeras fijas en esquinas (siempre visibles) */}
      <div className="fixed top-0 right-0 z-0 palm-enter palm-sway pointer-events-none" style={{ opacity: 0.55 }}>
        <PalmTopRightAdmin />
      </div>
      <div className="fixed bottom-0 left-0 z-0 palm-enter palm-sway-left pointer-events-none" style={{ opacity: 0.45, animationDelay: '0.5s' }}>
        <PalmBottomLeftAdmin />
      </div>

      {/* ── NAVBAR — shrink-0: siempre visible, no participa en el scroll ── */}
      <nav
        className="shrink-0 z-20 h-14 flex items-center justify-between px-6 animate-slide-up"
        style={{
          background: 'rgba(8,20,42,0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 2px 20px rgba(0,0,0,0.40)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow"
            style={{ background: 'linear-gradient(135deg, #1e5c2e, #2d8a44)' }}
          >
            🍽️
          </div>
          <span className="text-white text-sm font-semibold tracking-tight">
            Lempira
            <span className="font-normal text-slate-400 ml-2">
              — {empleado?.nombre}
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full capitalize"
                style={{ background: 'rgba(45,138,68,0.2)', color: '#6ee7a0' }}>
                {empleado?.rol}
              </span>
            </span>
          </span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {items.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: active ? 'rgba(45,138,68,0.18)' : 'transparent',
                  color:      active ? '#fff'      : 'rgba(255,255,255,0.55)',
                  borderBottom: active ? '2px solid rgba(212,160,64,0.7)' : '2px solid transparent',
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}

          <button
            onClick={handleLogout}
            className="ml-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
            style={{
              background: 'rgba(239,68,68,0.15)',
              color: '#fca5a5',
              border: '1px solid rgba(239,68,68,0.25)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)' }}
          >
            ✕ Cerrar sesión
          </button>
        </div>
      </nav>

      {/* ── CONTENIDO — flex-1 + overflow-y-auto: solo aquí hace scroll ── */}
      <main className="flex-1 overflow-y-auto relative z-10 p-6 animate-fade-in">
        {children}
      </main>
    </div>
  )
}
