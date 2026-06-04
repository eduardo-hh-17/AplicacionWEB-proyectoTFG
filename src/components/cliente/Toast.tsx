'use client'

import { useEffect } from 'react'

type ToastProps = {
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
  onClose: () => void
}

const CFG = {
  success: { dot: '#22c55e', bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.45)',  color: '#86efac' },
  error:   { dot: '#ef4444', bg: 'rgba(239,68,68,0.18)',  border: 'rgba(239,68,68,0.50)',  color: '#fca5a5' },
  info:    { dot: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.45)', color: '#93c5fd' },
}

export function Toast({ message, type, duration = 3500, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const c = CFG[type]

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl animate-slide-up"
      style={{
        background: 'linear-gradient(135deg, #0d1f35, #0a1628)',
        border: `1.5px solid ${c.border}`,
        backdropFilter: 'blur(12px)',
        minWidth: 280,
        maxWidth: 400,
        pointerEvents: 'auto',
      }}
    >
      {/* Indicador de color (sin emoji, evita duplicar iconos del mensaje) */}
      <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: c.dot }} />
      <p className="text-sm font-semibold leading-snug flex-1" style={{ color: c.color }}>{message}</p>
      <button
        onClick={onClose}
        className="shrink-0 text-xs opacity-50 hover:opacity-100 transition-opacity"
        style={{ color: '#fff' }}
      >✕</button>
    </div>
  )
}