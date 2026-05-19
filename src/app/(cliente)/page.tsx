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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const mesa = urlParams.get('mesa')
    
    if (token && mesa) {
      setTokenActivo(token)
      setMesaActiva(parseInt(mesa))
      setVistaActiva('menu')

      // Activa la mesa automáticamente en Supabase
      supabase
        .from('mesas')
        .update({ estado: 'ocupada' })
        .eq('numero', parseInt(mesa))
        .then(({ error }) => {
          if (error) console.error('Error activando mesa:', error)
        })
    }
  }, [])

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