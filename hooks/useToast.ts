import { useState, useCallback } from 'react'

type ToastType = {
  message: string
  type: 'success' | 'error' | 'info'
  id: number
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { message, type, id }])
    
    // Auto remover después de 3 segundos
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, showToast, removeToast }
}