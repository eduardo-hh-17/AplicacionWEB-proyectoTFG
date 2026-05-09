'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── TIPOS ──
type Ingrediente = {
  id: number
  nombre: string
  emoji: string
  activo: boolean
}

type Plato = {
  id: number
  nombre: string
  emoji: string
  descripcion: string
  precio: number
  ingredientes: Ingrediente[]
  activo: boolean
}

export default function Menu() {

  // ── ESTADOS ──
  const [platos, setPlatos] = useState<Plato[]>([])
  const [cargando, setCargando] = useState(true)
  const [platoSeleccionado, setPlatoSeleccionado] = useState<Plato | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(false)

  // Campos editables del modal
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [guardando, setGuardando] = useState(false)

  // ── CARGA INICIAL ──
  useEffect(() => {
    cargarPlatos()

    // Escucha cambios en tiempo real
    const canal = supabase
      .channel('platos-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platos' }, () => cargarPlatos())
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [])

  // ── FUNCIONES ──

  const cargarPlatos = async () => {
    const { data } = await supabase
      .from('platos')
      .select('*')
      .order('id')
    if (data) setPlatos(data)
    setCargando(false)
  }

  // Abre el modal con los datos del plato
  const abrirModal = (plato: Plato) => {
    setPlatoSeleccionado(plato)
    setNombre(plato.nombre)
    setDescripcion(plato.descripcion)
    setPrecio(plato.precio.toString())
    setIngredientes(
      Array.isArray(plato.ingredientes)
        ? plato.ingredientes.map(ing =>
            typeof ing === 'string'
              ? { id: 0, nombre: ing, emoji: '🍽️', activo: true }
              : ing
          )
        : []
    )
    setModalAbierto(true)
  }

  // Guarda los cambios en Supabase
  const guardarCambios = async () => {
    if (!platoSeleccionado) return
    setGuardando(true)
    await supabase
      .from('platos')
      .update({
        nombre,
        descripcion,
        precio: parseFloat(precio),
        ingredientes,
      })
      .eq('id', platoSeleccionado.id)
    setGuardando(false)
    setModalAbierto(false)
  }

  // Desactiva el plato — desaparece de la web del cliente
  const desactivarPlato = async () => {
    if (!platoSeleccionado) return
    await supabase
      .from('platos')
      .update({ activo: !platoSeleccionado.activo })
      .eq('id', platoSeleccionado.id)
    setModalAbierto(false)
  }

  // Elimina el plato — pregunta confirmación primero
  const eliminarPlato = async () => {
    if (!platoSeleccionado) return
    await supabase
      .from('platos')
      .delete()
      .eq('id', platoSeleccionado.id)
    setModalEliminar(false)
    setModalAbierto(false)
  }

  // Envía el plato a cocina — crea un pedido en Supabase
  const enviarACocina = async () => {
    if (!platoSeleccionado) return
    await supabase
      .from('pedidos')
      .insert({
        plato_nombre: platoSeleccionado.nombre,
        plato_id: platoSeleccionado.id,
        precio: platoSeleccionado.precio,
        ingredientes,
        estado: 'pendiente',
        fecha: new Date().toISOString(),
      })
    setModalAbierto(false)
  }

  // Activa o desactiva un ingrediente
  const toggleIngrediente = (index: number) => {
    setIngredientes(ingredientes.map((ing, i) =>
      i === index ? { ...ing, activo: !ing.activo } : ing
    ))
  }

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Cargando menú...</p>
    </div>
  )

  return (
    <div>

      {/* ── CABECERA ── */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-medium text-[#0d1f3c]">Menú</h1>
        <span className="text-slate-400 text-sm">{platos.length} platos</span>
      </div>

      {/* ── GRID DE PLATOS ── */}
      <div className="grid grid-cols-4 gap-4">
        {platos.map((plato) => (
          <button
            key={plato.id}
            onClick={() => abrirModal(plato)}
            className={`bg-white rounded-2xl border text-left overflow-hidden hover:shadow-md transition-all ${plato.activo ? 'border-slate-200' : 'border-red-200 opacity-60'}`}
          >
            {/* Imagen / Emoji */}
            <div className="h-24 bg-[#f8faff] flex items-center justify-center text-5xl border-b border-slate-100">
              {plato.emoji}
            </div>

            {/* Info */}
            <div className="p-4">
              <p className="text-[#0d1f3c] text-sm font-medium mb-1">{plato.nombre}</p>
              <p className="text-slate-400 text-xs mb-3 line-clamp-2 leading-relaxed">{plato.descripcion}</p>
              <div className="flex items-center justify-between">
                <span className="text-blue-600 text-sm font-medium">{plato.precio.toFixed(2)}€</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${plato.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                  {plato.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── MODAL EDICIÓN ── */}
      {modalAbierto && platoSeleccionado && (
        <div
          onClick={() => setModalAbierto(false)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-[560px] overflow-hidden shadow-2xl"
          >

            {/* Cabecera modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-[#0d1f3c] font-medium">
                {platoSeleccionado.emoji} {platoSeleccionado.nombre}
              </h2>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Cuerpo modal — dos columnas */}
            <div className="grid grid-cols-2 gap-0">

              {/* Columna izquierda — campos editables */}
              <div className="p-6 border-r border-slate-200 flex flex-col gap-4">
                <p className="text-[#0d1f3c] text-sm font-medium">Editar plato</p>

                <div>
                  <label className="text-slate-400 text-xs block mb-1">Nombre</label>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#0d1f3c] outline-none focus:border-blue-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs block mb-1">Descripción</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#0d1f3c] outline-none focus:border-blue-400 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs block mb-1">Precio (€)</label>
                  <input
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    type="number"
                    step="0.01"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#0d1f3c] outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              {/* Columna derecha — ingredientes */}
              <div className="p-6 flex flex-col gap-3">
                <p className="text-[#0d1f3c] text-sm font-medium">Ingredientes</p>
                {ingredientes.length === 0 ? (
                  <p className="text-slate-400 text-xs">Sin ingredientes</p>
                ) : (
                  ingredientes.map((ing, index) => (
                    <div
                      key={index}
                      onClick={() => toggleIngrediente(index)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all
                        ${ing.activo
                          ? 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                          : 'border-red-200 bg-red-50'
                        }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                        ${ing.activo ? 'bg-[#0d1f3c] border-[#0d1f3c] text-white' : 'bg-white border-slate-300'}`}
                      >
                        {ing.activo && <span className="text-[10px]">✓</span>}
                      </div>
                      <span className="text-base">{ing.emoji}</span>
                      <span className={`text-xs flex-1 ${ing.activo ? 'text-[#0d1f3c]' : 'text-red-400 line-through'}`}>
                        {ing.nombre}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pie modal — botones */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-2">

              {/* Guardar */}
              <button
                onClick={guardarCambios}
                disabled={guardando}
                className="flex-1 bg-[#0d1f3c] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1e3a6e] transition-colors disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : '💾 Guardar cambios'}
              </button>

              {/* Enviar a cocina */}
              <button
                onClick={enviarACocina}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
              >
                🍳 Enviar a cocina
              </button>

              {/* Desactivar */}
              <button
                onClick={desactivarPlato}
                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                🚫
              </button>

              {/* Eliminar */}
              <button
                onClick={() => setModalEliminar(true)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
              >
                🗑️
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAR ELIMINAR ── */}
      {modalEliminar && (
        <div
          onClick={() => setModalEliminar(false)}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-80 p-6 shadow-2xl"
          >
            <div className="text-center mb-6">
              <p className="text-4xl mb-3">🗑️</p>
              <h3 className="text-[#0d1f3c] font-medium text-base mb-2">¿Eliminar plato?</h3>
              <p className="text-slate-400 text-sm">
                Vas a eliminar <strong>{platoSeleccionado?.nombre}</strong> de la base de datos. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={eliminarPlato}
                className="w-full bg-red-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => setModalEliminar(false)}
                className="w-full border border-slate-200 text-slate-500 py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}