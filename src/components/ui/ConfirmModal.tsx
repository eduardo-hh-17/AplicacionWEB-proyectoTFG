'use client'

import { useEffect } from 'react'

type Variant = 'danger' | 'warning' | 'info'

interface ConfirmModalProps {
  abierto: boolean
  titulo: string
  mensaje?: string
  textoAceptar?: string
  textoCancelar?: string
  variante?: Variant
  onAceptar: () => void
  onCancelar: () => void
}

const VARIANTE_CONFIG: Record<Variant, { icon: string; color: string; bg: string; border: string; btnBg: string; btnColor: string }> = {
  danger:  { icon: '🗑️', color: '#fca5a5', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  btnBg: 'rgba(239,68,68,0.85)',  btnColor: '#fff' },
  warning: { icon: '⚠️', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)', btnBg: 'rgba(217,119,6,0.85)',  btnColor: '#fff' },
  info:    { icon: 'ℹ️', color: '#93c5fd', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', btnBg: 'rgba(37,99,235,0.85)',  btnColor: '#fff' },
}

export default function ConfirmModal({
  abierto,
  titulo,
  mensaje,
  textoAceptar = 'Aceptar',
  textoCancelar = 'Cancelar',
  variante = 'danger',
  onAceptar,
  onCancelar,
}: ConfirmModalProps) {
  const cfg = VARIANTE_CONFIG[variante]

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [abierto, onCancelar])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onCancelar}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
        style={{
          background: 'linear-gradient(160deg, #0d1f35 0%, #0a1628 100%)',
          border: `1px solid ${cfg.border}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            {cfg.icon}
          </div>
          <div>
            <h3 className="font-bold text-white text-[16px] leading-snug">{titulo}</h3>
            {mensaje && (
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {mensaje}
              </p>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancelar}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {textoCancelar}
          </button>
          <button
            onClick={onAceptar}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: cfg.btnBg, color: cfg.btnColor }}
          >
            {textoAceptar}
          </button>
        </div>
      </div>
    </div>
  )
}
