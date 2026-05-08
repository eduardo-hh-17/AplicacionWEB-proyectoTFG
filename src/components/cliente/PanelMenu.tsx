'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/cliente/Toast'


export default function PanelMenu({ tokenActivo, mesaActiva }: { 
  tokenActivo: string | null
  mesaActiva: number | null 
}) {
  const [platos, setPlatos] = useState<any[]>([])
  const [carrito, setCarrito] = useState<any[]>([])
  const [modalAbierto, setModalAbierto] = useState(false)
  const [platoSeleccionado, setPlatoSeleccionado] = useState<any>(null)
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  const { toasts, showToast, removeToast } = useToast()


  // Cargar platos desde Supabase
  useEffect(() => {
    cargarPlatos()
  }, [])

  const cargarPlatos = async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('platos')
        .select('*')
        .eq('activo', true)
      
      if (!error && data && data.length > 0) {
        setPlatos(data)
      } else {
        // Datos de respaldo por si la BD está vacía
        setPlatos([
          { id: 1, emoji: '🍔', nombre: 'Hamburguesa Clásica', desc: 'Carne de ternera con queso cheddar', precio: 10.99, ingredientes: [] },
          { id: 2, emoji: '🍕', nombre: 'Pizza Margarita', desc: 'Tomate, mozzarella y albahaca', precio: 12.99, ingredientes: [] },
          { id: 3, emoji: '🥗', nombre: 'Ensalada César', desc: 'Lechuga romana, pollo, parmesano', precio: 8.99, ingredientes: [] },
          { id: 4, emoji: '🥩', nombre: 'Chuletón', desc: 'Carne a la brasa con patatas', precio: 18.99, ingredientes: [] },
          { id: 5, emoji: '🍝', nombre: 'Pasta Carbonara', desc: 'Pasta, huevo, panceta', precio: 11.99, ingredientes: [] },
          { id: 6, emoji: '🥤', nombre: 'Refresco', desc: 'Coca-Cola, Fanta, Sprite', precio: 2.50, ingredientes: [] },
        ])
      }
    } catch (error) {
      console.error('Error cargando platos:', error)
    } finally {
      setCargando(false)
    }
  }

const abrirModal = (plato: any) => {
  setPlatoSeleccionado(plato)
  
  let ingredientes = plato?.ingredientes || []
  
  if (!ingredientes.length) {
    ingredientes = [
      { id: 1, nombre: 'Lechuga', emoji: '🥬', activo: true },
      { id: 2, nombre: 'Tomate', emoji: '🍅', activo: true },
      { id: 3, nombre: 'Cebolla', emoji: '🧅', activo: true },
    ]
  }
  
  setIngredientesSeleccionados([...ingredientes])
  setModalAbierto(true)
}

  const toggleIngrediente = (id: number) => {
    setIngredientesSeleccionados(ingredientesSeleccionados.map(ing =>
      ing.id === id ? { ...ing, activo: !ing.activo } : ing
    ))
  }




const enviarPedido = async () => {
    if (!platoSeleccionado) return

    const nuevoPedido = {
      plato_id: platoSeleccionado.id,
      plato_nombre: platoSeleccionado.nombre,
      ingredientes: ingredientesSeleccionados.filter(i => i.activo),
      precio: platoSeleccionado.precio,
      estado: 'pendiente',
      mesa: mesaActiva || null,
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
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
        <p className="text-green-800 font-medium">
          ✅ Modo pedido activo - Selecciona un plato para personalizar
        </p>
      </div>

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
            <div className="h-32 bg-gradient-to-r from-orange-100 to-red-100 flex items-center justify-center">
              <span className="text-6xl">{plato.emoji || '🍽️'}</span>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-lg">{plato.nombre}</h3>
              <p className="text-gray-500 text-sm mt-1">{plato.desc || 'Deliciosa opción'}</p>
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
                <span className="text-3xl">{platoSeleccionado.emoji || '🍽️'}</span>
                <h2 className="text-xl font-bold">Personaliza tu {platoSeleccionado.nombre}</h2>
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
                  <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center mb-4 shadow">
                    <span className="text-6xl">{platoSeleccionado.emoji || '🍽️'}</span>
                  </div>
                  <h3 className="font-bold text-lg">{platoSeleccionado.nombre}</h3>
                  <p className="text-gray-500 text-sm mt-1">{platoSeleccionado.desc || 'Deliciosa opción'}</p>
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
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{ing?.emoji || '🥬'}</span>
                            <span className={`text-sm ${ing?.activo ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
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
                      <p className="text-gray-500 text-center py-4">Cargando ingredientes...</p>
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