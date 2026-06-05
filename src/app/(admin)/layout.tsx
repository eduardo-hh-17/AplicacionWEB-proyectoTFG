'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEmpleado } from '@/hooks/useEmpleado'

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
  const [menuAbierto, setMenuAbierto] = useState(false)

  const menuItems = () => {
    if (!empleado) return []
    const items: { href: string; label: string; icon: string }[] = []
    if (empleado.rol === 'admin') {
      items.push({ href: '/dashboard', label: 'Dashboard',  icon: '📊' })
      items.push({ href: '/pedidos',   label: 'Pedidos',    icon: '🧾' })
      items.push({ href: '/menu',      label: 'Menú',       icon: '🍽️' })
      items.push({ href: '/cocina',    label: 'Cocina',     icon: '👨‍🍳' })
      items.push({ href: '/reservas',  label: 'Reservas',   icon: '📅' })
      items.push({ href: '/facturas',  label: 'Facturas',   icon: '💶' })
      items.push({ href: '/mensajes',  label: 'Mensajes',   icon: '✉️' })
      items.push({ href: '/qr',        label: 'QR Mesas',   icon: '📷' })
    }
    if (empleado.rol === 'gerente') {
      items.push({ href: '/dashboard', label: 'Dashboard',  icon: '📊' })
      items.push({ href: '/pedidos',   label: 'Pedidos',    icon: '🧾' })
      items.push({ href: '/menu',      label: 'Menú',       icon: '🍽️' })
      items.push({ href: '/cocina',    label: 'Cocina',     icon: '👨‍🍳' })
      items.push({ href: '/reservas',  label: 'Reservas',   icon: '📅' })
      items.push({ href: '/facturas',  label: 'Facturas',   icon: '💶' })
      items.push({ href: '/mensajes',  label: 'Mensajes',   icon: '✉️' })
      items.push({ href: '/qr',        label: 'QR Mesas',   icon: '📷' })
    }
    if (empleado.rol === 'camarero') {
      items.push({ href: '/pedidos',  label: 'Pedidos',  icon: '🧾' })
      items.push({ href: '/menu',     label: 'Menú',     icon: '🍽️' })
      items.push({ href: '/facturas', label: 'Facturas', icon: '💶' })
    }
    if (empleado.rol === 'cocinero') {
      items.push({ href: '/cocina', label: 'Cocina', icon: '👨‍🍳' })
      items.push({ href: '/menu',    label: 'Menú',    icon: '🍽️' })
    }
    return items
  }

  // Cerrar menú al cambiar de ruta
  useEffect(() => { setMenuAbierto(false) }, [pathname])

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

  if (pathname === '/login') return <>{children}</>

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
      {/* Palmeras decorativas */}
      <div className="fixed top-0 right-0 z-0 palm-enter palm-sway pointer-events-none" style={{ opacity: 0.55 }}>
        <PalmTopRightAdmin />
      </div>
      <div className="fixed bottom-0 left-0 z-0 palm-enter palm-sway-left pointer-events-none" style={{ opacity: 0.45, animationDelay: '0.5s' }}>
        <PalmBottomLeftAdmin />
      </div>

      {/* ── NAVBAR ── */}
      <nav
        className="shrink-0 z-20 h-14 flex items-center justify-between px-4 md:px-6 animate-slide-up"
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
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e5c2e, #2d8a44)' }}
          >
            🍽️
          </div>
          <span className="text-white text-sm font-semibold tracking-tight">
            Lempira
            <span className="hidden sm:inline font-normal text-slate-400 ml-2">
              — {empleado?.nombre}
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full capitalize"
                style={{ background: 'rgba(45,138,68,0.2)', color: '#6ee7a0' }}>
                {empleado?.rol}
              </span>
            </span>
          </span>
        </div>

        {/* Nav links — solo visibles en desktop (lg+) */}
        <div className="hidden lg:flex items-center gap-1">
          {items.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: active ? 'rgba(45,138,68,0.18)' : 'transparent',
                  color:      active ? '#fff' : 'rgba(255,255,255,0.55)',
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

        {/* Botón hamburguesa — visible solo en móvil/tablet (< lg) */}
        <button
          className="lg:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg gap-1.5 transition-all"
          style={{ background: menuAbierto ? 'rgba(45,138,68,0.2)' : 'rgba(255,255,255,0.06)' }}
          onClick={() => setMenuAbierto(v => !v)}
          aria-label="Abrir menú"
        >
          <span
            className="block w-5 h-0.5 rounded transition-all duration-300"
            style={{
              background: '#fff',
              transform: menuAbierto ? 'translateY(8px) rotate(45deg)' : 'none',
            }}
          />
          <span
            className="block w-5 h-0.5 rounded transition-all duration-300"
            style={{
              background: '#fff',
              opacity: menuAbierto ? 0 : 1,
            }}
          />
          <span
            className="block w-5 h-0.5 rounded transition-all duration-300"
            style={{
              background: '#fff',
              transform: menuAbierto ? 'translateY(-8px) rotate(-45deg)' : 'none',
            }}
          />
        </button>
      </nav>

      {/* ── SIDEBAR MÓVIL/TABLET — drawer deslizante desde la derecha ── */}
      <>
        {/* Overlay oscuro */}
        {menuAbierto && (
          <div
            className="lg:hidden fixed inset-0 z-30"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={() => setMenuAbierto(false)}
          />
        )}

        {/* Panel lateral */}
        <aside
          className="lg:hidden fixed top-14 right-0 z-40 h-[calc(100vh-3.5rem)] w-64 flex flex-col transition-transform duration-300"
          style={{
            background: 'rgba(8,20,42,0.97)',
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            transform: menuAbierto ? 'translateX(0)' : 'translateX(100%)',
          }}
        >
          {/* Empleado info */}
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-white text-sm font-semibold">{empleado?.nombre} {empleado?.apellido}</p>
            <span
              className="text-xs px-2 py-0.5 rounded-full capitalize mt-1 inline-block"
              style={{ background: 'rgba(45,138,68,0.2)', color: '#6ee7a0' }}
            >
              {empleado?.rol}
            </span>
          </div>

          {/* Links de navegación */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
            {items.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background: active ? 'rgba(45,138,68,0.18)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.60)',
                    borderLeft: active ? '3px solid rgba(212,160,64,0.8)' : '3px solid transparent',
                  }}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Cerrar sesión */}
          <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: 'rgba(239,68,68,0.12)',
                color: '#fca5a5',
                border: '1px solid rgba(239,68,68,0.22)',
              }}
            >
              <span>✕</span>
              Cerrar sesión
            </button>
          </div>
        </aside>
      </>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className="flex-1 overflow-y-auto relative z-10 p-4 md:p-6 animate-fade-in">
        {children}
      </main>
    </div>
  )
}
