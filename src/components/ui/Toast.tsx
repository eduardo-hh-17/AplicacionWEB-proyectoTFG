'use client'

import { useEffect, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  mensaje: string
  tipo: ToastType
}

const TOAST_CONFIG: Record<ToastType, { dot: string; bg: string; border: string; color: string }> = {
  success: { dot: '#22c55e', bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',  color: '#86efac' },
  error:   { dot: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  color: '#fca5a5' },
  info:    { dot: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', color: '#93c5fd' },
}

function ToastItem({ item, onRemove }: { item: ToastItem; onRemove: () => void }) {
  const cfg = TOAST_CONFIG[item.tipo]

  useEffect(() => {
    const t = setTimeout(onRemove, 3500)
    return () => clearTimeout(t)
  }, [onRemove])

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl animate-slide-up"
      style={{
        background: 'linear-gradient(135deg, #0d1f35, #0a1628)',
        border: `1px solid ${cfg.border}`,
        backdropFilter: 'blur(12px)',
        minWidth: 260, maxWidth: 360,
      }}
    >
      <span className="shrink-0 w-2 h-2 rounded-full mt-1" style={{ background: cfg.dot }} />
      <p className="text-sm font-medium leading-snug" style={{ color: cfg.color }}>{item.mensaje}</p>
      <button
        onClick={onRemove}
        className="ml-auto shrink-0 text-xs opacity-50 hover:opacity-100 transition-opacity"
        style={{ color: '#fff' }}
      >✕</button>
    </div>
  )
}

let _addToast: ((msg: string, tipo?: ToastType) => void) | null = null

export function useAdminToast() {
  return {
    toast: (mensaje: string, tipo: ToastType = 'info') => _addToast?.(mensaje, tipo),
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    _addToast = (mensaje, tipo = 'info') => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, mensaje, tipo }])
    }
    return () => { _addToast = null }
  }, [])

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <ToastItem key={t.id} item={t} onRemove={() => remove(t.id)} />
      ))}
    </div>
  )
}
