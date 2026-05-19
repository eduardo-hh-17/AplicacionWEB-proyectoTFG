'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import QRMesa from '@/components/admin/QRMesa'

type QRData = {
  id: number
  mesa_id: number
  codigo: string
  activo: boolean
  mesas: {
    numero: number
  }
}

export default function QRPage() {

  const [qrs, setQrs] = useState<QRData[]>([])
  const [cargando, setCargando] = useState(true)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    cargarQRs()
  }, [])

  const cargarQRs = async () => {
    const { data } = await supabase
      .from('qr_mesas')
      .select('*, mesas(numero)')
      .eq('activo', true)
      .order('id')
    if (data) setQrs(data)
    setCargando(false)
  }

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Cargando QRs...</p>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium text-[#0d1f3c]">Códigos QR</h1>
          <p className="text-slate-400 text-sm mt-1">
            Imprime o descarga el QR de cada mesa para que los clientes puedan pedir
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {qrs.map((qr) => (
          <QRMesa
            key={qr.id}
            mesa={qr.mesas.numero}
            codigo={qr.codigo}
            url={`${baseUrl}?mesa=${qr.mesas.numero}&token=${qr.codigo}`}
          />
        ))}
      </div>
    </div>
  )
}