'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/cliente/Toast'
import Image from 'next/image'

function CarruselImagenes({ imagenes, nombre, emoji }: { imagenes: string[]; nombre: string; emoji?: string }) {
  const [indice, setIndice] = useState(0)

  if (imagenes.length === 0) {
    return (
      <div className="relative w-full max-w-[220px] aspect-square rounded-2xl overflow-hidden shadow mb-4 bg-white flex items-center justify-center">
        <span className="text-6xl">{emoji || '🍽️'}</span>
      </div>
    )
  }

  const anterior = () => setIndice(i => (i === 0 ? imagenes.length - 1 : i - 1))
  const siguiente = () => setIndice(i => (i === imagenes.length - 1 ? 0 : i + 1))

  return (
    <div className="relative w-full max-w-[220px] aspect-square rounded-2xl overflow-hidden shadow mb-4">
      <Image
        src={imagenes[indice]}
        alt={`${nombre} ${indice + 1}`}
        fill
        className="object-cover"
        sizes="220px"
      />
      {imagenes.length > 1 && (
        <>
          <button type="button" onClick={anterior} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 text-lg">‹</button>
          <button type="button" onClick={siguiente} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 text-lg">›</button>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            {indice + 1} / {imagenes.length}
          </span>
        </>
      )}
    </div>
  )
}

export default function PanelMenu({ tokenActivo, mesaActiva, sesionActiva, mesaNoActivada }: { 
  tokenActivo: string | null
  mesaActiva: number | null
  sesionActiva: string | null
  mesaNoActivada: boolean
}) {
  const [platos, setPlatos] = useState<any[]>([])
  const [carrito, setCarrito] = useState<any[]>([])
  const [modalAbierto, setModalAbierto] = useState(false)
  const [platoSeleccionado, setPlatoSeleccionado] = useState<any>(null)
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  const { toasts, showToast, removeToast } = useToast()

  // 👇 AÑADE ESTO después de los otros useState
  const [mesaEstado, setMesaEstado] = useState<string | null>(null)
  const [misPedidos, setMisPedidos] = useState<any[]>([])
  const [totalGastado, setTotalGastado] = useState(0)

  // Cargar platos desde Supabase
  useEffect(() => {
    cargarPlatos()

    // Escucha cambios en tiempo real
    const canal = supabase
      .channel('platos-cliente')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'platos'
      }, () => cargarPlatos())
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [])

  // 👇 AÑADE ESTO después del useEffect que carga platos
// Consultar estado de la mesa en Supabase
useEffect(() => {
    if (mesaActiva) {
      supabase
        .from('mesas')
        .select('estado')
        .eq('numero', mesaActiva)
        .single()
        .then(({ data }) => setMesaEstado(data?.estado || null))
    } else {
      setMesaEstado(null)
  }
}, [mesaActiva])

const cargarPlatos = async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('platos')
        .select('*')
        .eq('activo', true)
        .order('id', { ascending: true })
      
      if (!error && data && data.length > 0) {
        setPlatos(data)
      } else {
        // Datos de respaldo por si la BD está vacía
        setPlatos([])
      }
    } catch (error) {
      console.error('Error cargando platos:', error)
    } finally {
      setCargando(false)
    }
  }

// 👇 AÑADE ESTO después de cargarPlatos
const cargarMisPedidos = async () => {
  if (!mesaActiva) return

  const { data } = await supabase
    .from('pedidos')
    .select('*')
    .eq('mesa', mesaActiva)
    .eq('sesion_id', sesionActiva)  // ← filtra por sesión activa 
    .order('creado_en', { ascending: false })

  if (data) {
    setMisPedidos(data)
    const total = data.reduce((sum, p) => sum + (p.precio || 0), 0)
    setTotalGastado(total)
  }
}

// Cargar pedidos cuando cambia la mesa o se envía un pedido
useEffect(() => {
  if (mesaActiva) {
    cargarMisPedidos()
  }
}, [mesaActiva, carrito.length])

const abrirModal = (plato: any) => {
  setPlatoSeleccionado(plato)
  
  let ingredientes = plato?.ingredientes || []
  

  
  setIngredientesSeleccionados([...ingredientes])
  setModalAbierto(true)
}

  const toggleIngrediente = (id: number) => {
    setIngredientesSeleccionados(ingredientesSeleccionados.map(ing =>
      ing.id === id ? { ...ing, activo: !ing.activo } : ing
    ))
  }




const enviarPedido = async () => {
  console.log('Mesa activa:', mesaActiva)
  // 📱 Caso 1: No escaneó QR
  if (!tokenActivo) {
    setModalAbierto(false)
    showToast('📱 Escanea el código QR de tu mesa para hacer pedidos', 'error')
    return
  }

  if (!mesaActiva || mesaEstado !== 'ocupada') {
    setModalAbierto(false)
    showToast('⏳ Solicita al camarero que active tu mesa', 'error')
    return
  }

  if (!platoSeleccionado) return

    const nuevoPedido = {
      plato_id: platoSeleccionado.id,
      plato_nombre: platoSeleccionado.nombre,
      ingredientes: ingredientesSeleccionados.filter(i => i.activo),
      precio: platoSeleccionado.precio,
      estado: 'pendiente',
      mesa: mesaActiva || null,
      sesion_id: sesionActiva || null,  // ← añade la sesión
      creado_en: new Date().toISOString()
    }
    
    try {
      const { error } = await supabase.from('pedidos').insert([nuevoPedido])
      if (error) {
        console.error('Error:', error)
        showToast('❌ Error al enviar el pedido: ' + error.message, 'error')
        return
      }
      
      setCarrito([...carrito, { ...nuevoPedido, id: Date.now() }])
      showToast(`✅ ${platoSeleccionado.nombre} enviado a cocina!`, 'success')
      setModalAbierto(false)
    } catch (err) {
      console.error('Error inesperado:', err)
       showToast('❌ Error de conexión', 'error')
    }
  }
  
  

  if (cargando) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">Cargando menú...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Banner de estado */}
      <div className={`border rounded-xl p-4 mb-6 ${
        mesaActiva && mesaEstado === 'ocupada' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
      }`}>
        <p className={`font-medium ${
          mesaActiva && mesaEstado === 'ocupada' ? 'text-green-800' : 'text-yellow-800'
        }`}>
          {!mesaActiva && '👀 Solo vista — Escanea el QR de tu mesa para hacer pedidos'}
          {mesaActiva && mesaEstado !== 'ocupada' && '⏳ Mesa detectada — Esperando activación del camarero'}
          {mesaActiva && mesaEstado === 'ocupada' && '✅ Mesa activa — Puedes hacer tu pedido'}
        </p>
      </div>

      {/* Mis pedidos - solo visible si hay mesa activa */}
      {mesaActiva && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[#0d1f3c] font-medium">📋 Mis pedidos</p>
            <p className="text-orange-600 font-bold">Total: {totalGastado}€</p>
          </div>
          {misPedidos.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">No has pedido nada aún</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {misPedidos.map((pedido, idx) => (
                <div key={pedido.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                  <div>
                    <p className="font-medium">{pedido.plato_nombre}</p>
                    <p className="text-xs text-slate-400">{new Date(pedido.creado_en).toLocaleTimeString()}</p>
                  </div>
                  <p className="text-orange-600 font-medium">{pedido.precio}€</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mostrar carrito */}
      {carrito.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-blue-800 font-medium">📋 Pedidos realizados:</p>
          <ul className="mt-2 space-y-1">
            {carrito.map((item, idx) => (
              <li key={idx} className="text-sm text-blue-700">
                {item.plato_nombre} - {item.precio}€ ({item.ingredientes?.length || 0} ingredientes)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid de platos */}
      <h2 className="text-2xl font-bold mb-6">🍽️ Nuestro Menú</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platos.map((plato) => (
          <div 
            key={plato.id} 
            onClick={() => abrirModal(plato)}
            className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-105 overflow-hidden"
          >
            <div className="h-32 relative bg-gradient-to-r from-orange-100 to-red-100">
              {plato.imagen_url ? (
                <Image
                  src={plato.imagen_url}
                  alt={plato.nombre}
                  fill
                  className="object-cover rounded-t-xl"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl">{plato.emoji || '🍽️'}</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-bold text-lg">{plato.nombre}</h3>
              <p className="text-gray-500 text-sm mt-1">{plato.descripcion || 'Deliciosa opción'}</p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-orange-600 font-bold text-xl">{plato.precio}€</span>
                <span className="text-sm text-gray-400">👆 Pulsa para personalizar</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE PERSONALIZACIÓN */}
      {modalAbierto && platoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[600px] max-w-[90vw] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Cabecera */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-orange-500 to-red-600 text-white">
              <div className="flex items-center gap-3">
                {platoSeleccionado.imagen_url ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white flex-shrink-0">
                    <Image
                      src={platoSeleccionado.imagen_url}
                      alt={platoSeleccionado.nombre}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <span className="text-3xl">{platoSeleccionado.emoji || '🍽️'}</span>
                )}
                <h2 className="text-white font-semibold text-lg">{platoSeleccionado.nombre}</h2>
              </div>
              <button 
                onClick={() => setModalAbierto(false)}
                className="text-white/80 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Contenido del modal - dos columnas */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2">
                {/* Columna izquierda - info del plato */}
                <div className="p-6 bg-orange-50 flex flex-col items-center text-center">
                  <CarruselImagenes
                    imagenes={
                      platoSeleccionado.imagenes?.length
                        ? platoSeleccionado.imagenes
                        : platoSeleccionado.imagen_url
                          ? [platoSeleccionado.imagen_url]
                          : []
                    }
                    nombre={platoSeleccionado.nombre}
                    emoji={platoSeleccionado.emoji}
                  />
                  <h3 className="font-bold text-lg">{platoSeleccionado.nombre}</h3>
                  <p className="text-gray-500 text-sm mt-1">{platoSeleccionado.descripcion || 'Deliciosa opción'}</p>
                  <p className="text-orange-600 font-bold text-2xl mt-3">{platoSeleccionado.precio}€</p>
                </div>

                {/* Columna derecha - ingredientes */}
                <div className="p-6">
                  <p className="font-semibold mb-3 text-gray-700">Elige tus ingredientes:</p>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {Array.isArray(ingredientesSeleccionados) && ingredientesSeleccionados.length > 0 ? (
                      ingredientesSeleccionados.map((ing, idx) => (
                        <label
                          key={ing?.id ?? idx}
                          className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all
                            ${ing?.activo 
                              ? 'bg-green-50 border border-green-300' 
                              : 'bg-gray-50 border border-gray-200'
                            }`}
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {ing?.imagen_url ? (
                              <img
                                src={ing.imagen_url}
                                alt={ing.nombre}
                                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : (
                              <span className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0" />
                            )}
                            <span
                              className={`text-base font-semibold truncate ${
                                ing?.activo ? 'text-gray-900' : 'text-gray-400 line-through'
                              }`}
                            >
                              {ing?.nombre || 'Ingrediente'}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={ing?.activo || false}
                            onChange={() => toggleIngrediente(ing?.id ?? idx)}
                            className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />
                        </label>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">Este plato no tiene ingredientes opcionales</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer con botones */}
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end bg-gray-50">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={enviarPedido}
                className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition flex items-center gap-2"
              >
                🍳 Enviar a cocina
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                  {platoSeleccionado.precio}€
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
        {/* Renderizar toasts */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}