'use client'

import { useState } from 'react'

export default function PanelContacto() {
  const [email, setEmail] = useState('')
  const [mensajeContacto, setMensajeContacto] = useState('')
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setEnviado(true)
    setTimeout(() => setEnviado(false), 3000)
    setEmail('')
    setMensajeContacto('')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📞 Contacto</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Columna izquierda - Información */}
        <div>
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Información de contacto</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="font-medium">Dirección</p>
                  <p className="text-gray-600">Calle Principal #123, Colonia Centro</p>
                  <p className="text-gray-600">San Pedro Sula, Honduras</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-medium">Teléfono</p>
                  <p className="text-gray-600">+504 1234-5678</p>
                  <p className="text-gray-600">+504 8765-4321</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">✉️</span>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-gray-600">info@restaurantelempira.com</p>
                  <p className="text-gray-600">reservas@restaurantelempira.com</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">⏰</span>
                <div>
                  <p className="font-medium">Horario</p>
                  <p className="text-gray-600">Lunes a Domingo: 12:00 - 23:00</p>
                  <p className="text-gray-600">Viernes y Sábado: 12:00 - 00:00</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-6 text-white text-center">
            <p className="text-4xl mb-2">🎉</p>
            <p className="font-bold">¿Evento especial?</p>
            <p className="text-sm mt-1">Consulta por nuestros paquetes para cumpleaños, aniversarios y eventos corporativos.</p>
          </div>
        </div>
        
        {/* Columna derecha - Formulario de contacto y mapa */}
        <div>
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Envíanos un mensaje</h2>
            
            {enviado && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                ✅ Mensaje enviado. Te responderemos pronto.
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Mensaje *</label>
                <textarea
                  value={mensajeContacto}
                  onChange={(e) => setMensajeContacto(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all"
              >
                📧 Enviar Mensaje
              </button>
            </form>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gray-200 h-48 flex items-center justify-center">
              <div className="text-center">
                <span className="text-4xl block mb-2">🗺️</span>
                <p className="text-gray-500 text-sm">Mapa de ubicación</p>
                <p className="text-gray-400 text-xs mt-1">Calle Principal #123, San Pedro Sula</p>
              </div>
            </div>
            <div className="p-4 text-center">
              <a 
                href="https://maps.google.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 text-sm font-medium"
              >
                Ver en Google Maps →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}