'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    setValue(0)
    if (target === 0) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setValue(target); clearInterval(timer) }
      else setValue(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

function StatCard({
  label, value, display, suffix, icon, iconBg, iconColor, index
}: {
  label: string; value: number; display?: string; suffix?: string
  icon: React.ReactNode; iconBg: string; iconColor: string; index: number
}) {
  const count = useCountUp(value)
  return (
    <div className="glass-panel p-5 animate-slide-up" style={{ animationDelay: `${100 + index * 80}ms` }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-medium" style={{ color: '#3d6a4a' }}>{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: iconBg, color: iconColor }}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight" style={{ color: '#0a2214' }}>
        {display ?? count}{suffix ?? ''}
      </p>
    </div>
  )
}

export default function PanelInicio() {
  const [clientesHoy,  setClientesHoy]  = useState(0)
  const [pedidosHoy,   setPedidosHoy]   = useState(0)
  const [reservasHoy,  setReservasHoy]  = useState(0)

  useEffect(() => {
    const cargar = async () => {
      const hoy = new Date().toISOString().split('T')[0]

      // ── Clientes hoy (suma de personas en sesiones de hoy) ──
      const { data: sesiones } = await supabase
        .from('sesiones')
        .select('personas')
        .gte('iniciada_en', `${hoy}T00:00:00`)
      if (sesiones) setClientesHoy(sesiones.reduce((s, x) => s + (x.personas || 0), 0))

      // ── Pedidos hoy ──
      const { count: cPed } = await supabase
        .from('pedidos')
        .select('id', { count: 'exact', head: true })
        .gte('creado_en', `${hoy}T00:00:00`)
        .lte('creado_en', `${hoy}T23:59:59`)
      if (cPed !== null) setPedidosHoy(cPed)

      // ── Reservas (total acumulado, tabla puede no existir) ──
      const { count: cRes } = await supabase
        .from('reservas')
        .select('id', { count: 'exact', head: true })
      if (cRes !== null) setReservasHoy(cRes)
    }

    cargar()

    const canal = supabase
      .channel('panel-inicio-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sesiones' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' },  cargar)
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [])

  const statsConfig = [
    {
      label: 'Clientes hoy',
      value: clientesHoy,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
          <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
          <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87" />
        </svg>
      ),
      iconBg: 'rgba(45,138,68,0.18)', iconColor: '#2d8a44',
    },
    {
      label: 'Pedidos hoy',
      value: pedidosHoy,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      ),
      iconBg: 'rgba(139,94,60,0.18)', iconColor: '#8b5e3c',
    },
    {
      label: 'Reservas',
      value: reservasHoy,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
      iconBg: 'rgba(212,160,64,0.18)', iconColor: '#d4a040',
    },
    {
      label: 'Valoración',
      value: 48,
      display: '4.8',
      suffix: ' ★',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
      iconBg: 'rgba(251,191,36,0.18)', iconColor: '#d4a040',
    },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ── HERO ─────────────────────────────────────── */}
      <div className="glass-dark relative overflow-hidden p-8 text-white animate-fade-in">
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle,#d4a040,transparent)' }} />
        <div className="absolute -bottom-8 -left-6 w-40 h-40 rounded-full pointer-events-none opacity-25"
          style={{ background: 'radial-gradient(circle,#2d8a44,transparent)' }} />

        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium mb-4 animate-slide-right"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: '#6abf69' }} />
            Abierto ahora · Lunes–Domingo 12:00–23:00
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 animate-slide-up delay-75 text-white">
            Bienvenido a{' '}
            <span className="text-gradient-anim">Restaurante Lempira</span>
          </h1>
          <p className="text-[15px] max-w-md animate-slide-up delay-150" style={{ color: '#9adab4' }}>
            Tradición hondureña en cada plato. Sabores auténticos del Caribe y la selva tropical.
          </p>

          <div className="flex flex-wrap gap-3 mt-6 animate-slide-up delay-200">
            {[
              { icon: '🕐', text: '12:00 – 23:00' },
              { icon: '📍', text: 'San Pedro Sula' },
              { icon: '⭐', text: '4.8 · +10k clientes' },
            ].map(item => (
              <div key={item.text}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                <span>{item.icon}</span><span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-6xl opacity-15 select-none hidden md:block animate-float">
          🦜
        </div>
      </div>

      {/* ── STATS (datos reales) ─────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((s, i) => (
          <StatCard key={s.label} {...s} index={i} />
        ))}
      </div>

      {/* ── TARJETAS ───────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: '🥘', title: 'Platos típicos', desc: 'Baleadas, sopa de caracol, tapado olanchano y mucho más de la cocina hondureña.', delay: 100 },
          { icon: '🌿', title: 'Ingredientes frescos', desc: 'Ingredientes locales seleccionados cada mañana. Calidad caribeña en cada bocado.', delay: 200 },
          { icon: '🎉', title: 'Eventos especiales', desc: 'Cumpleaños, aniversarios y celebraciones. Paquetes personalizados para ti.', delay: 300 },
        ].map(item => (
          <div
            key={item.title}
            className="glass-panel p-6 animate-slide-up"
            style={{ animationDelay: `${item.delay}ms` }}
          >
            <div className="text-3xl mb-3 animate-float" style={{ animationDelay: `${item.delay * 2}ms` }}>
              {item.icon}
            </div>
            <h3 className="font-semibold mb-1.5" style={{ color: '#0a2214' }}>{item.title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#3d6a4a' }}>{item.desc}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
