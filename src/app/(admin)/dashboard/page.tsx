export default function Dashboard() {
  return (
    <div>

      <h1 className="text-2xl font-medium text-[#0d1f3c] mb-8">Panel de administración</h1>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-4 gap-6 mb-8">

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Pedidos hoy</p>
          <p className="text-[#0d1f3c] text-3xl font-medium">0</p>
          <p className="text-blue-500 text-xs mt-2">↑ Sin datos aún</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Ingresos hoy</p>
          <p className="text-[#0d1f3c] text-3xl font-medium">0€</p>
          <p className="text-blue-500 text-xs mt-2">↑ Sin datos aún</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Platos en menú</p>
          <p className="text-[#0d1f3c] text-3xl font-medium">8</p>
          <p className="text-blue-500 text-xs mt-2">↑ Activos</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <p className="text-slate-400 text-sm mb-1">Empleados</p>
          <p className="text-[#0d1f3c] text-3xl font-medium">0</p>
          <p className="text-blue-500 text-xs mt-2">↑ Sin datos aún</p>
        </div>

      </div>

      {/* Sección de pedidos recientes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-[#0d1f3c] text-base font-medium mb-4">Pedidos recientes</h2>
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-slate-400 text-sm">No hay pedidos todavía</p>
          <p className="text-slate-300 text-xs mt-1">Cuando lleguen pedidos aparecerán aquí</p>
        </div>
      </div>

    </div>
  )
}