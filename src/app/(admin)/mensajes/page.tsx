'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Mensaje = {
  id: string
  nombre: string
  email: string
  asunto: string | null
  mensaje: string
  leido: boolean
  creado_en: string
}

type Filtro = 'todos' | 'no_leidos' | 'leidos'

/* Colores avatar por inicial */
const AVATAR_COLORS = [
  ['#1a4a2e','#2d8a44','#9adab4'],
  ['#1a2a4a','#2d5a8a','#9ab4da'],
  ['#4a1a2e','#8a2d5a','#da9ab4'],
  ['#2e2a1a','#6a5a2d','#dac89a'],
  ['#1a3a4a','#2d7a8a','#9ad4da'],
]
const avatarColor = (nombre: string) => AVATAR_COLORS[nombre.charCodeAt(0) % AVATAR_COLORS.length]

/* Resalta coincidencias dentro de un texto */
function Highlight({ texto, query }: { texto: string; query: string }) {
  if (!query.trim()) return <>{texto}</>
  const partes = texto.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <>
      {partes.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background: 'rgba(212,160,64,0.45)', color: '#fff', borderRadius: 2, padding: '0 1px' }}>{p}</mark>
          : <span key={i}>{p}</span>
      )}
    </>
  )
}

/* Analiza prefijos tipo "de:eduardo", "asunto:reserva", "es:no_leido" */
function parsearBusqueda(raw: string): { campo: 'todos' | 'nombre' | 'email' | 'asunto' | 'cuerpo'; termino: string } {
  const lower = raw.trim().toLowerCase()
  if (lower.startsWith('de:'))      return { campo: 'nombre',  termino: raw.slice(3).trim() }
  if (lower.startsWith('email:'))   return { campo: 'email',   termino: raw.slice(6).trim() }
  if (lower.startsWith('asunto:'))  return { campo: 'asunto',  termino: raw.slice(7).trim() }
  if (lower.startsWith('texto:'))   return { campo: 'cuerpo',  termino: raw.slice(6).trim() }
  return { campo: 'todos', termino: raw.trim() }
}

export default function MensajesPage() {
  const [mensajes,      setMensajes]      = useState<Mensaje[]>([])
  const [seleccionado,  setSeleccionado]  = useState<Mensaje | null>(null)
  const [cargando,      setCargando]      = useState(true)
  const [filtro,        setFiltro]        = useState<Filtro>('todos')
  const [busquedaRaw,   setBusquedaRaw]   = useState('')
  const [busqueda,      setBusqueda]      = useState('')   // con debounce
  const [confirmElim,   setConfirmElim]   = useState<string | null>(null)
  const [buscandoFocus, setBuscandoFocus] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce 200 ms para no filtrar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(busquedaRaw), 200)
    return () => clearTimeout(t)
  }, [busquedaRaw])

  // Ctrl+K / Cmd+K abre búsqueda
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    const { data } = await supabase
      .from('mensajes_contacto')
      .select('*')
      .order('creado_en', { ascending: false })
    setMensajes(data ?? [])
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    const canal = supabase
      .channel('mensajes-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes_contacto' }, cargar)
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [cargar])

  const marcarLeido = async (id: string, leido = true) => {
    await supabase.from('mensajes_contacto').update({ leido }).eq('id', id)
    setMensajes(prev => prev.map(m => m.id === id ? { ...m, leido } : m))
    if (seleccionado?.id === id) setSeleccionado(prev => prev ? { ...prev, leido } : prev)
  }

  const marcarTodosLeidos = async () => {
    await supabase.from('mensajes_contacto').update({ leido: true }).eq('leido', false)
    setMensajes(prev => prev.map(m => ({ ...m, leido: true })))
    if (seleccionado) setSeleccionado(prev => prev ? { ...prev, leido: true } : prev)
  }

  const eliminar = async (id: string) => {
    await supabase.from('mensajes_contacto').delete().eq('id', id)
    setMensajes(prev => prev.filter(m => m.id !== id))
    if (seleccionado?.id === id) setSeleccionado(null)
    setConfirmElim(null)
  }

  const abrirMensaje = (m: Mensaje) => {
    setSeleccionado(m)
    if (!m.leido) marcarLeido(m.id)
  }

  const parseUTC = (iso: string) =>
    new Date(iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso.replace(' ', 'T') + 'Z')

  const formatFecha = (iso: string) => {
    const d = parseUTC(iso)
    const hoy = new Date()
    const mismodia = d.toDateString() === hoy.toDateString()
    const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1)
    if (mismodia) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    if (d.toDateString() === ayer.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  }

  const formatFechaCompleta = (iso: string) =>
    parseUTC(iso).toLocaleString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    })

  const noLeidos = mensajes.filter(m => !m.leido).length

  const { campo: campoBusq, termino } = useMemo(() => parsearBusqueda(busqueda), [busqueda])

  const mensajesFiltrados = useMemo(() => {
    return mensajes
      .filter(m => {
        if (filtro === 'no_leidos') return !m.leido
        if (filtro === 'leidos')    return m.leido
        return true
      })
      .filter(m => {
        if (!termino) return true
        const q = termino.toLowerCase()
        switch (campoBusq) {
          case 'nombre':  return m.nombre.toLowerCase().includes(q)
          case 'email':   return m.email.toLowerCase().includes(q)
          case 'asunto':  return (m.asunto ?? '').toLowerCase().includes(q)
          case 'cuerpo':  return m.mensaje.toLowerCase().includes(q)
          default:
            return m.nombre.toLowerCase().includes(q)
              || m.email.toLowerCase().includes(q)
              || (m.asunto ?? '').toLowerCase().includes(q)
              || m.mensaje.toLowerCase().includes(q)
        }
      })
      // Ordenar: primero los que coinciden en asunto/nombre (más relevantes)
      .sort((a, b) => {
        if (!termino || campoBusq !== 'todos') return 0
        const q = termino.toLowerCase()
        const scoreA = (a.nombre.toLowerCase().includes(q) ? 2 : 0) + ((a.asunto ?? '').toLowerCase().includes(q) ? 2 : 0)
        const scoreB = (b.nombre.toLowerCase().includes(q) ? 2 : 0) + ((b.asunto ?? '').toLowerCase().includes(q) ? 2 : 0)
        return scoreB - scoreA
      })
  }, [mensajes, filtro, termino, campoBusq])

  const FILTROS: { id: Filtro; label: string }[] = [
    { id: 'todos',     label: 'Todos' },
    { id: 'no_leidos', label: 'Sin leer' },
    { id: 'leidos',    label: 'Leídos' },
  ]

  return (
    <div className="h-full flex flex-col gap-4">

      {/* ── CABECERA ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Mensajes
              {noLeidos > 0 && (
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold"
                  style={{ background: '#ef4444', color: '#fff' }}>
                  {noLeidos}
                </span>
              )}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Formulario de contacto del restaurante
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {noLeidos > 0 && (
            <button
              onClick={marcarTodosLeidos}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#86efac', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              ✓ Marcar todos como leídos
            </button>
          )}
          <button
            onClick={cargar}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)' }}
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* ── FILTROS DE PESTAÑA ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.05)' }}>
        {FILTROS.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
            style={{
              background: filtro === f.id ? 'rgba(255,255,255,0.12)' : 'transparent',
              color:      filtro === f.id ? '#ffffff' : 'rgba(255,255,255,0.45)',
            }}
          >
            {f.label}
            {f.id === 'no_leidos' && noLeidos > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
                style={{ background: '#ef4444', color: '#fff' }}>
                {noLeidos}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── CONTENEDOR PRINCIPAL ── */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">

        {/* ── LISTA ── */}
        <div
          className="flex flex-col shrink-0 rounded-2xl overflow-hidden"
          style={{
            width: seleccionado ? '340px' : '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            transition: 'width 0.3s ease',
          }}
        >
          {/* Barra búsqueda */}
          <div className="px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
              style={{
                background: buscandoFocus ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                border: buscandoFocus ? '1px solid rgba(212,160,64,0.4)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0" style={{ color: buscandoFocus ? '#d4a040' : 'rgba(255,255,255,0.3)' }}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={busquedaRaw}
                onChange={e => setBusquedaRaw(e.target.value)}
                onFocus={() => setBuscandoFocus(true)}
                onBlur={() => setBuscandoFocus(false)}
                placeholder="Buscar… (Ctrl+K)"
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
              />
              {busquedaRaw && (
                <button
                  onClick={() => { setBusquedaRaw(''); setBusqueda(''); inputRef.current?.focus() }}
                  className="text-slate-500 hover:text-white transition-colors text-sm shrink-0"
                >✕</button>
              )}
              {!busquedaRaw && (
                <kbd className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.30)', fontFamily: 'monospace' }}>
                  Ctrl K
                </kbd>
              )}
            </div>

            {/* Chips de prefijo — solo cuando el input está vacío o enfocado */}
            {(buscandoFocus || !busquedaRaw) && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Filtrar por:</span>
                {[
                  { label: 'Nombre', prefix: 'de:' },
                  { label: 'Asunto', prefix: 'asunto:' },
                  { label: 'Texto',  prefix: 'texto:' },
                  { label: 'Email',  prefix: 'email:' },
                ].map(c => (
                  <button
                    key={c.prefix}
                    onMouseDown={e => { e.preventDefault(); setBusquedaRaw(c.prefix); inputRef.current?.focus() }}
                    className="text-[11px] px-2 py-0.5 rounded-md transition-all"
                    style={{
                      background: busquedaRaw.startsWith(c.prefix) ? 'rgba(212,160,64,0.25)' : 'rgba(255,255,255,0.07)',
                      color: busquedaRaw.startsWith(c.prefix) ? '#d4a040' : 'rgba(255,255,255,0.40)',
                      border: busquedaRaw.startsWith(c.prefix) ? '1px solid rgba(212,160,64,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {c.prefix}<span style={{ opacity: 0.6 }}>{c.label.toLowerCase()}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Contador de resultados + campo activo */}
            {termino && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
                  {campoBusq !== 'todos' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{ background: 'rgba(212,160,64,0.2)', color: '#d4a040' }}>
                      {campoBusq === 'nombre' ? 'nombre' : campoBusq === 'email' ? 'email' : campoBusq === 'asunto' ? 'asunto' : 'cuerpo'}
                    </span>
                  )}
                  <span>{mensajesFiltrados.length} resultado{mensajesFiltrados.length !== 1 ? 's' : ''}</span>
                </span>
                {mensajesFiltrados.length === 0 && (
                  <span className="text-[11px]" style={{ color: 'rgba(239,68,68,0.7)' }}>Sin coincidencias</span>
                )}
              </div>
            )}
          </div>

          {/* Lista de mensajes */}
          <div className="flex-1 overflow-y-auto">
            {cargando ? (
              <div className="flex items-center justify-center h-32 gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                <span className="text-sm text-slate-400">Cargando…</span>
              </div>
            ) : mensajesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <span className="text-3xl">📭</span>
                <p className="text-sm text-slate-500">
                  {busqueda ? 'Sin resultados para tu búsqueda' : 'No hay mensajes'}
                </p>
              </div>
            ) : (
              mensajesFiltrados.map(m => {
                const [bg, , text] = avatarColor(m.nombre)
                const esSeleccionado = seleccionado?.id === m.id
                return (
                  <div
                    key={m.id}
                    className="group relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all"
                    onClick={() => abrirMensaje(m)}
                    style={{
                      background: esSeleccionado
                        ? 'rgba(212,160,64,0.10)'
                        : !m.leido
                          ? 'rgba(239,68,68,0.05)'
                          : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      borderLeft: !m.leido ? '3px solid #ef4444' : esSeleccionado ? '3px solid #d4a040' : '3px solid transparent',
                    }}
                  >
                    {/* Avatar + punto no leído */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: bg, color: text }}>
                        {m.nombre.charAt(0).toUpperCase()}
                      </div>
                      {!m.leido && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                          style={{ background: '#ef4444', borderColor: '#0d2040' }} />
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm truncate"
                          style={{ fontWeight: m.leido ? 400 : 700, color: m.leido ? 'rgba(255,255,255,0.55)' : '#ffffff' }}>
                          <Highlight texto={m.nombre} query={campoBusq === 'nombre' || campoBusq === 'todos' ? termino : ''} />
                        </span>
                        <span className="text-[11px] shrink-0" style={{ color: 'rgba(255,255,255,0.30)' }}>
                          {formatFecha(m.creado_en)}
                        </span>
                      </div>
                      <p className="text-xs truncate mt-0.5"
                        style={{ color: m.leido ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.60)', fontWeight: m.leido ? 400 : 500 }}>
                        <Highlight texto={m.asunto || m.email} query={campoBusq === 'asunto' || campoBusq === 'todos' ? termino : ''} />
                      </p>
                      <p className="text-xs truncate mt-0.5 leading-relaxed"
                        style={{ color: 'rgba(255,255,255,0.25)' }}>
                        <Highlight texto={m.mensaje} query={campoBusq === 'cuerpo' || campoBusq === 'todos' ? termino : ''} />
                      </p>
                    </div>

                    {/* Acciones rápidas (hover) */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1"
                      onClick={e => e.stopPropagation()}>
                      <button
                        title={m.leido ? 'Marcar como no leído' : 'Marcar como leído'}
                        onClick={() => marcarLeido(m.id, !m.leido)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: 'rgba(255,255,255,0.10)' }}
                      >
                        {m.leido
                          ? <span className="text-[13px]">●</span>
                          : <span className="text-[13px]" style={{ color: '#86efac' }}>✓</span>
                        }
                      </button>
                      <button
                        title="Eliminar"
                        onClick={() => setConfirmElim(m.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── DETALLE DEL MENSAJE ── */}
        {seleccionado && (
          <div
            className="flex-1 rounded-2xl overflow-hidden flex flex-col min-w-0"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Cabecera */}
            <div className="px-6 py-4 flex items-start justify-between gap-4 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold"
                    style={{ background: avatarColor(seleccionado.nombre)[0], color: avatarColor(seleccionado.nombre)[2] }}>
                    {seleccionado.nombre.charAt(0).toUpperCase()}
                  </div>
                  {!seleccionado.leido && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                      style={{ background: '#ef4444', borderColor: '#0d2040' }} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-[15px] truncate">{seleccionado.nombre}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.40)' }}>
                    {seleccionado.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Marcar leído / no leído */}
                <button
                  onClick={() => marcarLeido(seleccionado.id, !seleccionado.leido)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: seleccionado.leido ? 'rgba(255,255,255,0.07)' : 'rgba(34,197,94,0.15)',
                    color:      seleccionado.leido ? 'rgba(255,255,255,0.5)' : '#86efac',
                    border:     seleccionado.leido ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(34,197,94,0.3)',
                  }}
                >
                  {seleccionado.leido ? '● No leído' : '✓ Marcar leído'}
                </button>

                {/* Responder — abre cliente de correo del admin (Outlook, Gmail…) */}
                <a
                  href={`mailto:${seleccionado.email}?subject=Re: ${encodeURIComponent(seleccionado.asunto ?? 'Tu mensaje en Restaurante Lempira')}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(212,160,64,0.15)', color: '#d4a040', border: '1px solid rgba(212,160,64,0.30)' }}
                >
                  ↩ Responder
                </a>

                {/* Eliminar */}
                <button
                  onClick={() => setConfirmElim(seleccionado.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.20)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Cerrar */}
                <button
                  onClick={() => setSeleccionado(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Asunto + fecha */}
            <div className="px-6 py-3 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="text-base font-semibold text-white">
                {seleccionado.asunto || '(Sin asunto)'}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.30)' }}>
                {formatFechaCompleta(seleccionado.creado_en)}
              </p>
            </div>

            {/* Cuerpo */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: 'rgba(255,255,255,0.75)' }}>
                {seleccionado.mensaje}
              </p>
            </div>

          </div>
        )}
      </div>

      {/* ── MODAL CONFIRMAR ELIMINAR ── */}
      {confirmElim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setConfirmElim(null)}
        >
          <div
            className="rounded-2xl p-6 w-80 flex flex-col gap-4"
            style={{ background: '#0d2040', border: '1px solid rgba(255,255,255,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <span className="text-3xl">🗑️</span>
              <h3 className="text-white font-semibold mt-2">¿Eliminar mensaje?</h3>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmElim(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminar(confirmElim)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.35)' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
