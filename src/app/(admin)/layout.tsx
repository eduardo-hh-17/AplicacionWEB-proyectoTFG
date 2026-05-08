import React from 'react'
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      
      {/* Navbar del admin */}
      <nav className="h-14 bg-[#0d1f3c] flex items-center px-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-sm">
            🍽️
          </div>
          <span className="text-white text-sm font-medium">Restaurante Lempira — Admin</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="/dashboard" className="text-slate-300 hover:text-white text-sm transition-colors">Dashboard</a>
          <a href="/pedidos" className="text-slate-300 hover:text-white text-sm transition-colors">Pedidos</a>
          <a href="/menu" className="text-slate-300 hover:text-white text-sm transition-colors">Menú</a>
          <a href="/login" className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">Cerrar sesión</a>
        </div>
      </nav>

      {/* Contenido de cada página */}
      <main className="p-8">
        {children}
      </main>

    </div>
  )
}