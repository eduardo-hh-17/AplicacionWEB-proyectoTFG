'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

type Pedido = {
  id: number
  plato_nombre: string
  precio: number
  estado: string
  creado_en: string
  mesa: number | null
}

type Empleado = {
  id: string
  nombre: string
  rol: string
  apellido: string
  telefono: string
  turno_inicio: string
  turno_cierre: string
  fecha_inicio: string
  activo: boolean
  foto_url: string | null
  email?: string
  password?: string
  trabajandoAhora?: boolean
}

type Sesion = {
  id: string
  mesa_numero: number
  personas: number
  iniciada_en: string
  estado: string  
}

export default function Dashboard() {
  const [pedidosHoy, setPedidosHoy] = useState(0)
  const [ingresosHoy, setIngresosHoy] = useState(0)
  const [totalPlatos, setTotalPlatos] = useState(0)
  const [mesasOcupadas, setMesasOcupadas] = useState(0)
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [totalEmpleados, setTotalEmpleados] = useState(0)
  const [pedidosRecientes, setPedidosRecientes] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)
  const[sesionesActivas, setSesionesActivas] = useState<Sesion[]>([])
  const[clientesHoy, setClientesHoy] = useState(0)
  const[modalEmpleados, setModalEmpleados] = useState(false)
  const[modalAltaEmpleado, setModalAltaEmpleado] = useState(false)
  const[periodoGrafica, setPeriodoGrafica] = useState<'dia' | 'semana' | 'mes'>('dia')
  const[datosGrafica, setDatosGrafica] = useState<{ label: string, total: number }[]>([])
  const [historialEmpleado, setHistorialEmpleado] = useState<{ id: string; nombre: string; fichajes: any[] } | null>(null)




  useEffect(() => {
    cargarDatos()
    cargarEmpleados()
    cargarSesionesActivas()
    cargarClientesHoy()
    cargarDatosGrafica('dia')

      // ✅ AÑADE ESTO (actualiza empleados cada minuto)
      const interval = setInterval(() => {
        cargarEmpleados()
      }, 30000)

    const canal = supabase
      .channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platos' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'empleados' }, () => cargarDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fichajes' }, () => cargarEmpleados())
      .subscribe()

        return () => {
          supabase.removeChannel(canal)
          clearInterval(interval)  // ✅ AÑADE ESTO
        }
  }, [])



  useEffect(() => {
    const verificarAcceso = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: empleado } = await supabase
          .from('empleados')
          .select('rol')
          .eq('email', user.email)
          .single()
        
        if (empleado?.rol !== 'admin') {
          window.location.href = empleado?.rol === 'cocinero' ? '/cocina' : '/pedidos'
        }
      }
    }
    verificarAcceso()
  }, [])

  useEffect(() => {
  cargarDatosGrafica(periodoGrafica)
}, [periodoGrafica])

  const cargarDatos = async () => {
    setCargando(true)

    const hoy = new Date().toISOString().split('T')[0] // Formato: YYYY-MM-DD

    // 1. Pedidos de hoy
    const { data: pedidosData } = await supabase
      .from('pedidos')
      .select('*')
      .gte('creado_en', `${hoy}T00:00:00`)
      .lte('creado_en', `${hoy}T23:59:59`)

    if (pedidosData) {
      setPedidosHoy(pedidosData.length)
      const ingresos = pedidosData.reduce((sum, p) => sum + (p.precio || 0), 0)
      setIngresosHoy(ingresos)
    }

    // 2. Total de platos activos
    const { count: countPlatos } = await supabase
      .from('platos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
    if (countPlatos !== null) setTotalPlatos(countPlatos)

    // 3. Mesas ocupadas
    const { count: countMesas } = await supabase
      .from('mesas')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'ocupada')
    if (countMesas !== null) setMesasOcupadas(countMesas)

    // 4. Empleados activos
    const { count: countEmpleados } = await supabase
      .from('empleados')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
    if (countEmpleados !== null) setTotalEmpleados(countEmpleados)

    // 5. Últimos 5 pedidos
    const { data: recientes } = await supabase
      .from('pedidos')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(5)

    if (recientes) {
      setPedidosRecientes(recientes)
    }

    setCargando(false)
  }

  const cargarEmpleados = async () => {
    console.log('🔄 Actualizando empleados activos...')
    const hoy = new Date().toISOString().split('T')[0]

    const { data: fichajesActivos, error } = await supabase
      .from('fichajes')
      .select('empleado_id')
      .eq('fecha', hoy)
      .is('salida', null)

    if (error || !fichajesActivos || fichajesActivos.length === 0) {
      setEmpleados([])
      setTotalEmpleados(0)
      return
    }

    const ids = fichajesActivos.map(f => f.empleado_id)

    const { data: empleadosData } = await supabase
      .from('empleados')
      .select('*')
      .in('id', ids)

    if (empleadosData) {
      const empleadosConEstado = empleadosData.map(emp => ({
        ...emp,
        trabajandoAhora: true
      }))
      setEmpleados(empleadosConEstado)
      setTotalEmpleados(empleadosConEstado.length)
    }
  }

  
  // Fichar entrada
  const ficharEntrada = async (empleadoId: string) => {
    const ahora = new Date()

    const { data: fichajeHoy } = await supabase
      .from('fichajes')
      .select('*')
      .eq('empleado_id', empleadoId)
      .gte('entrada', ahora.toISOString().split('T')[0] + 'T00:00:00')
      .is('salida', null)
      .maybeSingle()

    if (fichajeHoy) {
      alert('Ya tienes una entrada activa.')
      return
    }

    const { error } = await supabase
      .from('fichajes')
      .insert({ empleado_id: empleadoId, entrada: ahora.toISOString() })

    if (error) {
      alert('Error al fichar entrada: ' + error.message)
    } else {
      alert(`✅ Entrada fichada a las ${ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`)
      cargarEmpleados()
    }
  }

  // Fichar salida
  const ficharSalida = async (empleadoId: string) => {
    const ahora = new Date()

    const { data: fichajeHoy } = await supabase
      .from('fichajes')
      .select('*')
      .eq('empleado_id', empleadoId)
      .gte('entrada', ahora.toISOString().split('T')[0] + 'T00:00:00')
      .is('salida', null)
      .maybeSingle()

    if (!fichajeHoy) {
      alert('No hay entrada activa.')
      return
    }

    const { error } = await supabase
      .from('fichajes')
      .update({ salida: ahora.toISOString() })
      .eq('id', fichajeHoy.id)

    if (error) {
      alert('Error al fichar salida: ' + error.message)
    } else {
      alert(`✅ Salida fichada a las ${ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`)
      cargarEmpleados()
    }
  }

  const eliminarEmpleado = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este empleado?')) {
      await supabase
        .from('empleados')
        .update({ activo: false })
        .eq('id', id)
      cargarEmpleados()
    }
  }

  const verHistorial = async (id: string, nombre: string) => {
    const { data } = await supabase
      .from('fichajes')
      .select('*')
      .eq('empleado_id', id)
      .order('entrada', { ascending: false })  // ← entrada en vez de fecha

    setHistorialEmpleado({ id, nombre, fichajes: data || [] })
  }

  const cargarSesionesActivas = async () => {
    const { data } = await supabase
      .from('sesiones')
      .select('*')
      .eq('estado', 'activa')
      .order('iniciada_en', { ascending: false })
    if (data) setSesionesActivas(data)
  }

  const cargarClientesHoy = async () => {
    const hoy = new Date().toISOString().split('T')[0]
    
    const { data } = await supabase
      .from('sesiones')
      .select('personas')
      .gte('iniciada_en', `${hoy}T00:00:00`)  // ← todas las de hoy
      // sin filtro de estado — cuenta activas Y cerradas
    
    if (data) {
      const total = data.reduce((sum, s) => sum + (s.personas || 0), 0)
      setClientesHoy(total)
    }
  }

  const cargarDatosGrafica = async (periodo: 'dia' | 'semana' | 'mes') => {
    const ahora = new Date()
    let datos: { label: string, total: number }[] = []

    if (periodo === 'dia') {
      // Últimas 24 horas por hora
      for (let i = 23; i >= 0; i--) {
        const desde = new Date(ahora)
        desde.setHours(ahora.getHours() - i, 0, 0, 0)
        const hasta = new Date(desde)
        hasta.setHours(desde.getHours() + 1, 0, 0, 0)

        const { data } = await supabase
          .from('pedidos')
          .select('precio')
          .gte('creado_en', desde.toISOString())
          .lt('creado_en', hasta.toISOString())

        const total = data?.reduce((sum, p) => sum + (p.precio || 0), 0) || 0
        datos.push({ label: `${desde.getHours()}h`, total })
      }
    } else if (periodo === 'semana') {
      // Últimos 7 días
      for (let i = 6; i >= 0; i--) {
        const fecha = new Date(ahora)
        fecha.setDate(ahora.getDate() - i)
        const dia = fecha.toISOString().split('T')[0]

        const { data } = await supabase
          .from('pedidos')
          .select('precio')
          .gte('creado_en', `${dia}T00:00:00`)
          .lte('creado_en', `${dia}T23:59:59`)

        const total = data?.reduce((sum, p) => sum + (p.precio || 0), 0) || 0
        const etiqueta = fecha.toLocaleDateString('es-ES', { weekday: 'short' })
        datos.push({ label: etiqueta, total })
      }
    } else if (periodo === 'mes') {
      // Últimos 30 días agrupados por semana
      for (let i = 3; i >= 0; i--) {
        const desde = new Date(ahora)
        desde.setDate(ahora.getDate() - (i + 1) * 7)
        const hasta = new Date(ahora)
        hasta.setDate(ahora.getDate() - i * 7)

        const { data } = await supabase
          .from('pedidos')
          .select('precio')
          .gte('creado_en', desde.toISOString())
          .lt('creado_en', hasta.toISOString())

        const total = data?.reduce((sum, p) => sum + (p.precio || 0), 0) || 0
        datos.push({ label: `Sem ${4 - i}`, total })
      }
    }

    setDatosGrafica(datos)
  }

  const darDeAltaEmpleado = async () => {
    if (!nuevoEmpleado.nombre || !nuevoEmpleado.apellido || !nuevoEmpleado.rol) {
      alert('Nombre, apellido y rol son obligatorios')
      return
    }
    if (!nuevoEmpleado.email || !nuevoEmpleado.password) {
      alert('Email y contraseña son obligatorios')
      return
    }

    const res = await fetch('/api/crear-empleado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoEmpleado)
    })

    const data = await res.json()

    if (!res.ok) {
      alert('Error: ' + data.error)
      return
    }

    setNuevoEmpleado({
      nombre: '',
      apellido: '',
      telefono: '',
      rol: 'camarero',
      turno_inicio: '',
      turno_cierre: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      foto_url: '',
      email: '',
      password: ''
      
    })

    setModalAltaEmpleado(false)
    cargarEmpleados()
  }

  const[nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre:'',
    apellido:'',
    telefono:'',
    rol: 'camarero',
    turno_inicio: '',
    turno_cierre: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    foto_url: '',
    email: '',
    password: ''
    
  })

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-slate-400">Cargando datos...</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gradient-anim mb-8">Panel de administración</h1>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Pedidos hoy</p>
          <p className="text-white text-3xl font-medium">{pedidosHoy}</p>
          <p className="text-blue-500 text-xs mt-2">📋 Totales</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Ingresos hoy</p>
          <p className="text-white text-3xl font-medium">{ingresosHoy}€</p>
          <p className="text-green-500 text-xs mt-2">💰 Ventas</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Platos en menú</p>
          <p className="text-white text-3xl font-medium">{totalPlatos}</p>
          <p className="text-blue-500 text-xs mt-2">🍽️ Activos</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Mesas ocupadas</p>
          <p className="text-white text-3xl font-medium">{mesasOcupadas}</p>
          <p className="text-orange-500 text-xs mt-2">🪑 Ahora mismo</p>
        </div>
      </div>

      {/* Segunda fila de tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Empleados — clickable */}
        <button
          onClick={() => setModalEmpleados(true)}
          className="bg-white rounded-2xl p-6 border border-slate-200 text-left hover:shadow-md hover:border-blue-300 transition-all"
        >
          <p className="text-slate-400 text-sm mb-1">Empleados activos</p>
          <p className="text-white text-3xl font-medium">{empleados.length}</p>
          <p className="text-blue-500 text-xs mt-2">👥 Ver empleados →</p>
        </button>

        {/* Ticket promedio */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Ticket promedio</p>
          <p className="text-white text-3xl font-medium">
            {pedidosHoy > 0 ? (ingresosHoy / pedidosHoy).toFixed(2) : 0}€
          </p>
          <p className="text-blue-500 text-xs mt-2">🧾 Por pedido</p>
        </div>

        {/* Clientes hoy */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Clientes hoy</p>
          <p className="text-white text-3xl font-medium">{clientesHoy}</p>
          <p className="text-purple-500 text-xs mt-2">🚶 Han pasado hoy</p>
        </div>

        {/* Mesas activas ahora */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Sesiones activas</p>
          <p className="text-white text-3xl font-medium">{sesionesActivas.length}</p>
          <p className="text-orange-500 text-xs mt-2">🪑 Mesas en uso</p>
        </div>

      </div>

      {/* Gráfica de ingresos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-gradient-anim">Ingresos</h2>
          <div className="flex gap-2">
            {(['dia', 'semana', 'mes'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodoGrafica(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  periodoGrafica === p
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                style={periodoGrafica === p
                  ? { background: 'linear-gradient(135deg,#d4a040,#c47a28)', boxShadow: '0 2px 8px rgba(212,160,64,0.4)' }
                  : { background: 'rgba(255,255,255,0.07)' }
                }
              >
                {p === 'dia' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>

        {datosGrafica.every(d => d.total === 0) ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-slate-400 text-sm">No hay datos para este periodo</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={datosGrafica} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#d4a040" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#c47a28" stopOpacity={0.85}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#98bce0' }} axisLine={{ stroke: 'rgba(255,255,255,0.12)' }} tickLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: '#98bce0' }} tickFormatter={(v) => `${v}€`} axisLine={false} tickLine={false}/>
              <Tooltip
                formatter={(value) => [`${value}€`, 'Ingresos']}
                contentStyle={{ background: '#0a1628', border: '1px solid rgba(212,160,64,0.3)', borderRadius: 10, color: '#e0f0ff' }}
                labelStyle={{ color: '#d4a040', fontWeight: 600 }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="total" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Sección de pedidos recientes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-bold text-gradient-anim mb-4">Últimos pedidos</h2>
        
        {pedidosRecientes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-slate-400 text-sm">No hay pedidos todavía</p>
            <p className="text-slate-300 text-xs mt-1">Cuando lleguen pedidos aparecerán aquí</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100">
                <tr>
                  <th className="text-left py-3 text-slate-400 font-medium text-xs">ID</th>
                  <th className="text-left py-3 text-slate-400 font-medium text-xs">Plato</th>
                  <th className="text-left py-3 text-slate-400 font-medium text-xs">Precio</th>
                  <th className="text-left py-3 text-slate-400 font-medium text-xs">Estado</th>
                  <th className="text-left py-3 text-slate-400 font-medium text-xs">Mesa</th>
                  <th className="text-left py-3 text-slate-400 font-medium text-xs">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidosRecientes.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-slate-50">
                    <td className="py-3 text-sm">#{pedido.id}</td>
                    <td className="py-3 text-sm font-medium">{pedido.plato_nombre}</td>
                    <td className="py-3 text-sm text-green-600">{pedido.precio}€</td>
                    <td className="py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        pedido.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        pedido.estado === 'pagado' ? 'bg-green-100 text-green-800' :
                        pedido.estado === 'preparando' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="py-3 text-sm">{pedido.mesa || '-'}</td>
                    <td className="py-3 text-sm text-slate-500">
                      {new Date(pedido.creado_en).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    

      {/* MODAL — Ver empleados */}
      {modalEmpleados && (
        <div
          onClick={() => setModalEmpleados(false)}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl"
          >
            {/* Cabecera — fija */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-white font-medium text-lg">Empleados activos</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setModalEmpleados(false); setModalAltaEmpleado(true) }}
                  className="text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
                  style={{ background: 'linear-gradient(135deg,#1e5c2e,#2d8a44)' }}
                >
                  + Nuevo empleado
                </button>
                <button onClick={() => setModalEmpleados(false)} className="text-slate-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">✕</button>
              </div>
            </div>

            {/* Lista de empleados */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {empleados.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No hay empleados activos</p>
              ) : (
                empleados.map((emp) => (
                  <div key={String(emp.id)} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    {/* Foto o inicial */}
                    <div className="w-12 h-12 rounded-full bg-[#0d1f3c] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {emp.foto_url ? (
                        <img src={emp.foto_url} alt={emp.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-lg">
                          {emp.nombre.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Datos */}
                    <div className="flex-1">
                      <p className="text-white font-medium">{emp.nombre} {emp.apellido}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{emp.rol} · {emp.telefono}</p>
                      <p className="text-slate-400 text-xs">
                        Turno: {emp.turno_inicio} — {emp.turno_cierre}
                      </p>
                    </div>

                    {/* Badge rol */}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      emp.rol === 'admin' ? 'bg-purple-100 text-purple-700' :
                      emp.rol === 'cocinero' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {emp.rol}
                    </span>

                    {/* Botones de acción */}
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={() => verHistorial(emp.id, emp.nombre)}
                        className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 rounded hover:bg-blue-50"
                        title="Ver historial"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => eliminarEmpleado(emp.id)}
                        className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50"
                        title="Eliminar empleado"
                      >
                        🗑️
                      </button>
                    </div>
                    {/* Botones de fichaje */}
                    <div className="flex gap-2">
                      {emp.trabajandoAhora ? (
                        <button
                          onClick={() => ficharSalida(emp.id)}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-lg transition"
                        >
                          Fichar salida
                        </button>
                      ) : (
                        <button
                          onClick={() => ficharEntrada(emp.id)}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-lg transition"
                        >
                          Fichar entrada
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL — Alta de empleado */}
      {modalAltaEmpleado && (
        <div
          onClick={() => setModalAltaEmpleado(false)}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-md flex flex-col max-h-[90vh] shadow-2xl"
          >
            {/* Cabecera — fija */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-white font-medium text-lg">Nuevo empleado</h2>
              <button onClick={() => setModalAltaEmpleado(false)} className="text-slate-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">✕</button>
            </div>

            {/* Formulario — scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Nombre *</label>
                  <input
                    type="text"
                    value={nuevoEmpleado.nombre}
                    onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, nombre: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Apellido *</label>
                  <input
                    type="text"
                    value={nuevoEmpleado.apellido}
                    onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, apellido: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="García"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Teléfono</label>
                <input
                  type="text"
                  value={nuevoEmpleado.telefono}
                  onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, telefono: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="612345678"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Rol *</label>
                <select
                  value={nuevoEmpleado.rol}
                  onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, rol: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                >
                  <option value="camarero">Camarero</option>
                  <option value="cocinero">Cocinero</option>
                  <option value="admin">Admin</option>
                  <option value="gerente">Gerente</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Turno inicio</label>
                  <input
                    type="time"
                    value={nuevoEmpleado.turno_inicio}
                    onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, turno_inicio: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Turno cierre</label>
                  <input
                    type="time"
                    value={nuevoEmpleado.turno_cierre}
                    onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, turno_cierre: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Fecha de inicio</label>
                <input
                  type="date"
                  value={nuevoEmpleado.fecha_inicio}
                  onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, fecha_inicio: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">URL de foto (opcional)</label>
                <input
                  type="text"
                  value={nuevoEmpleado.foto_url || ''}
                  onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, foto_url: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="https://ejemplo.com/foto.jpg"
                />
             </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Email *</label>
                <input
                  type="email"
                  value={nuevoEmpleado.email}
                  onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, email: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="juan@restaurante.com"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Contraseña *</label>
                <input
                  type="password"
                  value={nuevoEmpleado.password}
                  onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, password: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            {/* Footer — fijo */}
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end shrink-0">
              <button
                onClick={() => setModalAltaEmpleado(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.45)', color: '#fca5a5' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.22)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
              >
                Cancelar
              </button>
              <button
                onClick={darDeAltaEmpleado}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#1e5c2e,#2d8a44)', boxShadow: '0 2px 10px rgba(30,92,46,0.4)' }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = '' }}
              >
                ✓ Dar de alta
              </button>
            </div>
          </div>
        </div>
      )}

            {/* MODAL — Historial de fichajes */}
      {historialEmpleado && (
        <div
          onClick={() => setHistorialEmpleado(null)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-white font-medium">Historial de {historialEmpleado.nombre}</h2>
              <button onClick={() => setHistorialEmpleado(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {historialEmpleado.fichajes.length === 0 ? (
                <p className="text-slate-400 text-center">No hay fichajes registrados</p>
              ) : (
                <div className="space-y-2">
                  {historialEmpleado.fichajes.map((f) => (
                    <div key={f.id} className="flex justify-between items-center border-b pb-2 text-sm">
                      <span className="text-slate-600 font-medium">
                        {new Date(f.entrada).toLocaleDateString('es-ES')}
                      </span>
                      <span className="text-green-600">
                        ↗ {new Date(f.entrada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-red-500">
                        ↘ {f.salida ? new Date(f.salida).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}