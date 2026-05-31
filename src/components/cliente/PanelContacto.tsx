'use client'

import { useState } from 'react'

const infoItems = [
  { icon: '📍', label: 'Dirección', lines: ['Calle Principal #123, Colonia Centro', 'San Pedro Sula, Honduras'] },
  { icon: '📞', label: 'Teléfono', lines: ['+504 1234-5678', '+504 8765-4321'] },
  { icon: '✉️', label: 'Email', lines: ['info@restaurantelempira.com', 'reservas@restaurantelempira.com'] },
  { icon: '⏰', label: 'Horario', lines: ['Lunes a Jueves: 12:00 – 23:00', 'Viernes y Sábado: 12:00 – 00:00'] },
]

export default function PanelContacto() {
  const [email, setEmail] = useState('')
  const [mensajeContacto, setMensajeContacto] = useState('')
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setEnviado(true)
    setTimeout(() => setEnviado(false), 4000)
    setEmail(''); setMensajeContacto('')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">

      {/* Cabecera */}
      <div className="animate-slide-up">
        <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: '#d4a040' }}>
          Estamos aquí
        </p>
        <h1 className="text-2xl font-bold text-gradient-anim">Contacto</h1>
        <p className="text-sm mt-1" style={{ color: '#7aaa82' }}>Escríbenos o visítanos — te atendemos con gusto.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">

        {/* Columna izquierda */}
        <div className="space-y-3">
          {infoItems.map((item, i) => (
            <div key={item.label}
              className="glass-panel rounded-2xl p-4 flex items-start gap-4 animate-slide-up"
              style={{ animationDelay: `${80 + i * 70}ms` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: 'rgba(212,160,64,0.15)' }}>
                {item.icon}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#5a9a6a' }}>
                  {item.label}
                </p>
                {item.lines.map(l => (
                  <p key={l} className="text-sm" style={{ color: '#0a2214' }}>{l}</p>
                ))}
              </div>
            </div>
          ))}

          {/* Evento especial */}
          <div className="glass-dark rounded-2xl p-5 text-white animate-slide-up delay-300">
            <div className="text-3xl mb-2">🎉</div>
            <p className="font-bold text-[15px]">¿Evento especial?</p>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: '#9adab4' }}>
              Consulta nuestros paquetes para cumpleaños, aniversarios y eventos corporativos.
            </p>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="space-y-4">

          {/* Formulario */}
          <div className="glass-panel overflow-hidden animate-slide-up delay-100">
            <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(45,112,60,0.15)' }}>
              <p className="font-semibold text-[15px]" style={{ color: '#0a2214' }}>Envíanos un mensaje</p>
            </div>
            <div className="p-6 space-y-4">
              {enviado && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl animate-scale-in"
                  style={{ background: 'rgba(45,144,80,0.15)', border: '1px solid rgba(45,144,80,0.3)', color: '#2d9050' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                    <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
                  </svg>
                  <span className="text-sm font-medium">Mensaje enviado. Te responderemos pronto.</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-[13px] font-medium" style={{ color: '#1a3a22' }}>Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com" className="input-modern" required />
                </div>
                <div>
                  <label className="block mb-1.5 text-[13px] font-medium" style={{ color: '#1a3a22' }}>Mensaje *</label>
                  <textarea value={mensajeContacto} onChange={e => setMensajeContacto(e.target.value)}
                    placeholder="Escribe tu mensaje aquí…" rows={4} className="input-modern resize-none" required />
                </div>
                <button type="submit" className="btn-primary w-full py-3 text-[15px]">
                  Enviar mensaje
                </button>
              </form>
            </div>
          </div>

          {/* Mapa */}
          <div className="glass-panel overflow-hidden animate-slide-up delay-200">
            <div className="h-36 flex flex-col items-center justify-center gap-2"
              style={{ background: 'rgba(6,182,212,0.08)' }}>
              <span className="text-4xl">🗺️</span>
              <p className="text-sm" style={{ color: '#3d6a4a' }}>Calle Principal #123, San Pedro Sula</p>
            </div>
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-xs" style={{ color: '#5a9a6a' }}>Ver ubicación</span>
              <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer"
                className="text-sm font-semibold hover:underline transition-colors" style={{ color: '#c47a28' }}>
                Abrir en Google Maps →
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
