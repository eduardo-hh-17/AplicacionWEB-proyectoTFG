'use client'

import { useEffect, useState, useCallback } from 'react'
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

export default function MensajesPage() {
  const [mensajes,         setMensajes]         = useState<Mensaje[]>([])
  const [seleccionado,     setSeleccionado]     = useState<Mensaje | null>(null)
  const [cargando,         setCargando]         = useState(true)
  const [filtro,           setFiltro]           = useState<'todos' | 'no_leidos'>('todos')
  const [busqueda,         setBusqueda]         = useState('')

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

  // Realtime: nuevos mensajes aparecen automáticamente
  useEffect(() => {
    const canal = supabase
      .channel('mensajes-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes_contacto' }, cargar)
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [cargar])

  const marcarLeido = async (id: string) => {
    await supabase.from('mensajes_contacto').update({ leido: true }).eq('id', id)
    setMensajes(prev => prev.map(m => m.id === id ? { ...m, leido: true } : m))
    if (seleccionado?.id === id) setSeleccionado(prev => prev ? { ...prev, leido: true } : prev)
  }

  const eliminar = async (id: string) => {
    await supabase.from('mensajes_contacto').delete().eq('id', id)
    setMensajes(prev => prev.filter(m => m.id !== id))
    if (seleccionado?.id === id) setSeleccionado(null)
  }

  const abrirMensaje = async (m: Mensaje) => {
    setSeleccionado(m)
    if (!m.leido) marcarLeido(m.id)
  }

  const formatFecha = (iso: string) => {
    const d = new Date(iso)
    const hoy = new Date()
    const mismodia = d.toDateString() === hoy.toDateString()
    if (mismodia) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  }

  const formatFechaCompleta = (iso: string) =>
    new Date(iso).toLocaleString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    })

  const mensajesFiltrados = mensajes
    .filter(m => filtro === 'todos' || !m.leido)
    .filter(m => {
      if (!busqueda.trim()) return true
      const q = busqueda.toLowerCase()
      return m.nombre.toLowerCase().includes(q)
        || m.email.toLowerCase().includes(q)
        || (m.asunto ?? '').toLowerCase().includes(q)
        || m.mensaje.toLowerCase().includes(q)
    })

  const noLeidos = mensajes.filter(m => !m.leido).length

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Mensajes</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Formulario de contacto del restaurante
          </p>
        </div>
        <div className="flex items-center gap-2">
          {noLeidos > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(212,160,64,0.2)', color: '#d4a040' }}>
              {noLeidos} sin leer
            </span>
          )}
          <button
            onClick={cargar}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* Contenedor principal — dos columnas */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">

        {/* ── LISTA DE MENSAJES ── */}
        <div
          className="flex flex-col shrink-0 rounded-2xl overflow-hidden"
          style={{
            width: seleccionado ? '340px' : '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            transition: 'width 0.3s ease',
          }}
        >
          {/* Barra superior de la lista */}
          <div className="px-4 py-3 flex items-center gap-3 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Búsqueda */}
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar…"
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
            />
            {/* Filtro leídos */}
            <button
              onClick={() => setFiltro(f => f === 'todos' ? 'no_leidos' : 'todos')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0"
              style={{
                background: filtro === 'no_leidos' ? 'rgba(212,160,64,0.2)' : 'rgba(255,255,255,0.06)',
                color:      filtro === 'no_leidos' ? '#d4a040' : 'rgba(255,255,255,0.5)',
              }}
            >
              {filtro === 'no_leidos' ? '● Sin leer' : 'Todos'}
            </button>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {cargando ? (
              <div className="flex items-center justify-center h-32 gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                <span className="text-sm text-slate-400">Cargando…</span>
              </div>
            ) : mensajesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <span className="text-3xl">📭</span>
                <p className="text-sm text-slate-500">No hay mensajes</p>
              </div>
            ) : (
              mensajesFiltrados.map(m => (
                <button
                  key={m.id}
                  onClick={() => abrirMensaje(m)}
                  className="w-full text-left px-4 py-3.5 flex items-start gap-3 transition-all"
                  style={{
                    background: seleccionado?.id === m.id
                      ? 'rgba(212,160,64,0.12)'
                      : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    borderLeft: !m.leido ? '3px solid #d4a040' : '3px solid transparent',
                  }}
                >
                  {/* Avatar inicial */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg,#1a4a2e,#2d8a44)', color: '#9adab4' }}>
                    {m.nombre.charAt(0).toUpperCase()}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate"
                        style={{ color: m.leido ? 'rgba(255,255,255,0.6)' : '#ffffff' }}>
                        {m.nombre}
                      </span>
                      <span className="text-[11px] shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {formatFecha(m.creado_en)}
                      </span>
                    </div>
                    <p className="text-xs truncate mt-0.5"
                      style={{ color: m.leido ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)' }}>
                      {m.asunto || m.email}
                    </p>
                    <p className="text-xs truncate mt-0.5 leading-relaxed"
                      style={{ color: 'rgba(255,255,255,0.30)' }}>
                      {m.mensaje}
                    </p>
                  </div>
                </button>
              ))
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
            {/* Cabecera del mensaje */}
            <div className="px-6 py-4 flex items-start justify-between gap-4 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg,#1a4a2e,#2d8a44)', color: '#9adab4' }}>
                  {seleccionado.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-[15px] truncate">{seleccionado.nombre}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {seleccionado.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Botón responder via mailto */}
                <a
                  href={`mailto:${seleccionado.email}?subject=Re: ${encodeURIComponent(seleccionado.asunto ?? 'Tu mensaje en Restaurante Lempira')}`}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{ background: 'rgba(212,160,64,0.2)', color: '#d4a040', border: '1px solid rgba(212,160,64,0.35)' }}
                >
                  ↩ Responder
                </a>
                {/* Botón eliminar */}
                <button
                  onClick={() => eliminar(seleccionado.id)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  🗑
                </button>
                {/* Cerrar */}
                <button
                  onClick={() => setSeleccionado(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 transition-all hover:text-white"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
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
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {formatFechaCompleta(seleccionado.creado_en)}
              </p>
            </div>

            {/* Cuerpo del mensaje */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: 'rgba(255,255,255,0.75)' }}>
                {seleccionado.mensaje}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
