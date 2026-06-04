'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Factura = {
  id: number
  sesion_id: string
  mesa_numero: number
  personas: number
  pedidos: any[]
  total: number
  tiempo_minutos: number
  creada_en: string
  pagada: boolean | null
  estado: string | null
}

const ESTADO_CFG = {
  pagada:    { label: 'Pagada',    bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.40)',  color: '#86efac' },
  pendiente: { label: 'Pendiente', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.40)', color: '#fbbf24' },
}

const estadoOf = (f: Factura) => (f.estado === 'pagada' || f.pagada) ? 'pagada' : 'pendiente'

export default function Facturas() {
  const [facturas, setFacturas]       = useState<Factura[]>([])
  const [cargando, setCargando]       = useState(true)
  const [expandida, setExpandida]     = useState<number | null>(null)
  const [filtro, setFiltro]           = useState<'todas' | 'pagada' | 'pendiente'>('todas')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    const { data } = await supabase
      .from('facturas')
      .select('*')
      .order('creada_en', { ascending: false })
    if (data) setFacturas(data as Factura[])
    setCargando(false)
  }

  const filtradas = facturas.filter(f =>
    filtro === 'todas' ? true : estadoOf(f) === filtro
  )

  const totalGlobal = facturas
    .filter(f => estadoOf(f) === 'pagada')
    .reduce((s, f) => s + (f.total || 0), 0)

  const formatFecha = (iso: string) => {
    const d = new Date(iso)
    return {
      fecha: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
      hora:  d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    }
  }

  const estadoPedidoCfg = (estado: string) => {
    if (estado === 'entregado') return { color: '#86efac', label: 'Entregado' }
    if (estado === 'cancelado') return { color: '#ef4444', label: 'Cancelado' }
    if (estado === 'listo')     return { color: '#a3e635', label: 'Listo' }
    return { color: '#fbbf24', label: 'Pendiente' }
  }

  return (
    <div className="space-y-6">
      {/* ── CABECERA ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gradient-anim">Facturas</h1>
          <p className="text-slate-400 text-sm mt-0.5">Historial de cuentas cobradas y pendientes</p>
        </div>

        {/* Resumen rápido */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.30)' }}>
            <span className="text-slate-400 text-xs block">Total cobrado</span>
            <span className="font-black text-lg" style={{ color: '#d4a040' }}>{totalGlobal.toFixed(2)}€</span>
          </div>
          <div className="px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <span className="text-slate-400 text-xs block">Facturas</span>
            <span className="font-black text-lg text-white">{facturas.length}</span>
          </div>
        </div>
      </div>

      {/* ── FILTROS ── */}
      <div className="flex gap-2">
        {(['todas', 'pagada', 'pendiente'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
            style={filtro === f
              ? { background: 'rgba(45,138,68,0.22)', color: '#fff', border: '1px solid rgba(45,138,68,0.45)' }
              : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.50)', border: '1px solid rgba(255,255,255,0.08)' }
            }>
            {f === 'todas' ? 'Todas' : f === 'pagada' ? '✓ Pagadas' : '⏳ Pendientes'}
          </button>
        ))}
      </div>

      {/* ── LISTA ── */}
      {cargando ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-slate-400 text-sm animate-pulse">Cargando facturas...</p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-white font-medium">No hay facturas</p>
          <p className="text-slate-400 text-sm mt-1">Aún no se ha cerrado ninguna cuenta</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map((f) => {
            const { fecha, hora } = formatFecha(f.creada_en)
            const est = estadoOf(f)
            const cfg = ESTADO_CFG[est]
            const abierta = expandida === f.id
            const pedidosValidos = (f.pedidos || []).filter((p: any) => p.estado !== 'cancelado')

            return (
              <div key={f.id}
                className="rounded-2xl overflow-hidden transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

                {/* Fila principal — clic para expandir */}
                <button
                  onClick={() => setExpandida(abierta ? null : f.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/5 transition-colors"
                >
                  {/* Icono mesa */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-base"
                    style={{ background: 'rgba(212,160,64,0.15)', color: '#d4a040', border: '1px solid rgba(212,160,64,0.30)' }}>
                    {f.mesa_numero}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm">Mesa {f.mesa_numero}</span>
                      <span className="text-slate-400 text-xs">·</span>
                      <span className="text-slate-400 text-xs">{f.personas} pers.</span>
                      <span className="text-slate-400 text-xs">·</span>
                      <span className="text-slate-400 text-xs">{fecha} — {hora}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                        {cfg.label}
                      </span>
                      {f.tiempo_minutos > 0 && (
                        <span className="text-xs" style={{ color: '#475569' }}>{f.tiempo_minutos} min</span>
                      )}
                    </div>
                  </div>

                  {/* Total + chevron */}
                  <div className="text-right shrink-0">
                    <p className="font-black text-lg" style={{ color: '#d4a040' }}>{(f.total || 0).toFixed(2)}€</p>
                    <p className="text-xs" style={{ color: '#475569' }}>{pedidosValidos.length} plato{pedidosValidos.length !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-slate-500 text-lg transition-transform duration-200 shrink-0"
                    style={{ transform: abierta ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ›
                  </span>
                </button>

                {/* Detalle expandible */}
                {abierta && (
                  <div className="px-5 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mt-3 mb-2" style={{ color: '#475569' }}>
                      Detalle de pedidos
                    </p>
                    <div className="space-y-1.5">
                      {(f.pedidos || []).length === 0 ? (
                        <p className="text-sm text-slate-400">Sin pedidos registrados</p>
                      ) : (
                        (f.pedidos || []).map((p: any, i: number) => {
                          const pc = estadoPedidoCfg(p.estado)
                          const ph = p.creado_en
                            ? new Date(p.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                            : '—'
                          return (
                            <div key={i}
                              className="flex items-center gap-3 px-3 py-2 rounded-xl"
                              style={{
                                background: p.estado === 'cancelado' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${p.estado === 'cancelado' ? 'rgba(239,68,68,0.20)' : 'rgba(255,255,255,0.06)'}`,
                                opacity: p.estado === 'cancelado' ? 0.65 : 1,
                              }}>
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pc.color }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate"
                                  style={{ color: p.estado === 'cancelado' ? '#ef4444' : '#e2e8f0',
                                           textDecoration: p.estado === 'cancelado' ? 'line-through' : 'none' }}>
                                  {p.plato_nombre}
                                </p>
                                <p className="text-[11px]" style={{ color: '#475569' }}>
                                  {ph}
                                  <span className="ml-2 font-semibold" style={{ color: pc.color }}>{pc.label}</span>
                                </p>
                              </div>
                              <span className="font-bold text-sm shrink-0"
                                style={{ color: p.estado === 'cancelado' ? '#ef4444' : '#d4a040',
                                         textDecoration: p.estado === 'cancelado' ? 'line-through' : 'none' }}>
                                {p.precio}€
                              </span>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Subtotal del detalle */}
                    <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="text-sm font-semibold text-white">Total factura</span>
                      <span className="font-black text-xl" style={{ color: '#d4a040' }}>{(f.total || 0).toFixed(2)}€</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── TOTAL GLOBAL ── */}
      {facturas.length > 0 && (
        <div className="rounded-2xl px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg,rgba(212,160,64,0.12),rgba(196,122,40,0.08))', border: '1px solid rgba(212,160,64,0.28)' }}>
          <div>
            <p className="text-sm font-semibold text-white">Total cobrado</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
              {facturas.filter(f => estadoOf(f) === 'pagada').length} facturas pagadas
              {facturas.filter(f => estadoOf(f) === 'pendiente').length > 0 &&
                ` · ${facturas.filter(f => estadoOf(f) === 'pendiente').length} pendientes`}
            </p>
          </div>
          <span className="font-black text-3xl" style={{ color: '#d4a040' }}>{totalGlobal.toFixed(2)}€</span>
        </div>
      )}
    </div>
  )
}
