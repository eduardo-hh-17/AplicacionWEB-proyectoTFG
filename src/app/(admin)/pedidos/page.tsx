'use client'

import { useState, useEffect } from 'react'
import { supabase} from '@/lib/supabase'
import MesaVisual from '@/components/admin/MesaVisual'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/cliente/Toast'

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
  mesa_id: number | null
  ingredientes: any[]
  fecha: string
}


type Plato = {
  id: number
  nombre: string
  precio: number
  emoji: string
  descripcion: string
  ingredientes: any[]
  imagen_url: string | null
  imagenes: string[] | null
}

export default function Pedidos() {

  // Estados — como variables de instancia en Java
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [mesaSeleccionada, setMesaSeleccionada] = useState<Mesa | null>(null)
  const [modalMesa, setModalMesa] = useState(false)
  const [personas, setPersonas] = useState(0)
  const [cargando, setCargando] = useState(true)

  //Nuevos estados
  const [modalPedidoManual, setModalPedidoManual] = useState(false)
  const [platos, setPlatos] = useState<Plato[]>([])
  const [platoSeleccionado, setPlatoSeleccionado] = useState<Plato | null>(null)
  const [ingredientesSeleccionados, setIngredientesSeleccionados] = useState<any[]>([])

  // Estado para modal de cuenta
  const [modalCuenta, setModalCuenta] = useState(false)
  const [pedidosMesa, setPedidosMesa] = useState<any[]>([])
  const [cargandoCuenta, setCargandoCuenta] = useState(false)

  const { toasts, showToast, removeToast } = useToast()

  // Carga inicial — como el constructor en Java
  useEffect(() => {
    cargarMesas()
    cargarPedidos()
    cargarPlatos()

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
      .in('estado', ['listo', 'preparando', 'cancelado'])
      .order('creado_en', { ascending: false })
    if (data) setPedidos(data)
  }

  const cargarPlatos = async () => {
    const { data } = await supabase
      .from('platos')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    if (data) setPlatos(data)
  }

  // Carga todos los pedidos de la sesión activa de una mesa
  const verCuenta = async (mesa: Mesa) => {
    setMesaSeleccionada(mesa)
    setCargandoCuenta(true)
    setModalCuenta(true)

    const { data: mesaData } = await supabase
      .from('mesas')
      .select('sesion_id')
      .eq('id', mesa.id)
      .single()

    if (!mesaData?.sesion_id) {
      setPedidosMesa([])
      setCargandoCuenta(false)
      return
    }

    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('sesion_id', mesaData.sesion_id)
      .order('creado_en', { ascending: true })

    setPedidosMesa(data || [])
    setCargandoCuenta(false)
  }

  // Cobra la cuenta: crea/actualiza factura como pagada
  const cobrarCuenta = async () => {
    if (!mesaSeleccionada) return

    const { data: mesaData } = await supabase.from('mesas').select('sesion_id').eq('id', mesaSeleccionada.id).single()
    if (!mesaData?.sesion_id) { showToast('⚠️ No hay sesión activa para esta mesa', 'error'); return }

    const sesionId = mesaData.sesion_id

    // Carga pedidos frescos de la DB (no depende del estado)
    const { data: pedidosFrescos } = await supabase.from('pedidos').select('*').eq('sesion_id', sesionId)
    const todosLosPedidos = pedidosFrescos || []
    const total = parseFloat(
      todosLosPedidos.filter((p: any) => p.estado !== 'cancelado')
        .reduce((s: number, p: any) => s + (p.precio || 0), 0)
        .toFixed(2)
    )

    const { data: sesion } = await supabase.from('sesiones').select('iniciada_en, personas').eq('id', sesionId).single()
    const tiempoMinutos = sesion ? Math.floor((Date.now() - new Date(sesion.iniciada_en).getTime()) / 60000) : 0

    // Si ya existe factura para esta sesión, marcarla pagada; si no, crearla
    const { data: existente } = await supabase.from('facturas').select('id').eq('sesion_id', sesionId).maybeSingle()

    let error: any = null
    if (existente) {
      const res = await supabase.from('facturas')
        .update({ pagada: true, estado: 'pagada', total, pedidos: todosLosPedidos })
        .eq('id', existente.id)
      error = res.error
    } else {
      const res = await supabase.from('facturas').insert([{
        sesion_id: sesionId,
        mesa_numero: mesaSeleccionada.numero,
        personas: mesaSeleccionada.personas,
        pedidos: todosLosPedidos,
        total,
        tiempo_minutos: tiempoMinutos,
        creada_en: new Date().toISOString(),
        pagada: true,
        estado: 'pagada',
      }])
      error = res.error
    }

    if (error) {
      showToast(`❌ Error al guardar factura: ${error.message}`, 'error')
      return
    }

    showToast(`✅ Cuenta cobrada — ${total.toFixed(2)}€`, 'success')
    setModalCuenta(false)
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
      const total = parseFloat(
        (pedidosSesion?.filter(p => p.estado !== 'cancelado').reduce((sum, p) => sum + (p.precio || 0), 0) || 0).toFixed(2)
      )

      const { data: sesion } = await supabase
        .from('sesiones')
        .select('iniciada_en')
        .eq('id', mesa.sesion_id)
        .single()

      const tiempoMinutos = sesion
        ? Math.floor((Date.now() - new Date(sesion.iniciada_en).getTime()) / 60000)
        : 0

      // 4. Guardar factura solo si no existe ya una para esta sesión
      const { data: facturaExistente } = await supabase
        .from('facturas').select('id').eq('sesion_id', mesa.sesion_id).maybeSingle()

      if (!facturaExistente) {
        await supabase.from('facturas').insert([{
          sesion_id: mesa.sesion_id,
          mesa_numero: mesaSeleccionada.numero,
          personas: mesaSeleccionada.personas,
          pedidos: pedidosSesion,
          total,
          tiempo_minutos: tiempoMinutos,
          creada_en: new Date().toISOString(),
          pagada: false,
          estado: 'pendiente',
        }])
      }

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

  const enviarPedidoManual = async () => {
    if (!mesaSeleccionada || !platoSeleccionado) return

    // Obtener sesion_id de la mesa
    const { data: mesaData } = await supabase
      .from('mesas')
      .select('sesion_id')
      .eq('id', mesaSeleccionada.id)
      .single()

    const { error } = await supabase
      .from('pedidos')
      .insert([{
        plato_id: platoSeleccionado.id,
        plato_nombre: platoSeleccionado.nombre,
        ingredientes: ingredientesSeleccionados.filter((i: any) => i.activo),
        precio: platoSeleccionado.precio,
        estado: 'pendiente',
        mesa_id: mesaSeleccionada.id,
        sesion_id: mesaData?.sesion_id || null,
        creado_en: new Date().toISOString()
      }])

    if (error) {
      showToast('❌ Error al enviar pedido: ' + error.message, 'error')
      return
    }

    setPlatoSeleccionado(null)
    setModalPedidoManual(false)
    setModalMesa(false)
    showToast(`✅ Pedido de ${platoSeleccionado.nombre} enviado a cocina`, 'success')
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
            <h1 className="text-2xl font-bold text-gradient-anim">Mesas</h1>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block"/>
                  Libre
                </span>
                <span className="flex items-center gap-1 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block"/>
                  Ocupada
                </span>
              </div>
        </div>

        {/* Grid de mesas (sin altura fija, fluye normalmente) */}
        <div className="grid grid-cols-4 gap-4">
          {mesas.map((mesa) => (
            <MesaVisual
              key={mesa.id}
              numero={mesa.numero}
              capacidad={mesa.capacidad}
              personas={mesa.personas}
              estado={mesa.estado}
              onClick={() => abrirMesa(mesa)}
            />
          ))}
        </div>
        </div>

        {/* ── COLUMNA DERECHA — PEDIDOS PENDIENTES (CON SCROLL INDEPENDIENTE) ── */}
        <div className="w-80 flex-shrink-0 flex flex-col h-full">
        <h2 className="text-xl font-bold text-gradient-anim mb-6 flex-shrink-0">
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
              pedido.estado === 'cancelado'
                ? 'border-red-300 opacity-70'
                : pedido.estado === 'listo'
                ? 'bg-white border-green-300'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
            style={pedido.estado === 'cancelado' ? { background: 'rgba(239,68,68,0.07)' } : {}}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium" style={{
                    color: pedido.estado === 'cancelado' ? '#ef4444' : '#fff',
                    textDecoration: pedido.estado === 'cancelado' ? 'line-through' : 'none'
                  }}>{pedido.plato_nombre}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {pedido.mesa_id ? `Mesa ${pedido.mesa_id}` : 'Sin mesa'}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                    pedido.estado === 'cancelado'
                      ? 'bg-red-100 text-red-600'
                      : pedido.estado === 'listo'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {pedido.estado === 'cancelado' ? '✕ Cancelado' : pedido.estado === 'listo' ? '✅ Listo' : '👨‍🍳 Preparando'}
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
                     {ing.imagen_url && (
                        <img src={ing.imagen_url} alt="" className="w-6 h-6 rounded object-cover inline mr-1" />
                      )}
                    {ing.nombre}
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

              {pedido.estado === 'cancelado' && (
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                    ✕ Cancelado por cocina
                  </p>
                  <button
                    onClick={async () => {
                      await supabase.from('pedidos').delete().eq('id', pedido.id)
                      setPedidos(prev => prev.filter(p => p.id !== pedido.id))
                    }}
                    className="text-xs px-2 py-1 rounded-lg font-semibold transition-all"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.35)' }}
                  >
                    Quitar
                  </button>
                </div>
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
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        >
            <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-xs flex flex-col max-h-[90vh] shadow-2xl"
            >
            {/* Cabecera — fija */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
                <h2 className="text-white font-medium">Mesa {mesaSeleccionada.numero}</h2>
                <button onClick={() => setModalMesa(false)} className="text-slate-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">✕</button>
            </div>

            {/* Cuerpo — scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="flex items-center gap-2 mb-6">
                <span className="text-slate-400 text-sm">Estado:</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorBadge(mesaSeleccionada.estado)}`}>
                    {mesaSeleccionada.estado}
                </span>
                </div>

                <div className="mb-6">
                <p className="text-white text-sm font-medium mb-3">Número de personas</p>
                <div className="flex items-center gap-4">
                    <button
                    onClick={() => setPersonas(Math.max(1, personas - 1))}
                    className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-white hover:bg-slate-50 transition-colors text-lg"
                    >
                    −
                    </button>
                    <span className="text-white text-2xl font-medium w-8 text-center">{personas}</span>
                    <button
                    onClick={() => setPersonas(Math.min(mesaSeleccionada.capacidad, personas + 1))}
                    className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-white hover:bg-slate-50 transition-colors text-lg"
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
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: 'linear-gradient(135deg,#1e5c2e,#2d8a44)', boxShadow: '0 2px 10px rgba(30,92,46,0.4)' }}
                    onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.filter = '' }}
                    >
                    ✓ Activar mesa
                    </button>
                ) : (
                  <>
                    <button
                      onClick={() => { setModalMesa(false); setModalPedidoManual(true) }}
                      className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all"
                      style={{ background: 'linear-gradient(135deg,#d4a040,#c47a28)' }}
                    >
                      🍽️ Añadir pedido
                    </button>
                    <button
                      onClick={() => { setModalMesa(false); verCuenta(mesaSeleccionada) }}
                      className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all"
                      style={{ background: 'linear-gradient(135deg,#1a3a5c,#2563eb)' }}
                    >
                      🧾 Ver cuenta
                    </button>
                    <button
                      onClick={liberarMesa}
                      className="w-full bg-red-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                      Liberar mesa
                    </button>
                  </>
                )}
                <button
                    onClick={() => setModalMesa(false)}
                    className="w-full py-3 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.42)', color: '#fca5a5' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.20)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)' }}
                >
                    Cancelar
                </button>
                </div>
            </div>
            </div>
        </div>
        )}

        {/* MODAL — Pedido manual del camarero */}
        {modalPedidoManual && mesaSeleccionada && (
          <div
            onClick={() => setModalPedidoManual(false)}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh] shadow-2xl"
            >
              {/* Cabecera — fija */}
              <div className="flex items-center justify-between px-6 py-4 shrink-0 text-white"
                style={{ background: 'linear-gradient(135deg,#1a2a1e,#2d5a32)', borderBottom: '1px solid rgba(212,160,64,0.25)' }}>
                <div>
                  <h2 className="font-medium text-lg">Pedido manual</h2>
                  <p className="text-orange-100 text-sm">Mesa {mesaSeleccionada.numero}</p>
                </div>
                <button onClick={() => setModalPedidoManual(false)} className="text-white/70 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">✕</button>
              </div>

              {/* Lista de platos — scrollable (ocupa el espacio restante) */}
              <div className="overflow-y-auto p-4 space-y-2" style={{ maxHeight: platoSeleccionado ? '40vh' : '55vh' }}>
                {platos.map((plato) => (
                  <button
                    key={plato.id}
                    onClick={() => {
                      setPlatoSeleccionado(plato)
                      setIngredientesSeleccionados(
                        (plato.ingredientes || []).map((ing: any) => ({
                          ...ing,
                          activo: ing.activo !== false,
                        }))
                      )
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      platoSeleccionado?.id === plato.id
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                      {(plato.imagenes?.[0] || plato.imagen_url) ? (
                        <img src={plato.imagenes?.[0] || plato.imagen_url || undefined} alt={plato.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">{plato.emoji || '🍽️'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${platoSeleccionado?.id === plato.id ? 'text-orange-800' : 'text-white'}`}>{plato.nombre}</p>
                      <p className="text-slate-400 text-xs line-clamp-1">{plato.descripcion}</p>
                    </div>
                    <span className="text-orange-600 font-bold flex-shrink-0">{plato.precio}€</span>
                  </button>
                ))}
              </div>

              {/* ── Ingredientes — sección FIJA visible siempre que haya plato seleccionado ── */}
              {platoSeleccionado && (
                <div className="shrink-0 px-4 pb-3 pt-2" style={{ borderTop: '1px solid rgba(212,160,64,0.20)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#b8692a' }}>
                    🧂 {platoSeleccionado.nombre}
                    {ingredientesSeleccionados.length === 0 && (
                      <span className="ml-2 opacity-60 font-normal">— sin ingredientes</span>
                    )}
                  </p>
                  {ingredientesSeleccionados.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ingredientesSeleccionados.map((ing: any, i: number) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setIngredientesSeleccionados(prev =>
                              prev.map((x: any, j: number) => j === i ? { ...x, activo: !x.activo } : x)
                            )
                          }
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                          style={ing.activo
                            ? { background: 'rgba(34,197,94,0.15)', color: '#166534', border: '1.5px solid rgba(34,197,94,0.4)' }
                            : { background: 'rgba(239,68,68,0.10)', color: '#b91c1c', border: '1.5px solid rgba(239,68,68,0.35)', textDecoration: 'line-through', opacity: 0.7 }
                          }
                        >
                          {ing.activo ? '✓' : '✕'} {ing.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Footer — fijo */}
              <div className="px-6 py-4 flex gap-3 justify-end shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                <button
                  onClick={() => setModalPedidoManual(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.42)', color: '#fca5a5' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.20)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={enviarPedidoManual}
                  disabled={!platoSeleccionado}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#d4a040,#c47a28)', boxShadow: '0 2px 10px rgba(212,160,64,0.35)' }}
                >
                  🍳 Enviar a cocina
                  {platoSeleccionado && ` — ${platoSeleccionado.precio}€`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL CUENTA ── */}
        {modalCuenta && mesaSeleccionada && (
          <div
            onClick={() => setModalCuenta(false)}
            className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-4"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden"
              style={{ background: 'linear-gradient(160deg,#0d1f35,#0a1628)', border: '1px solid rgba(37,99,235,0.35)', maxHeight: '90vh' }}
            >
              {/* Cabecera */}
              <div className="flex items-center justify-between px-6 py-4 shrink-0"
                style={{ background: 'linear-gradient(135deg,#1a3a5c,#2563eb)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
                <div>
                  <h2 className="font-bold text-white text-lg">🧾 Cuenta — Mesa {mesaSeleccionada.numero}</h2>
                  <p className="text-blue-200 text-xs mt-0.5">Pedidos de la sesión actual</p>
                </div>
                <button onClick={() => setModalCuenta(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">✕</button>
              </div>

              {/* Lista pedidos */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {cargandoCuenta ? (
                  <p className="text-center py-8 text-sm" style={{ color: '#64748b' }}>Cargando...</p>
                ) : pedidosMesa.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-3xl mb-2">🍽️</p>
                    <p className="text-sm" style={{ color: '#64748b' }}>No hay pedidos en esta mesa</p>
                  </div>
                ) : (
                  pedidosMesa.map((p: any) => {
                    const cancelado = p.estado === 'cancelado'
                    const hora = new Date(p.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                    return (
                      <div key={p.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{
                          background: cancelado ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${cancelado ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}`,
                          opacity: cancelado ? 0.70 : 1,
                        }}>
                        {/* Estado dot */}
                        <span className="w-2 h-2 rounded-full shrink-0" style={{
                          background: cancelado ? '#ef4444' : p.estado === 'entregado' ? '#22c55e' : p.estado === 'listo' ? '#86efac' : '#f59e0b'
                        }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate"
                            style={{ color: cancelado ? '#ef4444' : '#e2e8f0', textDecoration: cancelado ? 'line-through' : 'none' }}>
                            {p.plato_nombre}
                          </p>
                          <p className="text-[11px]" style={{ color: '#64748b' }}>{hora}
                            {cancelado && <span className="ml-1.5 text-red-400 font-semibold">— Cancelado</span>}
                            {p.estado === 'entregado' && <span className="ml-1.5 text-green-400 font-semibold">— Entregado</span>}
                          </p>
                        </div>
                        <span className="font-bold text-sm shrink-0"
                          style={{ color: cancelado ? '#ef4444' : '#d4a040', textDecoration: cancelado ? 'line-through' : 'none' }}>
                          {p.precio}€
                        </span>
                        {/* Botón quitar solo si está cancelado */}
                        {cancelado && (
                          <button
                            onClick={async () => {
                              await supabase.from('pedidos').delete().eq('id', p.id)
                              setPedidosMesa(prev => prev.filter((x: any) => x.id !== p.id))
                            }}
                            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold transition-all ml-1"
                            style={{ background: 'rgba(239,68,68,0.20)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.40)' }}
                            title="Quitar de la cuenta"
                          >✕</button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Total */}
              {!cargandoCuenta && pedidosMesa.length > 0 && (() => {
                const validos = pedidosMesa.filter((p: any) => p.estado !== 'cancelado')
                const total   = validos.reduce((s: number, p: any) => s + (p.precio || 0), 0)
                return (
                  <div className="shrink-0 px-6 py-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                    <div className="flex justify-between text-xs" style={{ color: '#64748b' }}>
                      <span>{validos.length} plato{validos.length !== 1 ? 's' : ''} entregados / pendientes</span>
                      {pedidosMesa.filter((p:any) => p.estado === 'cancelado').length > 0 && (
                        <span style={{ color: '#ef4444' }}>
                          {pedidosMesa.filter((p:any) => p.estado === 'cancelado').length} cancelado{pedidosMesa.filter((p:any) => p.estado === 'cancelado').length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white font-semibold text-lg">Total a cobrar</span>
                      <span className="font-black text-2xl" style={{ color: '#d4a040' }}>{total.toFixed(2)}€</span>
                    </div>
                    {/* Botón cobrar */}
                    <button
                      onClick={cobrarCuenta}
                      className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
                      style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 2px 12px rgba(22,163,74,0.40)' }}
                    >
                      ✓ Marcar como cobrado — {total.toFixed(2)}€
                    </button>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Toasts — contenedor fijo en esquina inferior derecha */}
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none">
          {toasts.map(t => (
            <Toast
              key={t.id}
              message={t.message}
              type={t.type}
              onClose={() => removeToast(t.id)}
            />
          ))}
        </div>
    </div>
    )
}