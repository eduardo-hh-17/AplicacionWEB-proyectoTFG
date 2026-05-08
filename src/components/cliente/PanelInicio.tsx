export default function PanelInicio() {
  return (
    <div className="p-6">
      {/* Hero simplificado */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-8 text-white mb-8">
        <h1 className="text-3xl font-bold">Bienvenido a Restaurante Lempira</h1>
        <p className="mt-2">Tradición hondureña en cada plato</p>
      </div>

      {/* Tarjetas de estadísticas como en CARHUB */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-sm">Clientes hoy</p>
          <p className="text-3xl font-bold">147</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-sm">Pedidos hoy</p>
          <p className="text-3xl font-bold">89</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-sm">Reservas hoy</p>
          <p className="text-3xl font-bold">23</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-500 text-sm">Valoración</p>
          <p className="text-3xl font-bold">⭐ 4.8</p>
        </div>
      </div>

      {/* Últimos pedidos */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b">
          <h2 className="font-bold">Últimos pedidos</h2>
        </div>
        <div className="divide-y">
          {/* Aquí iría la lista de pedidos recientes */}
        </div>
      </div>
    </div>
  )
}