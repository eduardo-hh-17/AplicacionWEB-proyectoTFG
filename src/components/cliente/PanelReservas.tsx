'use client'

import { useState } from 'react'

export default function PanelReservas() {
  const [fecha, setFecha] = useState('')
  const [personas, setPersonas] = useState(2)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fecha || !nombre || !telefono) return
    setEnviado(true)
    setTimeout(() => setEnviado(false), 4000)
    setFecha(''); setPersonas(2); setNombre(''); setTelefono(''); setMensaje('')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">

      {/* Cabecera */}
      <div className="animate-slide-up">
        <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: '#d4a040' }}>
          Mesa para ti
        </p>
        <h1 className="text-2xl font-bold text-gradient-anim">Reservar mesa</h1>
        <p className="text-sm mt-1" style={{ color: '#7aaa82' }}>
          Completa el formulario y te confirmamos disponibilidad.
        </p>
      </div>

      {/* Success */}
      {enviado && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl animate-scale-in"
          style={{ background: 'rgba(45,144,80,0.2)', border: '1px solid rgba(45,144,80,0.4)', color: '#9adab4' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
            <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
          </svg>
          <span className="text-sm font-medium">¡Reserva enviada! Te contactaremos para confirmar.</span>
        </div>
      )}

      {/* Formulario */}
      <div className="glass-panel overflow-hidden animate-slide-up delay-100">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(45,112,60,0.15)' }}>
          <p className="font-semibold text-[15px]" style={{ color: '#0a2214' }}>Datos de la reserva</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-[13px] font-medium" style={{ color: '#1a3a22' }}>Nombre completo *</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Tu nombre" className="input-modern" required />
            </div>
            <div>
              <label className="block mb-1.5 text-[13px] font-medium" style={{ color: '#1a3a22' }}>Teléfono *</label>
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                placeholder="+504 XXXX-XXXX" className="input-modern" required />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-[13px] font-medium" style={{ color: '#1a3a22' }}>Fecha y hora *</label>
              <input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)}
                className="input-modern" required />
            </div>
            <div>
              <label className="block mb-1.5 text-[13px] font-medium" style={{ color: '#1a3a22' }}>Número de personas</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setPersonas(p => Math.max(1, p - 1))}
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 transition-colors input-modern"
                  style={{ width: 36, height: 36, padding: 0, textAlign: 'center' }}>−</button>
                <span className="flex-1 text-center font-semibold" style={{ color: '#0a2214' }}>{personas}</span>
                <button type="button" onClick={() => setPersonas(p => Math.min(20, p + 1))}
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 transition-colors input-modern"
                  style={{ width: 36, height: 36, padding: 0, textAlign: 'center' }}>+</button>
              </div>
            </div>
          </div>
          <div>
            <label className="block mb-1.5 text-[13px] font-medium" style={{ color: '#1a3a22' }}>Mensaje adicional</label>
            <textarea value={mensaje} onChange={e => setMensaje(e.target.value)}
              placeholder="Alergias, ocasión especial, preferencia de mesa…"
              rows={3} className="input-modern resize-none" />
          </div>
          <button type="submit" className="btn-primary w-full py-3 text-[15px]">
            Solicitar reserva
          </button>
        </form>
      </div>

      {/* Info */}
      <div className="glass-panel rounded-2xl p-5 flex items-center gap-4 animate-slide-up delay-200">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ background: 'rgba(212,160,64,0.15)' }}>
          📞
        </div>
        <p className="text-sm" style={{ color: '#1a3a22' }}>
          También puedes llamarnos al{' '}
          <a href="tel:+50412345678" className="font-semibold hover:underline" style={{ color: '#c47a28' }}>
            +504 1234-5678
          </a>{' '}
          para reservar directamente.
        </p>
      </div>
    </div>
  )
}
