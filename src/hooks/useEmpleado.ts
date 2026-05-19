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
    
    // Obtener sesión de Supabase Auth
    const { data: { session } } = await supabase.auth.getSession()
    console.log('Session:', session)

    if (!session) {
      console.log('No hay sesión')
      setEmpleado(null)
      setCargando(false)
      return
    }

    console.log('Buscando empleado con id:', session.user.id)

    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .eq('id', session.user.id)
      .single()

    console.log('Empleado encontrado:', data)
    console.log('Error:', error)

    if (error) {
      console.error('Error cargando empleado:', error)
      setEmpleado(null)
    } else {
      setEmpleado(data)
    }
    setCargando(false)
  }

  return { empleado, cargando }
}