'use client'

import { useState, useEffect } from 'react'
import { supabase} from '@/lib/supabase'

// Conexión a Supabase


// Tipos — como clases en Java
type Mesa = {
  id: number
  numero: number
  capacidad: number
  estado: 'libre' | 'ocupada' | 'esperando'
  personas: number
}

type Pedido = {
  id: number
  plato_nombre: string
  precio: number
  estado: string
  mesa: number | null
  ingredientes: any[]
  fecha: string
}

export default function Pedidos() {

  // Estados — como variables de instancia en Java
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [mesaSeleccionada, setMesaSeleccionada] = useState<Mesa | null>(null)
  const [modalMesa, setModalMesa] = useState(false)
  const [personas, setPersonas] = useState(0)
  const [cargando, setCargando] = useState(true)

  // Carga inicial — como el constructor en Java
  useEffect(() => {
    cargarMesas()
    cargarPedidos()

    // Suscripción en tiempo real — escucha cambios en la base de datos
    const canal = supabase
      .channel('cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => cargarMesas())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => cargarPedidos())
      .subscribe()

    // Limpia la suscripción cuando el componente se desmonta
    return () => { supabase.removeChannel(canal) }
  }, [])

  // Carga las mesas desde Supabase
  const cargarMesas = async () => {
    const { data } = await supabase
      .from('mesas')
      .select('*')
      .order('numero')
    if (data) setMesas(data)
    setCargando(false)
  }

  // Carga los pedidos desde Supabase
  const cargarPedidos = async () => {
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('estado', ['listo', 'preparando'])
      .order('fecha', { ascending: false })
    if (data) setPedidos(data)
  }

  // Abre el modal de una mesa
  const abrirMesa = (mesa: Mesa) => {
    setMesaSeleccionada(mesa)
    setPersonas(mesa.personas || 1)
    setModalMesa(true)
  }

  // Activa una mesa — la pone como ocupada
  const activarMesa = async () => {
    if (!mesaSeleccionada) return

    const sesionId = crypto.randomUUID()

    // 1. Crea la sesión en la tabla sesiones
    await supabase
      .from('sesiones')
      .insert([{
        id: sesionId,
        mesa_id: mesaSeleccionada.id,
        mesa_numero: mesaSeleccionada.numero,
        personas: personas,
        iniciada_en: new Date().toISOString(),
        estado: 'activa'
      }])

    // 2. Actualiza la mesa con el nuevo sesion_id
    await supabase
      .from('mesas')
      .update({ estado: 'ocupada', personas, sesion_id: sesionId })
      .eq('id', mesaSeleccionada.id)

    setModalMesa(false)
  }

  // Libera una mesa — la pone como libre
  const liberarMesa = async () => {
    if (!mesaSeleccionada) return

    // 1. Obtener la sesión activa de la mesa
    const { data: mesa } = await supabase
      .from('mesas')
      .select('sesion_id')
      .eq('id', mesaSeleccionada.id)
      .single()

    if (mesa?.sesion_id) {
      // 2. Obtener todos los pedidos de esa sesión
      const { data: pedidosSesion } = await supabase
        .from('pedidos')
        .select('*')
        .eq('sesion_id', mesa.sesion_id)

      // 3. Calcular total y tiempo
      const total = pedidosSesion?.reduce((sum, p) => sum + (p.precio || 0), 0) || 0

      const { data: sesion } = await supabase
        .from('sesiones')
        .select('iniciada_en')
        .eq('id', mesa.sesion_id)
        .single()

      const tiempoMinutos = sesion
        ? Math.floor((Date.now() - new Date(sesion.iniciada_en).getTime()) / 60000)
        : 0

      // 4. Guardar factura
      await supabase.from('facturas').insert([{
        sesion_id: mesa.sesion_id,
        mesa_numero: mesaSeleccionada.numero,
        personas: mesaSeleccionada.personas,
        pedidos: pedidosSesion,
        total,
        tiempo_minutos: tiempoMinutos,
        creada_en: new Date().toISOString()
      }])

      // 5. Cerrar sesión
      await supabase
        .from('sesiones')
        .update({ estado: 'cerrada', cerrada_en: new Date().toISOString(), total })
        .eq('id', mesa.sesion_id)
    }

    // 6. Liberar la mesa
    await supabase
      .from('mesas')
      .update({ estado: 'libre', personas: 0, sesion_id: null })
      .eq('id', mesaSeleccionada.id)

    setModalMesa(false)
  }

  // Marca un pedido como completado
  const entregarPedido = async (id: number) => {
    await supabase
      .from('pedidos')
      .update({ 
        estado: 'entregado',
        completado_en: new Date().toISOString()
      })
      .eq('id', id)
  }

  // Color según el estado de la mesa
  const colorMesa = (estado: string) => {
    if (estado === 'ocupada') return 'bg-blue-50 border-blue-300'
    if (estado === 'esperando') return 'bg-orange-50 border-orange-300'
    return 'bg-white border-slate-200'
  }

  const colorBadge = (estado: string) => {
    if (estado === 'ocupada') return 'bg-blue-100 text-blue-700'
    if (estado === 'esperando') return 'bg-orange-100 text-orange-700'
    return 'bg-slate-100 text-slate-500'
  }

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Cargando...</p>
    </div>
  )

    return (
    <div className="flex gap-8 h-[calc(100vh-120px)]">
        {/* ── COLUMNA IZQUIERDA — MESAS (FIJAS, SIN SCROLL INTERNO) ── */}
        <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-medium text-[#0d1f3c]">Mesas</h1>
            <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-300 inline-block"/> Libre</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block"/> Ocupada</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block"/> Esperando</span>
            </div>
        </div>

        {/* Grid de mesas (sin altura fija, fluye normalmente) */}
        <div className="grid grid-cols-4 gap-4">
            {mesas.map((mesa) => (
            <button
                key={mesa.id}
                onClick={() => abrirMesa(mesa)}
                className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md ${colorMesa(mesa.estado)}`}
            >
                <div className="flex items-center justify-between mb-3">
                <span className="text-[#0d1f3c] font-medium text-sm">Mesa {mesa.numero}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colorBadge(mesa.estado)}`}>
                    {mesa.estado}
                </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                <span>👥 {mesa.personas}/{mesa.capacidad}</span>
                </div>
            </button>
            ))}
        </div>
        </div>

        {/* ── COLUMNA DERECHA — PEDIDOS PENDIENTES (CON SCROLL INDEPENDIENTE) ── */}
        <div className="w-80 flex-shrink-0 flex flex-col h-full">
        <h2 className="text-xl font-medium text-[#0d1f3c] mb-6 flex-shrink-0">
          🍽️ Listos para entregar
          {pedidos.length > 0 && (
            <span className="ml-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
              {pedidos.length}
            </span>
          )}
        </h2>

        {/* Scroll SOLO para pedidos */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {pedidos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-slate-400 text-sm">No hay pedidos pendientes</p>
            </div>
            ) : (
            pedidos.map((pedido) => (
            <div key={pedido.id} className={`rounded-2xl border p-4 transition-all ${
              pedido.estado === 'listo' 
                ? 'bg-white border-green-300' 
                : 'bg-slate-50 border-slate-200 opacity-60'  // ← gris si está preparando
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[#0d1f3c] text-sm font-medium">{pedido.plato_nombre}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {pedido.mesa ? `Mesa ${pedido.mesa}` : 'Sin mesa'}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                    pedido.estado === 'listo' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {pedido.estado === 'listo' ? '✅ Listo' : '👨‍🍳 Preparando'}
                  </span>
                </div>
                <p className="text-blue-600 text-sm font-medium">{pedido.precio}€</p>
              </div>

              {/* Ingredientes */}
              {pedido.ingredientes && pedido.ingredientes.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {pedido.ingredientes.map((ing: any, i: number) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${
                      ing.activo ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-500 line-through'
                    }`}>
                      {ing.emoji} {ing.nombre}
                    </span>
                  ))}
                </div>
              )}

              {/* Botón solo visible si está listo */}
              {pedido.estado === 'listo' && (
                <button
                  onClick={() => entregarPedido(pedido.id)}
                  className="w-full bg-green-600 text-white py-2 rounded-xl text-xs font-medium hover:bg-green-700 transition-colors"
                >
                  🛎️ Marcar como entregado
                </button>
              )}

              {pedido.estado === 'preparando' && (
                <p className="text-center text-xs text-slate-400 py-2">
                  ⏳ Esperando que cocina termine...
                </p>
              )}
            </div>
            ))
            )}
        </div>
        </div>

        {/* ── MODAL MESA (sin cambios) ── */}
        {modalMesa && mesaSeleccionada && (
        <div
            onClick={() => setModalMesa(false)}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
            <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-80 overflow-hidden shadow-2xl"
            >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h2 className="text-[#0d1f3c] font-medium">Mesa {mesaSeleccionada.numero}</h2>
                <button onClick={() => setModalMesa(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                <span className="text-slate-400 text-sm">Estado:</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorBadge(mesaSeleccionada.estado)}`}>
                    {mesaSeleccionada.estado}
                </span>
                </div>

                <div className="mb-6">
                <p className="text-[#0d1f3c] text-sm font-medium mb-3">Número de personas</p>
                <div className="flex items-center gap-4">
                    <button
                    onClick={() => setPersonas(Math.max(1, personas - 1))}
                    className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-[#0d1f3c] hover:bg-slate-50 transition-colors text-lg"
                    >
                    −
                    </button>
                    <span className="text-[#0d1f3c] text-2xl font-medium w-8 text-center">{personas}</span>
                    <button
                    onClick={() => setPersonas(Math.min(mesaSeleccionada.capacidad, personas + 1))}
                    className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-[#0d1f3c] hover:bg-slate-50 transition-colors text-lg"
                    >
                    +
                    </button>
                    <span className="text-slate-400 text-xs">máx. {mesaSeleccionada.capacidad}</span>
                </div>
                </div>

                <div className="flex flex-col gap-2">
                {mesaSeleccionada.estado === 'libre' ? (
                    <button
                    onClick={activarMesa}
                    className="w-full bg-[#0d1f3c] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#1e3a6e] transition-colors"
                    >
                    ✓ Activar mesa
                    </button>
                ) : (
                    <button
                    onClick={liberarMesa}
                    className="w-full bg-red-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                    Liberar mesa
                    </button>
                )}
                <button
                    onClick={() => setModalMesa(false)}
                    className="w-full border border-slate-200 text-slate-500 py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors"
                >
                    Cancelar
                </button>
                </div>
            </div>
            </div>
        </div>
        )}
    </div>
    )
}