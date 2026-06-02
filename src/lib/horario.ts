/**
 * Horario del restaurante
 * Cambia estos valores para ajustar el rango permitido en todos los formularios.
 */
export const HORA_APERTURA       = '13:00'  // Primera hora de llegada permitida
export const HORA_CIERRE_ENTRADA = '23:00'  // Última hora de llegada permitida
export const HORA_CIERRE_SALIDA  = '24:00'  // Hora máxima de salida

/** Intervalos de minutos disponibles (cada 15 min) */
export const MINUTOS = [0, 15, 30, 45]

/** Genera lista de horas entre min y max (inclusive). Soporta hasta 24. */
export function horasDisponibles(min = HORA_APERTURA, max = HORA_CIERRE_ENTRADA): number[] {
  const minH = parseInt(min.split(':')[0])
  const maxH = parseInt(max.split(':')[0])
  const horas: number[] = []
  for (let h = minH; h <= maxH; h++) horas.push(h)
  return horas
}

/** Convierte "HH:MM" a número decimal (ej: "13:30" → 13.5) */
export function parseHora(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h + (m || 0) / 60
}

/** Añade horas decimales a "HH:MM" y devuelve "HH:MM" */
export function addHoras(hhmm: string, horas: number): string {
  const total = parseHora(hhmm) + horas
  const h = Math.floor(total)
  const m = Math.round((total - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
