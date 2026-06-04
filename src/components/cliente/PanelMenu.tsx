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
    <div
      className="relative w-full max-w-[220px] aspect-square rounded-2xl overflow-hidden shadow mb-4"
      onContextMenu={e => e.preventDefault()}
    >
      <Image
        src={imagenes[indice]}
        alt={`${nombre} ${indice + 1}`}
        fill
        className="object-cover select-none"
        sizes="220px"
        draggable={false}
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
  const [notasPedido, setNotasPedido] = useState('')
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

// Realtime: pedidos de la sesión activa
useEffect(() => {
  if (!sesionActiva) return
  const canal = supabase
    .channel(`mis-pedidos-${sesionActiva}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
      cargarMisPedidos()
    })
    .subscribe()
  return () => { supabase.removeChannel(canal) }
}, [sesionActiva, mesaActiva])

// Realtime: estado de la mesa (ocupada / libre)
useEffect(() => {
  if (!mesaActiva) return
  const canal = supabase
    .channel(`mesa-estado-${mesaActiva}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'mesas',
      filter: `numero=eq.${mesaActiva}`,
    }, (payload) => {
      const m = payload.new as { estado?: string }
      if (m.estado) setMesaEstado(m.estado)
    })
    .subscribe()
  return () => { supabase.removeChannel(canal) }
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
  if (!sesionActiva) return

  const { data } = await supabase
    .from('pedidos')
    .select('*')
    .eq('sesion_id', sesionActiva)
    .order('creado_en', { ascending: false })

  if (data) {
    setMisPedidos(data)
    const total = data
      .filter((p: any) => p.estado !== 'cancelado')
      .reduce((sum: number, p: any) => sum + (p.precio || 0), 0)
    setTotalGastado(total)
  }
}

// Cargar pedidos cuando cambia la mesa o se envía un pedido
useEffect(() => {
  if (sesionActiva) cargarMisPedidos()
}, [sesionActiva, carrito.length])

const abrirModal = (plato: any) => {
  setPlatoSeleccionado(plato)
  setIngredientesSeleccionados([...(plato?.ingredientes || [])])
  setNotasPedido('')
  setModalAbierto(true)
}

  const toggleIngrediente = (id: number) => {
    setIngredientesSeleccionados(ingredientesSeleccionados.map(ing =>
      ing.id === id ? { ...ing, activo: !ing.activo } : ing
    ))
  }




const enviarPedido = async () => {
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
      mesa_id: mesaActiva || null,
      sesion_id: sesionActiva || null,
      notas: notasPedido.trim() || null,
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
      <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Cargando menú…</p>
      </div>
    )
  }

  return (
    <div className="p-5 md:p-6 space-y-5">
      {/* Banner de estado */}
      {mesaActiva && mesaEstado === 'ocupada' ? (
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold animate-slide-up"
          style={{ background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.38)', color: '#86efac' }}>
          <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse-soft" style={{ background: '#22c55e' }} />
          ✅ Mesa {mesaActiva} activa — ¡Puedes hacer tu pedido!
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold animate-scale-in"
          style={{
            background: 'rgba(239,68,68,0.22)',
            border: '2px solid rgba(239,68,68,0.60)',
            color: '#fca5a5',
            boxShadow: '0 0 18px rgba(239,68,68,0.25)',
          }}>
          <span className="w-3 h-3 rounded-full shrink-0 animate-pulse-soft" style={{ background: '#ef4444' }} />
          <span>
            {!mesaActiva
              ? '⚠️ Pide al camarero que active tu mesa para hacer pedidos'
              : '⚠️ Mesa detectada — Pide al camarero que la active'}
          </span>
        </div>
      )}

      {/* Mis pedidos */}
      {mesaActiva && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4" style={{ borderBottom: '1px solid rgba(45,112,60,0.15)' }}>
            <p className="font-semibold text-[14px]" style={{ color: '#0a2214' }}>Mis pedidos</p>
            <span className="font-bold text-[14px]" style={{ color: '#c47a28' }}>Total: {totalGastado.toFixed(2)}€</span>
          </div>
          {misPedidos.length === 0 ? (
            <p className="text-sm text-center py-5" style={{ color: '#5a9a6a' }}>No has pedido nada aún</p>
          ) : (
            <div className="divide-y max-h-56 overflow-y-auto" style={{ borderColor: 'rgba(45,112,60,0.08)' }}>
              {misPedidos.map((pedido) => {
                const cancelado = pedido.estado === 'cancelado'
                return (
                  <div key={pedido.id}
                    className="flex justify-between items-center px-5 py-3"
                    style={cancelado ? { background: 'rgba(239,68,68,0.06)' } : {}}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate"
                        style={{ color: cancelado ? '#ef4444' : '#0a2214', textDecoration: cancelado ? 'line-through' : 'none' }}>
                        {pedido.plato_nombre}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs" style={{ color: '#5a9a6a' }}>
                          {new Date(pedido.creado_en).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
                        </p>
                        {cancelado && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                            ✕ Cancelado
                          </span>
                        )}
                        {!cancelado && pedido.estado === 'listo' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}>
                            ✅ Listo
                          </span>
                        )}
                        {!cancelado && pedido.estado === 'preparando' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(59,130,246,0.15)', color: '#1d4ed8' }}>
                            👨‍🍳 En cocina
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold text-sm ml-3"
                      style={{ color: cancelado ? 'rgba(239,68,68,0.5)' : '#c47a28', textDecoration: cancelado ? 'line-through' : 'none' }}>
                      {pedido.precio}€
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}



      {/* Grid de platos */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-gradient-anim">Nuestro Menú</h2>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(212,160,64,0.15)', color: '#b8692a' }}>
          {platos.length} platos
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {platos.map((plato, i) => (
          <div
            key={plato.id}
            onClick={() => abrirModal(plato)}
            className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl animate-slide-up"
            style={{
              animationDelay: `${i * 60}ms`,
              background: 'linear-gradient(145deg,#2d4a32,#1a2a1e)',
              boxShadow: '0 2px 8px rgba(26,42,30,.22)',
            }}
          >
            {/* Imagen / emoji */}
            <div className="h-44 relative overflow-hidden">
              {(plato.imagenes?.[0] || plato.imagen_url) ? (
                <>
                  <Image
                    src={plato.imagenes?.[0] || plato.imagen_url}
                    alt={plato.nombre}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={false}
                  />
                  {/* Gradiente oscuro inferior para legibilidad */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#2d4a32,#1a2a1e)' }}>
                  <span className="text-7xl select-none group-hover:scale-110 transition-transform duration-300">
                    {plato.emoji || '🍽️'}
                  </span>
                </div>
              )}

              {/* Badge precio top-right */}
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl px-2.5 py-1 shadow-sm">
                <span className="text-orange-600 font-bold text-sm">{plato.precio}€</span>
              </div>
            </div>

            {/* Info */}
            <div className="px-4 py-3">
              <h3 className="font-bold text-white text-[15px] leading-tight truncate">
                {plato.nombre}
              </h3>
              <p className="text-slate-400 text-xs mt-1 line-clamp-2 leading-relaxed">
                {plato.descripcion || 'Deliciosa opción del día'}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#d4a040' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Personalizar
                </span>
                <div className="w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-300"
                  style={{ background: 'rgba(212,160,64,0.2)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#b8692a')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,160,64,0.2)')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 transition-colors" style={{ color: '#d4a040' }}>
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE PERSONALIZACIÓN */}
      {modalAbierto && platoSeleccionado && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
          style={{ background: 'rgba(4,14,10,0.72)', backdropFilter: 'blur(6px)' }}>
          <div
            className="rounded-t-3xl sm:rounded-2xl w-full sm:w-[600px] sm:max-w-[90vw] max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-slide-up"
            style={{
              background: 'rgba(240,255,245,0.92)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 24px 64px rgba(4,14,10,0.55), inset 0 1px 0 rgba(255,255,255,0.6)',
              border: '1px solid rgba(212,160,64,0.25)',
            }}
          >
            {/* Cabecera tropical */}
            <div
              className="flex items-center justify-between px-6 py-4 text-white"
              style={{
                background: 'linear-gradient(135deg, #1a2a1e 0%, #2d5a32 50%, #1a4a2e 100%)',
                borderBottom: '1px solid rgba(212,160,64,0.3)',
              }}
            >
              <div className="flex items-center gap-3">
                {(platoSeleccionado.imagenes?.[0] || platoSeleccionado.imagen_url) ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                    style={{ border: '2px solid rgba(212,160,64,0.6)' }}
                    onContextMenu={e => e.preventDefault()}
                  >
                    <Image
                      src={platoSeleccionado.imagenes?.[0] || platoSeleccionado.imagen_url}
                      alt={platoSeleccionado.nombre}
                      fill
                      className="object-cover select-none"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <span className="text-3xl">{platoSeleccionado.emoji || '🍽️'}</span>
                )}
                <div>
                  <h2 className="font-bold text-[16px] leading-tight">{platoSeleccionado.nombre}</h2>
                  <p className="text-[12px] font-semibold" style={{ color: '#d4a040' }}>{platoSeleccionado.precio}€</p>
                </div>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all font-bold text-lg"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '2px solid rgba(255,255,255,0.35)' }}
              >
                ✕
              </button>
            </div>

            {/* Contenido — una columna en móvil, dos en tablet+ */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {/* Columna izquierda */}
                <div className="p-4 sm:p-6 flex flex-col items-center text-center"
                  style={{ background: 'rgba(45,138,68,0.06)', borderRight: '1px solid rgba(212,160,64,0.15)' }}
                >
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
                  <h3 className="font-bold text-[16px] mt-1" style={{ color: '#0a2010' }}>{platoSeleccionado.nombre}</h3>
                  <p className="text-[13px] mt-1 leading-relaxed" style={{ color: '#3d6a4a' }}>{platoSeleccionado.descripcion || 'Deliciosa opción'}</p>
                  <p className="font-bold text-2xl mt-3" style={{ color: '#c47a28' }}>{platoSeleccionado.precio}€</p>
                </div>

                {/* Columna derecha — ingredientes + notas */}
                <div className="p-4 sm:p-6 flex flex-col gap-4">
                  <div>
                    <p className="font-semibold mb-3 text-[13px]" style={{ color: '#0a2010' }}>Elige tus ingredientes:</p>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                      {Array.isArray(ingredientesSeleccionados) && ingredientesSeleccionados.length > 0 ? (
                        ingredientesSeleccionados.map((ing, idx) => (
                          <label
                            key={ing?.id ?? idx}
                            className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all"
                            style={ing?.activo
                              ? { background: 'rgba(45,138,68,0.12)', border: '1px solid rgba(45,138,68,0.35)' }
                              : { background: 'rgba(212,160,64,0.06)', border: '1px solid rgba(212,160,64,0.18)' }}
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              {ing?.imagen_url ? (
                                <img src={ing.imagen_url} alt={ing.nombre} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                              ) : (
                                <span className="w-14 h-14 rounded-lg flex-shrink-0" style={{ background: 'rgba(212,160,64,0.12)' }} />
                              )}
                              <span className="text-base font-semibold truncate"
                                style={{ color: ing?.activo ? '#0a2010' : '#8aaa8a', textDecoration: ing?.activo ? 'none' : 'line-through' }}>
                                {ing?.nombre || 'Ingrediente'}
                              </span>
                            </div>
                            <input
                              type="checkbox"
                              checked={ing?.activo || false}
                              onChange={() => toggleIngrediente(ing?.id ?? idx)}
                              className="w-5 h-5 rounded cursor-pointer"
                              style={{ accentColor: '#2d8a44' }}
                            />
                          </label>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">Este plato no tiene ingredientes opcionales</p>
                      )}
                    </div>
                  </div>

                  {/* Notas para cocina */}
                  <div>
                    <label className="font-semibold text-[13px] block mb-1.5" style={{ color: '#0a2010' }}>
                      💬 Nota para cocina <span className="font-normal text-[11px]" style={{ color: '#5a9a6a' }}>(opcional)</span>
                    </label>
                    <textarea
                      value={notasPedido}
                      onChange={e => setNotasPedido(e.target.value)}
                      rows={2}
                      maxLength={200}
                      placeholder="Ej: poco hecho, sin sal, alergia al gluten…"
                      className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none transition-all"
                      style={{
                        background: 'rgba(45,138,68,0.07)',
                        border: '1px solid rgba(45,138,68,0.25)',
                        color: '#0a2010',
                      }}
                      onFocus={e => { e.currentTarget.style.border = '1px solid rgba(45,138,68,0.6)' }}
                      onBlur={e => { e.currentTarget.style.border = '1px solid rgba(45,138,68,0.25)' }}
                    />
                    {notasPedido.length > 0 && (
                      <p className="text-[10px] mt-0.5 text-right" style={{ color: '#5a9a6a' }}>{notasPedido.length}/200</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer con botones */}
            <div className="px-6 py-4 flex gap-3 justify-end"
              style={{ borderTop: '1px solid rgba(212,160,64,0.2)', background: 'rgba(45,138,68,0.05)' }}>
              <button
                onClick={() => setModalAbierto(false)}
                className="px-5 py-2 rounded-xl font-medium text-[14px] transition-all"
                style={{ background: 'rgba(10,32,16,0.08)', color: '#3d6a4a', border: '1px solid rgba(45,138,68,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,32,16,0.14)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,32,16,0.08)' }}
              >
                Cancelar
              </button>
              <button
                onClick={enviarPedido}
                className="px-5 py-2 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all"
                style={{
                  background: 'linear-gradient(135deg, #d4a040, #c47a28)',
                  color: '#0a1a08',
                  boxShadow: '0 4px 14px rgba(212,160,64,0.35)',
                }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = '' }}
              >
                🍳 Enviar a cocina
                <span className="px-2 py-0.5 rounded-full text-[12px] font-bold"
                  style={{ background: 'rgba(10,26,8,0.18)' }}>
                  {platoSeleccionado.precio}€
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toasts — contenedor fijo esquina inferior derecha */}
      <div className="fixed bottom-6 right-4 z-[200] flex flex-col gap-2 items-end" style={{ pointerEvents: 'none' }}>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  )
}