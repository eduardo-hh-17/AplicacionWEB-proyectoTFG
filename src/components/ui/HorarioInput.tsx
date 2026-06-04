'use client'

import { useMemo } from 'react'
import {
  HORA_APERTURA,
  HORA_CIERRE_ENTRADA,
  MINUTOS,
  horasDisponibles,
} from '@/lib/horario'

interface Props {
  value: string                 // "HH:MM"
  onChange: (v: string) => void
  tema?: 'admin' | 'cliente'
  minHora?: string              // límite inferior (ej: hora de entrada para la salida)
  maxHora?: string              // límite superior
  disabled?: boolean
}

export default function HorarioInput({
  value,
  onChange,
  tema = 'admin',
  minHora,
  maxHora,
  disabled = false,
}: Props) {
  const min = minHora || HORA_APERTURA
  const max = maxHora || HORA_CIERRE_ENTRADA

  const minH = parseInt(min.split(':')[0])
  const minM = parseInt(min.split(':')[1]) || 0
  const maxH = parseInt(max.split(':')[0])
  const maxM = parseInt(max.split(':')[1]) || 0  // minuto límite de la hora máxima

  // Horas disponibles según rango
  const horas = useMemo(() => horasDisponibles(min, max), [min, max])

  // Parsear value actual; si está fuera de rango, ajustar al máximo
  const rawH = parseInt((value || min).split(':')[0])
  const rawM = parseInt((value || min).split(':')[1]) || 0
  const hh = Math.min(Math.max(rawH, minH), maxH)
  const mm = rawM

  const setH = (h: number) => {
    // Al cambiar hora, ajustar minutos si quedan fuera del rango
    let safeM = mm
    if (h === minH && mm <= minM) safeM = getFirstValidMinuto(h)
    if (h === maxH) {
      const validMax = MINUTOS.filter(m => m <= maxM)
      if (!validMax.includes(mm)) safeM = validMax[0] ?? 0
    }
    onChange(`${String(h).padStart(2, '0')}:${String(safeM).padStart(2, '0')}`)
  }

  const setM = (m: number) => {
    onChange(`${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }

  // Minutos disponibles para la hora seleccionada
  const minutosDisponibles = useMemo(() => {
    if (hh === maxH) return MINUTOS.filter(m => m <= maxM)  // respetar minuto máximo (ej: 23:00 → solo :00)
    if (hh === minH) return MINUTOS.filter(m => m > minM)   // > para no elegir la misma hora exacta
    return MINUTOS
  }, [hh, minH, minM, maxH, maxM])

  function getFirstValidMinuto(h: number): number {
    if (h === minH) {
      const valid = MINUTOS.filter(m => m > minM)
      return valid.length ? valid[0] : 0
    }
    return 0
  }

  const isAdmin = tema === 'admin'

  const wrap: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: isAdmin ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
    border: isAdmin
      ? '1.5px solid rgba(255,255,255,0.14)'
      : '1.5px solid rgba(45,138,68,0.30)',
    borderRadius: 12,
    padding: '7px 12px',
    width: '100%',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'default',
  }

  const sel: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: isAdmin ? '#fff' : '#1a3a22',
    fontSize: 15,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    textAlign: 'center',
    padding: '2px 4px',
  }

  const optStyle: React.CSSProperties = {
    background: isAdmin ? '#0d2040' : '#fff',
    color: isAdmin ? '#fff' : '#1a3a22',
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={wrap}>
        <span style={{ color: isAdmin ? '#64748b' : '#5a8a6a', fontSize: 14 }}>🕐</span>

        {/* Horas */}
        <select value={hh} onChange={e => setH(Number(e.target.value))} style={sel} disabled={disabled}>
          {horas.map(h => (
            <option key={h} value={h} style={optStyle}>
              {String(h).padStart(2, '0')}
            </option>
          ))}
        </select>

        <span style={{ color: isAdmin ? '#64748b' : '#5a8a6a', fontWeight: 800, fontSize: 16 }}>:</span>

        {/* Minutos */}
        <select value={mm} onChange={e => setM(Number(e.target.value))} style={sel} disabled={disabled}>
          {minutosDisponibles.map(m => (
            <option key={m} value={m} style={optStyle}>
              {String(m).padStart(2, '0')}
            </option>
          ))}
        </select>
      </div>

      {/* Indicador de rango */}
      <p style={{
        fontSize: 10,
        color: isAdmin ? '#475569' : '#7aaa8a',
        marginTop: 3,
        textAlign: 'right',
      }}>
        {min} – {max}
      </p>
    </div>
  )
}
