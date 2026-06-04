'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ToastContainer, { useAdminToast } from '@/components/ui/Toast'

type Ingrediente = {
  id: number
  nombre: string
  imagen_url: string | null
  activo: boolean
}

type Pedido = {
  id: number
  plato_nombre: string
  precio: number
  estado: string
  mesa_id: number | null
  ingredientes: Ingrediente[]
  creado_en: string
  notas: string | null
}

export default function Cocina() {
  const { toast } = useAdminToast()

  type ConfirmState = { abierto: boolean; titulo: string; mensaje?: string; onAceptar: () => void }
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({ abierto: false, titulo: '', onAceptar: () => {} })
  const confirmar = (cfg: Omit<ConfirmState, 'abierto'>) => setConfirmModal({ ...cfg, abierto: true })
  const cerrarConfirm = () => setConfirmModal(s => ({ ...s, abierto: false }))

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)
  const [ahora, setAhora] = useState(new Date().getTime())

useEffect(() => {
  const intervalo = setInterval(() => setAhora(new Date().getTime()), 60000)
  return () => clearInterval(intervalo)
}, [])

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
      .in('estado', ['listo','pendiente'])
      .order('creado_en', { ascending: true })
    if (data) setPedidos(data)
    setCargando(false)
  }

  // Marca el pedido como completado
  const completarPedido = async (id: number) => {
    await supabase
      .from('pedidos')
      .update({ estado: 'listo' })
      .eq('id', id)
  }

  // Marca el pedido como en preparación
  const prepararPedido = async (id: number) => {
    await supabase
      .from('pedidos')
      .update({ estado: 'preparando' })
      .eq('id', id)
  }

  // Cancela el pedido (visible para cliente y admin como cancelado)
  const cancelarPedido = (id: number, nombre: string) => {
    confirmar({
      titulo: `¿Cancelar "${nombre}"?`,
      mensaje: 'El pedido se marcará como cancelado y será visible para el cliente.',
      onAceptar: async () => {
        cerrarConfirm()
        await supabase.from('pedidos').update({ estado: 'cancelado' }).eq('id', id)
        toast(`Pedido "${nombre}" cancelado`, 'info')
      }
    })
  }

  // Color según el estado
  const colorTarjeta = (estado: string) => {
    if (estado === 'preparando') return 'border-blue-400 bg-blue-50'
    if (estado === 'listo') return 'border-green-400 bg-green-50'
    return 'border-slate-200 bg-white'
  }

  // Tiempo desde que se hizo el pedido
  const tiempoTranscurrido = (fecha: string) => {
    const fechaUTC = fecha.endsWith('Z') ? fecha : fecha + 'Z'
    const minutos = Math.floor((Date.now() - new Date(fechaUTC).getTime()) / 60000)
    if (minutos < 1) return 'Ahora mismo'
    if (minutos < 60) return `Hace ${minutos} min`
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return `${horas}h ${mins}min`
  }

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Cargando pedidos...</p>
    </div>
  )

  return (
    <div>
      <ToastContainer />
      <ConfirmModal
        abierto={confirmModal.abierto}
        titulo={confirmModal.titulo}
        mensaje={confirmModal.mensaje}
        variante="warning"
        textoAceptar="Cancelar pedido"
        textoCancelar="Volver"
        onAceptar={confirmModal.onAceptar}
        onCancelar={cerrarConfirm}
      />

      {/* ── PEDIDOS ── */}
      {pedidos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-white text-lg font-medium mb-2">Todo al día</p>
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
                  <p className="text-white text-lg font-medium">{pedido.plato_nombre}</p>
                  <p className="text-slate-400 text-xs mt-1">{tiempoTranscurrido(pedido.creado_en)}</p>
                </div>
                <div className="text-right">
                  {pedido.mesa_id && (
                    <span className="bg-[#0d1f3c] text-white text-xs px-2 py-1 rounded-lg">
                      Mesa {pedido.mesa_id}
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
                        {ing.imagen_url && (
                            <img src={ing.imagen_url} alt="" className="w-6 h-6 rounded object-cover inline mr-1" />
                        )}
                        {ing.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas del cliente */}
              {pedido.notas && (
                <div className="mb-4 px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.35)', color: '#854d0e' }}>
                  💬 <span className="font-semibold">Nota:</span> {pedido.notas}
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
                <button
                  onClick={() => completarPedido(pedido.id)}
                  className="w-full bg-[#1e5c2e] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#2d8a44] transition-colors"
                >
                  ✅ Listo — entregar
                </button>
                <button
                  onClick={() => cancelarPedido(pedido.id, pedido.plato_nombre)}
                  className="w-full py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5' }}
                >
                  ✕ Cancelar pedido
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  )
}