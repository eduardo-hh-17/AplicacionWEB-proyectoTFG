'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Ingrediente = {
  id: number
  nombre: string
  emoji: string
  activo: boolean
}

type Pedido = {
  id: number
  plato_nombre: string
  precio: number
  estado: string
  mesa: number | null
  ingredientes: Ingrediente[]
  fecha: string
}

export default function Cocina() {

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarPedidos()

    // Escucha cambios en tiempo real
    const canal = supabase
      .channel('cocina-pedidos')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pedidos'
      }, () => cargarPedidos())
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [])

  const cargarPedidos = async () => {
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('estado', 'pendiente')
      .order('fecha', { ascending: true })
    if (data) setPedidos(data)
    setCargando(false)
  }

  // Marca el pedido como completado
  const completarPedido = async (id: number) => {
    await supabase
      .from('pedidos')
      .update({ estado: 'completado' })
      .eq('id', id)
  }

  // Marca el pedido como en preparación
  const prepararPedido = async (id: number) => {
    await supabase
      .from('pedidos')
      .update({ estado: 'preparando' })
      .eq('id', id)
  }

  // Color según el estado
  const colorTarjeta = (estado: string) => {
    if (estado === 'preparando') return 'border-blue-400 bg-blue-50'
    return 'border-slate-200 bg-white'
  }

  // Tiempo desde que se hizo el pedido
  const tiempoTranscurrido = (fecha: string) => {
    const minutos = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000)
    if (minutos < 1) return 'Ahora mismo'
    if (minutos === 1) return 'Hace 1 minuto'
    return `Hace ${minutos} minutos`
  }

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Cargando pedidos...</p>
    </div>
  )

  return (
    <div>

      {/* ── CABECERA ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium text-[#0d1f3c]">Pantalla de cocina</h1>
          <p className="text-slate-400 text-sm mt-1">Los pedidos se actualizan en tiempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-slate-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block"/>
            En vivo
          </span>
          {pedidos.length > 0 && (
            <span className="bg-blue-500 text-white text-sm px-3 py-1 rounded-full font-medium">
              {pedidos.length} pendiente{pedidos.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── PEDIDOS ── */}
      {pedidos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-[#0d1f3c] text-lg font-medium mb-2">Todo al día</p>
          <p className="text-slate-400 text-sm">No hay pedidos pendientes ahora mismo</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {pedidos.map((pedido) => (
            <div
              key={pedido.id}
              className={`rounded-2xl border-2 p-5 transition-all ${colorTarjeta(pedido.estado)}`}
            >

              {/* Cabecera tarjeta */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[#0d1f3c] text-lg font-medium">{pedido.plato_nombre}</p>
                  <p className="text-slate-400 text-xs mt-1">{tiempoTranscurrido(pedido.fecha)}</p>
                </div>
                <div className="text-right">
                  {pedido.mesa && (
                    <span className="bg-[#0d1f3c] text-white text-xs px-2 py-1 rounded-lg">
                      Mesa {pedido.mesa}
                    </span>
                  )}
                </div>
              </div>

              {/* Ingredientes */}
              {pedido.ingredientes && pedido.ingredientes.length > 0 && (
                <div className="mb-4">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
                    Ingredientes
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {pedido.ingredientes.map((ing, index) => (
                      <span
                        key={index}
                        className={`text-xs px-2 py-1 rounded-lg ${
                          ing.activo
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-red-100 text-red-500 line-through'
                        }`}
                      >
                        {ing.emoji} {ing.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Estado actual */}
              <div className="mb-4">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  pedido.estado === 'preparando'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {pedido.estado === 'preparando' ? '👨‍🍳 Preparando' : '⏳ Pendiente'}
                </span>
              </div>

              {/* Botones */}
              <div className="flex flex-col gap-2">
                {pedido.estado === 'pendiente' && (
                  <button
                    onClick={() => prepararPedido(pedido.id)}
                    className="w-full bg-blue-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    👨‍🍳 Empezar a preparar
                  </button>
                )}
                <button
                  onClick={() => completarPedido(pedido.id)}
                  className="w-full bg-[#0d1f3c] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1e3a6e] transition-colors"
                >
                  ✅ Listo — entregar
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  )
}