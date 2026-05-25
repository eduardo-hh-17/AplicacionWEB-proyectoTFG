'use client'

import { useState, useEffect } from 'react'

type ToastProps = {
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
  onClose: () => void
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }[type]

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] ${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl min-w-[300px] text-center`}>
      <div className="flex items-center gap-3">
        {type === 'success' && <span></span>}
        {type === 'error' && <span>❌</span>}
        {type === 'info' && <span>ℹ️</span>}
        <span>{message}</span>
      </div>
    </div>
  )
}