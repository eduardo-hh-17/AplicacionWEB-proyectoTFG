'use client'

import { useState, useEffect } from 'react'
import LayoutLateral from '@/components/cliente/LayoutLateral'
import PanelInicio from '@/components/cliente/PanelInicio'
import PanelSobreNosotros from '@/components/cliente/PanelSobreNosotros'
import PanelReservas from '@/components/cliente/PanelReservas'
import PanelContacto from '@/components/cliente/PanelContacto'
import PanelMenu from '@/components/cliente/PanelMenu'
import { supabase } from '@/lib/supabase'

type Vista = 'inicio' | 'sobre' | 'reservas' | 'contacto' | 'menu'

export default function Home() {
  const [vistaActiva, setVistaActiva] = useState<Vista>('inicio')
  const [tokenActivo, setTokenActivo] = useState<string | null>(null)
  const [mesaActiva, setMesaActiva] = useState<number | null>(null)
  const [animando, setAnimando] = useState(false)
  const [errorQR, setErrorQR] = useState<string | null>(null)

  useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')
  const mesa = urlParams.get('mesa')
  
  if (token && mesa) {
    verificarToken(token, parseInt(mesa))
  }
}, [])

const verificarToken = async (token: string, numeroMesa: number) => {
  // Busca el QR en la base de datos
  const { data: qr, error } = await supabase
    .from('qr_mesas')
    .select('*, mesas(numero, estado)')
    .eq('codigo', token)
    .single()

  if (error || !qr) {
    setErrorQR('El código QR no es valido. Solicita al camarero un nuevo QR.')
    return
  }

  // Comprueba que el QR corresponde a la mesa correcta
  if (qr.mesas.numero !== numeroMesa) {
    setErrorQR('Este QR no corresponde a esta mesa. Pide ayuda al camarero.')
    return
  }

  // Comprueba que el QR está activo
  if (!qr.activo) {
    setErrorQR('Este QR está desactivado. Pide al camarero que active tu mesa.')
    return
  }

  // Todo correcto — activa la mesa y muestra el menú
  setTokenActivo(token)
  setMesaActiva(numeroMesa)
  setVistaActiva('menu')

  // Activa la mesa en Supabase
  await supabase
    .from('mesas')
    .update({ estado: 'ocupada' })
    .eq('numero', numeroMesa)
}

  const cambiarVista = (nuevaVista: Vista) => {
    // Inicia la animación de salida
    setAnimando(true)
    
    // Espera 200ms (la duración de la animación)
    setTimeout(() => {
      // Cambia el contenido
      setVistaActiva(nuevaVista)
      
      // Pequeño retraso para que la entrada se vea suave
      setTimeout(() => {
        setAnimando(false)
      }, 50)
    }, 200)
  }

  const renderizarPanel = () => {
    switch (vistaActiva) {
      case 'inicio':
        return <PanelInicio />
      case 'sobre':
        return <PanelSobreNosotros />
      case 'reservas':
        return <PanelReservas />
      case 'contacto':
        return <PanelContacto />
      case 'menu':
        return <PanelMenu tokenActivo={tokenActivo} mesaActiva={mesaActiva} />
      default:
        return <PanelInicio />
    }
  }

  if (errorQR) return (
    <div className="min-h-screen bg-[#0d1f3c] flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl p-8 max-w-sm text-center">
        <p className="text-4xl mb-4">❌</p>
        <h2 className="text-[#0d1f3c] text-xl font-medium mb-2">QR no válido</h2>
        <p className="text-slate-400 text-sm">{errorQR}</p>
      </div>
    </div>
  )

return (
  <LayoutLateral 
      vistaActiva={vistaActiva} 
      onCambiarVista={cambiarVista}
    >
      <div className="min-h-[500px] p-4">
        <div className={`transition-all duration-300 ease-out
          ${animando ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {renderizarPanel()}
        </div>
      </div>
    </LayoutLateral>
  )
}