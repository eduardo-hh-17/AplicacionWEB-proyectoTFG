'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Empleado = {
  id: string
  nombre: string
  apellido: string
  rol: 'admin' | 'camarero' | 'cocinero'
  activo: boolean
}

export function useEmpleado() {
  const [empleado, setEmpleado] = useState<Empleado | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    obtenerEmpleado()
  }, [])

  const obtenerEmpleado = async () => {
    setCargando(true)

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      setEmpleado(null)
      setCargando(false)
      return
    }

    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (error || !data) {
      setEmpleado(null)
    } else {
      setEmpleado(data)
    }
    setCargando(false)
  }

  return { empleado, cargando }
}
