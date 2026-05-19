'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

type Props = {
  mesa: number
  codigo: string
  url: string
}

export default function QRMesa({ mesa, codigo, url }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#0d1f3c',
          light: '#ffffff'
        }
      })
    }
  }, [url])

  const descargarQR = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `mesa-${mesa}-qr.png`
    link.href = canvasRef.current.toDataURL()
    link.click()
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col items-center gap-3">
      <p className="text-[#0d1f3c] font-medium text-sm">Mesa {mesa}</p>
      <canvas ref={canvasRef} className="rounded-xl" />
      <p className="text-slate-400 text-[10px] text-center break-all">{codigo}</p>
      <button
        onClick={descargarQR}
        className="w-full bg-[#0d1f3c] text-white py-2 rounded-xl text-xs font-medium hover:bg-[#1e3a6e] transition-colors"
      >
        ⬇️ Descargar QR
      </button>
    </div>
  )
}