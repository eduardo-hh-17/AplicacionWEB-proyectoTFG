'use client'

type Vista = 'inicio' | 'sobre' | 'reservas' | 'contacto' | 'menu'

const menuItems = [
  { id: 'inicio' as Vista, icono: '🏠', nombre: 'Inicio' },
  { id: 'sobre' as Vista, icono: '📖', nombre: 'Sobre Nosotros' },
  { id: 'reservas' as Vista, icono: '📅', nombre: 'Reservas' },
  { id: 'contacto' as Vista, icono: '📞', nombre: 'Contacto' },
  { id: 'menu' as Vista, icono: '🍔', nombre: 'Menú' },
]

export default function LayoutLateral({ 
  children,
  vistaActiva,
  onCambiarVista 
}: { 
  children: React.ReactNode
  vistaActiva: Vista
  onCambiarVista: (vista: Vista) => void 
}) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Menú lateral */}
      <aside className="w-72 bg-[#0d1f3c] text-white flex flex-col shadow-xl">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-2xl font-bold hover:scale-105 transition-transform duration-200">🍽️ Lempira</h1>
          <p className="text-sm text-blue-300 mt-1">Restaurante</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onCambiarVista(item.id)}
              className={`group w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-out
                ${vistaActiva === item.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-300 hover:bg-blue-800 hover:text-white hover:translate-x-1 hover:shadow-md'
                } active:scale-95`}
            >
              <span className={`text-xl transition-all duration-200 ${vistaActiva !== item.id && 'group-hover:scale-110 group-hover:rotate-6'}`}>
                {item.icono}
              </span>
              <span>{item.nombre}</span>
              {vistaActiva === item.id && (
                <span className="ml-auto text-sm animate-pulse">✓</span>
              )}
              {vistaActiva !== item.id && (
                <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm">→</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-800 text-xs text-blue-300">
          <p>© 2025 Restaurante Lempira</p>
        </div>
      </aside>

      {/* Panel central */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}