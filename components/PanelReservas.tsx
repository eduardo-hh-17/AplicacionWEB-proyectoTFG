'use client'

import { useState } from 'react'

export default function PanelReservas() {
  const [fecha, setFecha] = useState('')
  const [personas, setPersonas] = useState(2)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fecha || !nombre || !telefono) {
      alert('Por favor, completa todos los campos obligatorios')
      return
    }
    
    // Aquí puedes enviar los datos a tu backend
    console.log({
      fecha,
      personas,
      nombre,
      telefono,
      mensaje
    })
    
    setEnviado(true)
    setTimeout(() => setEnviado(false), 3000)
    
    // Limpiar formulario
    setFecha('')
    setPersonas(2)
    setNombre('')
    setTelefono('')
    setMensaje('')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📅 Reservas</h1>
      
      {enviado && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          ✅ ¡Reserva enviada! Te contactaremos para confirmar.
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4">
          <h2 className="text-white text-xl font-bold">Solicitar Reserva</h2>
          <p className="text-orange-100 text-sm">Completa el formulario y te confirmamos disponibilidad</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Nombre completo *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Teléfono *</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+504 XXXX-XXXX"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Fecha y hora *</label>
              <input
                type="datetime-local"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Número de personas</label>
              <input
                type="number"
                min="1"
                max="20"
                value={personas}
                onChange={(e) => setPersonas(parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">Mensaje adicional</label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Alergias, ocasión especial (cumpleaños, aniversario), preferencia de mesa..."
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all"
          >
            📅 Solicitar Reserva
          </button>
        </form>
      </div>
      
      <div className="mt-6 bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-gray-600 text-sm">
          📞 También puedes llamarnos al <strong className="text-orange-600">+504 1234-5678</strong> para reservar directamente
        </p>
      </div>
    </div>
  )
}