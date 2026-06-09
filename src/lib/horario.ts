/**
 * Horario del restaurante
 * Cambia estos valores para ajustar el rango permitido en todos los formularios.
 */
export const HORA_APERTURA       = '12:00'  // Apertura del restaurante
export const HORA_CIERRE_ENTRADA = '23:00'  // Última hora de llegada (reservas)
export const HORA_CIERRE_SALIDA  = '24:00'  // Hora máxima de salida
/** Horas para gráficas y horario público (12:00 – 24:00) */
export const HORA_RESTAURANTE_INICIO = 12
export const HORA_RESTAURANTE_FIN    = 24

export const HORARIO_PUBLICO = '12:00 – 24:00'

export function redondearEuros(n: number): number {
  return Math.round(n * 100) / 100
}

/** Convierte precio de Supabase (number o string) a euros */
export function eurosNumero(val: unknown): number {
  if (val == null || val === '') return 0
  const n =
    typeof val === 'number'
      ? val
      : parseFloat(String(val).trim().replace(',', '.'))
  return Number.isFinite(n) ? redondearEuros(n) : 0
}

/**
 * Importes en tarjetas, tooltips, tablas.
 * - 34,98 € (coma decimal; no se confunde con miles)
 * - 10.000,00 € (miles con punto cuando aplica)
 */
export function formatearEuros(n: number): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(redondearEuros(n))
}

/**
 * Etiquetas del eje Y de la gráfica de ingresos.
 * - Menos de 1.000 €: 27 o 34,98 (sin separador de miles)
 * - ≥ 1.000 €: 2.500, 10.000, etc.
 */
export function formatearEurosEje(n: number): string {
  const v = redondearEuros(n)
  const esEntero = Math.abs(v - Math.round(v)) < 0.001
  const grande = Math.abs(v) >= 1000

  if (grande) {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: esEntero ? 0 : 2,
      maximumFractionDigits: esEntero ? 0 : 2,
      useGrouping: true,
    }).format(v)
  }

  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: esEntero ? 0 : 2,
    maximumFractionDigits: esEntero ? 0 : 2,
    useGrouping: false,
  }).format(v)
}

/** Paso “redondo” para marcas del eje (5, 25, 150, 2500…) */
function pasoEjeNice(rango: number): number {
  if (rango <= 0) return 1
  const pot = Math.pow(10, Math.floor(Math.log10(rango)))
  const n = rango / pot
  const factor = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return factor * pot
}

/**
 * Techo del eje Y según el pico de ingresos del periodo (escala adaptativa).
 * Ej.: máx. 77 → 100; máx. 550 → 600; máx. 10 → 20.
 */
export function techoEjeIngresos(maxValor: number): number {
  if (!Number.isFinite(maxValor) || maxValor <= 0) return 20
  const margen = maxValor * 1.12
  const paso = pasoEjeNice(margen / 4)
  return Math.ceil(margen / paso) * paso
}

/** Marcas del eje Y: 0, 5, 10… o 0, 25, 50, 75, 100… según el máximo */
export function ticksEjeIngresos(maxValor: number): number[] {
  const top = techoEjeIngresos(maxValor)
  const paso = pasoEjeNice(top / 4)
  const ticks: number[] = []
  for (let t = 0; t <= top + paso * 0.001; t += paso) {
    ticks.push(redondearEuros(t))
  }
  const ultimo = ticks[ticks.length - 1]
  if (ultimo !== top) ticks.push(top)
  return ticks
}

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

/** Slots cada 30 min entre dos horas (inclusive), p. ej. 12:00 … 23:00 */
export function franjasMediaHora(desde: string, hasta: string): string[] {
  const out: string[] = []
  let t = parseHora(desde)
  const end = parseHora(hasta)
  while (t <= end + 0.001) {
    const h = Math.floor(t)
    const m = Math.round((t - h) * 60)
    out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    t += 0.5
  }
  return out
}

/** Calendario: filas 12:00 … 23:00 (fin exclusivo 24 = última franja reservable) */
export const HORA_CALENDARIO_INICIO = HORA_RESTAURANTE_INICIO
export const HORA_CALENDARIO_FIN_EXCLUSIVO = HORA_RESTAURANTE_FIN

/**
 * Formatea un timestamp de Supabase (UTC) a la hora/fecha LOCAL del navegador.
 * Supabase a veces devuelve "2026-06-09T08:19:00" sin sufijo de zona horaria.
 * Si no tiene 'Z' ni offset explícito, añadimos 'Z' para forzar parseo UTC
 * y que toLocaleTimeString convierta correctamente a la hora local del usuario.
 */
export function formatTimestampLocal(iso: string): { fecha: string; hora: string } {
  if (!iso) return { fecha: '—', hora: '—' }
  const isoUTC =
    iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso)
      ? iso
      : iso.replace(' ', 'T') + 'Z'
  const d = new Date(isoUTC)
  if (isNaN(d.getTime())) return { fecha: '—', hora: '—' }
  return {
    fecha: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
    hora:  d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  }
}
