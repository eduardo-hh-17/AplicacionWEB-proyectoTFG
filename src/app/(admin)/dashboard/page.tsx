'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Pedido = {
  id: number
  plato_nombre: string
  precio: number
  estado: string
  creado_en: string
  mesa: number | null
}

export default function Dashboard() {
  const [pedidosHoy, setPedidosHoy] = useState(0)
  const [ingresosHoy, setIngresosHoy] = useState(0)
  const [totalPlatos, setTotalPlatos] = useState(0)
  const [mesasOcupadas, setMesasOcupadas] = useState(0)
  const [empleados, setEmpleados] = useState(0)
  const [pedidosRecientes, setPedidosRecientes] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

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
    if (countEmpleados !== null) setEmpleados(countEmpleados)

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

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-slate-400">Cargando datos...</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-medium text-[#0d1f3c] mb-8">Panel de administración</h1>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Pedidos hoy</p>
          <p className="text-[#0d1f3c] text-3xl font-medium">{pedidosHoy}</p>
          <p className="text-blue-500 text-xs mt-2">📋 Totales</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Ingresos hoy</p>
          <p className="text-[#0d1f3c] text-3xl font-medium">{ingresosHoy}€</p>
          <p className="text-green-500 text-xs mt-2">💰 Ventas</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Platos en menú</p>
          <p className="text-[#0d1f3c] text-3xl font-medium">{totalPlatos}</p>
          <p className="text-blue-500 text-xs mt-2">🍽️ Activos</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Mesas ocupadas</p>
          <p className="text-[#0d1f3c] text-3xl font-medium">{mesasOcupadas}</p>
          <p className="text-orange-500 text-xs mt-2">🪑 Ahora mismo</p>
        </div>
      </div>

      {/* Segunda fila de tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Empleados activos</p>
          <p className="text-[#0d1f3c] text-3xl font-medium">{empleados}</p>
          <p className="text-blue-500 text-xs mt-2">👥 En plantilla</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Ticket promedio</p>
          <p className="text-[#0d1f3c] text-3xl font-medium">
            {pedidosHoy > 0 ? (ingresosHoy / pedidosHoy).toFixed(2) : 0}€
          </p>
          <p className="text-blue-500 text-xs mt-2">🧾 Por pedido</p>
        </div>
      </div>

      {/* Sección de pedidos recientes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-[#0d1f3c] text-base font-medium mb-4">Últimos pedidos</h2>
        
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
    </div>
  )
}