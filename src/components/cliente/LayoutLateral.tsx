'use client'

import { useState, useEffect } from 'react'

type Vista = 'inicio' | 'sobre' | 'reservas' | 'contacto' | 'menu'

const menuItems: { id: Vista; nombre: string; icon: React.ReactNode }[] = [
  {
    id: 'inicio', nombre: 'Inicio',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>,
  },
  {
    id: 'menu', nombre: 'Menú',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 6h18M3 12h18M3 18h12"/></svg>,
  },
  {
    id: 'reservas', nombre: 'Reservas',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>,
  },
  {
    id: 'sobre', nombre: 'Sobre Nosotros',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  },
  {
    id: 'contacto', nombre: 'Contacto',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.0 1.18 2 2 0 012 0h3a2 2 0 012 1.72 12 12 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12 12 0 002.81.7A2 2 0 0122 14.92z"/></svg>,
  },
]

/* ── TECHO: ENREDADERAS + 5 ESTRELLAS ─────────────────── */
function CeilingDecoration({ animKey }: { animKey: number }) {
  const vines = [
    { x: 80,  h: 62, col: '#2d8a44', d: 0 },
    { x: 235, h: 50, col: '#1a6e36', d: 0.6 },
    { x: 400, h: 68, col: '#2d8a44', d: 1.1 },
    { x: 570, h: 54, col: '#1a6e36', d: 0.3 },
    { x: 730, h: 66, col: '#2d8a44', d: 0.8 },
    { x: 895, h: 56, col: '#1a6e36', d: 0.15 },
  ]

  // 5 estrellas colgando de la viga (mismas posiciones que las antiguas bombillas)
  const stars = [
    { x1: 80,  x2: 235, sag: 62, dc: 'bulb-d1' },
    { x1: 235, x2: 400, sag: 68, dc: 'bulb-d2' },
    { x1: 400, x2: 570, sag: 60, dc: 'bulb-d3' },
    { x1: 570, x2: 730, sag: 66, dc: 'bulb-d4' },
    { x1: 730, x2: 895, sag: 63, dc: 'bulb-d5' },
  ]

  // Calcula los puntos de una estrella de 5 puntas
  const starPoints = (cx: number, cy: number, outerR: number, innerR: number) => {
    const pts: string[] = []
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 72 - 90) * (Math.PI / 180)
      const innerAngle = (i * 72 - 54) * (Math.PI / 180)
      pts.push(`${cx + Math.cos(outerAngle) * outerR},${cy + Math.sin(outerAngle) * outerR}`)
      pts.push(`${cx + Math.cos(innerAngle) * innerR},${cy + Math.sin(innerAngle) * innerR}`)
    }
    return pts.join(' ')
  }

  return (
    <div
      key={animKey}
      className="w-full shrink-0 relative overflow-visible animate-fade-in"
      style={{ height: 95, zIndex: 5 }}
    >
      <svg
        width="100%"
        height="95"
        viewBox="0 0 1000 95"
        preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
      >
        <defs>
          {/* Wood beam gradient */}
          <linearGradient id="beam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#2a1208"/>
            <stop offset="18%"  stopColor="#5c3010"/>
            <stop offset="40%"  stopColor="#8b5e3c"/>
            <stop offset="60%"  stopColor="#7a4e2e"/>
            <stop offset="82%"  stopColor="#5c3010"/>
            <stop offset="100%" stopColor="#2a1208"/>
          </linearGradient>
          <linearGradient id="beamEdge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.4)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
          </linearGradient>
          {/* Edison bulb radial gradient */}
          <radialGradient id="bulbGrad" cx="38%" cy="32%">
            <stop offset="0%"   stopColor="#fffde7" stopOpacity="1"/>
            <stop offset="40%"  stopColor="#fde68a" stopOpacity="1"/>
            <stop offset="75%"  stopColor="#fbbf24" stopOpacity="1"/>
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="1"/>
          </radialGradient>
          {/* Warm glow filter */}
          <filter id="warmGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Soft leaf shadow */}
          <filter id="leafShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="1" stdDeviation="1.5" floodColor="#0a2010" floodOpacity="0.4"/>
          </filter>
        </defs>

        {/* ── VIGA / BEAM ──────────────────────────────── */}
        <rect x="0" y="0" width="1000" height="14" fill="url(#beam)"/>
        {/* Sombra bajo la viga */}
        <rect x="0" y="13" width="1000" height="5" fill="url(#beamEdge)"/>
        {/* Textura de nudos en la madera */}
        {[120, 290, 460, 640, 810].map(kx => (
          <ellipse key={kx} cx={kx} cy={6} rx={18} ry={5} fill="rgba(0,0,0,0.15)" />
        ))}

        {/* ── HOJAS PEQUEÑAS EN LA VIGA ────────────────── */}
        {[55, 160, 320, 480, 645, 810, 960].map((lx, i) => (
          <g key={lx} filter="url(#leafShadow)">
            <ellipse cx={lx}    cy={11} rx={14} ry={5.5}
              fill={i%2===0 ? '#1a5c2e' : '#2d8a44'}
              opacity="0.78"
              transform={`rotate(${i%2===0 ? -18 : 15}, ${lx}, 11)`}/>
            <ellipse cx={lx+10} cy={10} rx={10} ry={4.5}
              fill={i%2===0 ? '#2d8a44' : '#1a5c2e'}
              opacity="0.62"
              transform={`rotate(${i%2===0 ? 12 : -20}, ${lx+10}, 10)`}/>
          </g>
        ))}

        {/* ── HILOS + 5 ESTRELLAS COLGANTES ────────────── */}
        {stars.map((s, i) => {
          const mx = (s.x1 + s.x2) / 2
          return (
            <g key={i}>
              {/* Hilo */}
              <path
                d={`M ${mx} 14 L ${mx} ${s.sag - 12}`}
                stroke="#5c3010"
                strokeWidth="1.2"
                fill="none"
                opacity="0.60"
              />
              {/* Halo brillante detrás de la estrella */}
              <circle
                cx={mx} cy={s.sag}
                r="16"
                fill="rgba(251,191,36,0.13)"
                className={`bulb-flicker ${s.dc}`}
              />
              {/* Estrella de 5 puntas */}
              <g filter="url(#warmGlow)" className={`bulb-flicker ${s.dc}`}>
                <polygon
                  points={starPoints(mx, s.sag, 11, 5)}
                  fill="#fbbf24"
                  stroke="#f59e0b"
                  strokeWidth="0.8"
                />
                {/* Brillo central */}
                <circle cx={mx} cy={s.sag} r="3.5" fill="#fffde7" opacity="0.85"/>
              </g>
            </g>
          )
        })}

        {/* ── ENREDADERAS COLGANTES ─────────────────────── */}
        {vines.map((v, i) => {
          const side = i % 2 === 0 ? 1 : -1
          return (
            <g
              key={i}
              style={{ transformOrigin: `${v.x}px 14px` }}
              className="vine-sway"
            >
              <g transform={`translate(${v.x}, 0)`} filter="url(#leafShadow)">
                {/* Tallo principal */}
                <path
                  d={`M 0 14 C ${side*3} ${14 + v.h*0.35} ${-side*2} ${14 + v.h*0.7} ${side} ${14 + v.h}`}
                  stroke="#155c24"
                  strokeWidth="2.8"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Hoja 1 */}
                <ellipse
                  cx={-14 * side} cy={14 + v.h * 0.28}
                  rx={12} ry={5}
                  fill={v.col}
                  opacity={0.90}
                  transform={`rotate(${-28 * side}, ${-14*side}, ${14 + v.h*0.28})`}
                />
                {/* Hoja 2 */}
                <ellipse
                  cx={12 * side} cy={14 + v.h * 0.52}
                  rx={11} ry={4.8}
                  fill="#1a6e36"
                  opacity={0.87}
                  transform={`rotate(${24 * side}, ${12*side}, ${14 + v.h*0.52})`}
                />
                {/* Hoja 3 */}
                {v.h > 55 && (
                  <ellipse
                    cx={-12 * side} cy={14 + v.h * 0.76}
                    rx={10.5} ry={4.5}
                    fill={v.col}
                    opacity={0.84}
                    transform={`rotate(${-22 * side}, ${-12*side}, ${14 + v.h*0.76})`}
                  />
                )}
                {/* Zarcillo al final */}
                <path
                  d={`M ${side} ${14 + v.h} C ${side*6} ${14 + v.h + 6} ${side*10} ${14 + v.h + 14} ${side*5} ${14 + v.h + 18}`}
                  stroke="#155c24"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.65"
                />
              </g>
            </g>
          )
        })}

        {/* ── PALMERAS EN ESQUINAS (techo) ──────────────── */}
        {/* Hoja izquierda desde viga */}
        <g opacity="0.55">
          <path d="M 0 14 C 15 30 60 40 110 20" stroke="#1a5c2e" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d="M 0 14 C 20 50 80 65 130 50" stroke="#1a5c2e" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          <path d="M 0 14 C 10 70 50 90 80 95" stroke="#1a5c2e" strokeWidth="3" fill="none" strokeLinecap="round"/>
        </g>
        {/* Hoja derecha desde viga */}
        <g opacity="0.50">
          <path d="M 1000 14 C 985 30 940 40 890 20" stroke="#1a5c2e" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d="M 1000 14 C 980 50 920 65 870 50" stroke="#1a5c2e" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          <path d="M 1000 14 C 990 70 950 90 920 95" stroke="#1a5c2e" strokeWidth="3" fill="none" strokeLinecap="round"/>
        </g>
      </svg>
    </div>
  )
}

/* ── PALMERA SVG ESQUINA SUPERIOR DERECHA ──────────────── */
function PalmTopRight() {
  return (
    <svg width="300" height="380" viewBox="0 0 300 380" fill="none" className="pointer-events-none select-none">
      <path d="M 300 0 C 268 85 195 190 72 365" stroke="#155c24" strokeWidth="5" strokeLinecap="round"/>
      <path d="M 300 0 C 260 35 180 72 100 185 C 172 105 250 48 282 18 C 293 10 298 4 300 0Z" fill="#1a6e36" opacity="0.72"/>
      <path d="M 300 0 C 248 16 148 30 55 98 C 145 62 242 24 285 8 C 294 5 298 2 300 0Z" fill="#228040" opacity="0.65"/>
      <path d="M 300 0 C 292 55 272 142 235 275 C 270 160 288 68 294 24 C 296 16 299 7 300 0Z" fill="#1a6e36" opacity="0.68"/>
      <path d="M 300 0 C 268 42 205 95 135 200 C 208 110 275 50 294 18 C 298 11 300 5 300 0Z" fill="#228040" opacity="0.58"/>
      <path d="M 300 0 C 238 8 120 10 38 72 C 138 38 242 12 285 3 C 294 1 298 0 300 0Z" fill="#2d9050" opacity="0.50"/>
      <path d="M 288 18 C 252 40 188 82 128 188 C 190 96 256 50 282 26 C 286 23 288 20 288 18Z" fill="#5cb870" opacity="0.22"/>
    </svg>
  )
}

/* ── PALMERA SVG ESQUINA INFERIOR IZQUIERDA ───────────── */
function PalmBottomLeft() {
  return (
    <svg width="280" height="360" viewBox="0 0 280 360" fill="none" className="pointer-events-none select-none">
      <path d="M 0 360 C 32 278 100 172 228 22" stroke="#155c24" strokeWidth="5" strokeLinecap="round"/>
      <path d="M 0 360 C 38 322 100 265 182 168 C 110 260 42 328 16 354 C 7 358 2 360 0 360Z" fill="#1a6e36" opacity="0.72"/>
      <path d="M 0 360 C 26 340 128 330 224 272 C 136 315 40 350 10 358 C 4 359 1 360 0 360Z" fill="#228040" opacity="0.65"/>
      <path d="M 0 360 C 7 305 28 220 65 88 C 26 200 10 300 3 345 C 1 353 0 358 0 360Z" fill="#1a6e36" opacity="0.68"/>
      <path d="M 0 360 C 30 316 92 258 162 162 C 92 252 34 316 10 350 C 4 356 1 358 0 360Z" fill="#228040" opacity="0.57"/>
      <path d="M 0 360 C 17 350 115 350 252 292 C 148 342 38 360 7 360Z" fill="#2d9050" opacity="0.48"/>
    </svg>
  )
}

/* ── LAYOUT PRINCIPAL ──────────────────────────────────── */
export default function LayoutLateral({
  children,
  vistaActiva,
  onCambiarVista,
}: {
  children: React.ReactNode
  vistaActiva: Vista
  onCambiarVista: (vista: Vista) => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [palmKey, setPalmKey] = useState(0)

  useEffect(() => {
    setPalmKey(k => k + 1)
  }, [vistaActiva])

  return (
    <div
      className="flex h-screen overflow-hidden relative"
      style={{
        background:
          /* Manchas de luz cálida: ámbar + verde selva (sin azul) */
          'radial-gradient(ellipse at 8% 12%, rgba(212,160,64,0.22) 0%, transparent 42%),' +
          'radial-gradient(ellipse at 92% 88%, rgba(212,160,64,0.18) 0%, transparent 42%),' +
          'radial-gradient(ellipse at 50% 45%, rgba(30,92,46,0.14) 0%, transparent 55%),' +
          'radial-gradient(ellipse at 88% 6%, rgba(251,191,36,0.14) 0%, transparent 30%),' +
          'radial-gradient(ellipse at 10% 88%, rgba(139,94,60,0.16) 0%, transparent 35%),' +
          /* Base: selva oscura profunda */
          'linear-gradient(160deg, #061420 0%, #0a2010 38%, #051a10 65%, #061420 100%)',
      }}
    >

      {/* Palmeras en esquinas (detrás de todo) */}
      <div key={`tr-${palmKey}`} className="fixed top-0 right-0 z-0 palm-enter palm-sway" style={{ opacity: 0.65 }}>
        <PalmTopRight />
      </div>
      <div key={`bl-${palmKey}`} className="fixed bottom-0 z-0 palm-enter palm-sway-left" style={{ left: 260, opacity: 0.58, animationDelay: '0.25s, 0.8s' }}>
        <PalmBottomLeft />
      </div>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden animate-fade-in" onClick={() => setMobileOpen(false)} />
      )}


      {/* ── SIDEBAR ──────────────────────────────────── */}
      <aside
        className={`fixed lg:relative z-30 flex flex-col h-full transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          width: 260, minWidth: 260,
          background: 'linear-gradient(180deg, #040e0a 0%, #071814 55%, #040e0a 100%)',
          borderRight: '1px solid rgba(6,182,212,0.12)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid rgba(6,182,212,0.1)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: 'linear-gradient(135deg,#d4a040,#c47a28)' }}>
            🍽️
          </div>
          <div>
            <p className="font-bold text-[15px] leading-tight tracking-tight text-white">Lempira</p>
            <p className="text-[11px] font-medium tracking-wide uppercase" style={{ color: '#4a9aaa' }}>Restaurante</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item, i) => {
            const active = vistaActiva === item.id
            return (
              <button
                key={item.id}
                onClick={() => { onCambiarVista(item.id); setMobileOpen(false) }}
                className={`sidebar-item-active group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 animate-slide-right ${!active ? 'hover:translate-x-0.5' : ''}`}
                style={{
                  animationDelay: `${i * 55}ms`,
                  background: active ? 'rgba(212,160,64,0.16)' : 'transparent',
                  color: active ? '#fff' : '#7aaa82',
                }}
              >
                <span
                  className={`transition-all duration-200 shrink-0 ${!active ? 'group-hover:scale-110' : ''}`}
                  style={{ color: active ? '#d4a040' : undefined }}
                >
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.nombre}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#d4a040' }} />}
              </button>
            )
          })}
        </nav>

        {/* Guacamaya */}
        <div className="px-5 pt-1 pb-0.5 text-center">
          <span className="text-4xl animate-float inline-block select-none" title="¡Bienvenido al Restaurante Lempira!">🦜</span>
          <p className="text-[10px] mt-0.5" style={{ color: '#5a9a6a' }}>¡Bienvenido!</p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(6,182,212,0.10)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg,#d4a040,#c47a28)' }}>L</div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-white leading-tight truncate">Restaurante Lempira</p>
              <p className="text-[11px] truncate" style={{ color: '#5a9a6a' }}>San Pedro Sula, Honduras</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">

        {/* Techo decorativo: enredaderas + luces */}
        <CeilingDecoration animKey={palmKey} />

        {/* Top bar mobile */}
        <header
          className="lg:hidden flex items-center justify-between px-4 h-13 shrink-0"
          style={{ background: 'rgba(6,20,32,0.80)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(6,182,212,0.10)' }}
        >
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-white/70 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="font-semibold text-[15px] text-white">
            {menuItems.find(m => m.id === vistaActiva)?.nombre ?? 'Menú'}
          </span>
          <div className="w-8" />
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
