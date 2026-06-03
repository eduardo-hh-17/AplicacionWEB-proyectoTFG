import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RUTAS_PROTEGIDAS = [
  '/dashboard',
  '/pedidos',
  '/menu',
  '/cocina',
  '/qr',
  '/reservas',   // ← estaba fuera, ahora protegida
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const esProtegida = RUTAS_PROTEGIDAS.some(r => pathname.startsWith(r))

  // Verificación mejorada: buscamos la cookie de token de Supabase
  // y comprobamos que tenga contenido (no solo el nombre)
  const cookies = req.cookies.getAll()
  const cookieSesion = cookies.find(c =>
    (c.name.includes('sb-') && c.name.endsWith('-auth-token')) ||
    c.name === 'sb-access-token'
  )
  const tieneSesion = !!(cookieSesion?.value && cookieSesion.value.length > 20)

  // Ruta protegida sin sesión → redirigir a login
  if (esProtegida && !tieneSesion) {
    const url = new URL('/login', req.url)
    url.searchParams.set('from', pathname)   // para volver después del login
    return NextResponse.redirect(url)
  }

  // Ya logueado y va al login → dashboard
  if (pathname === '/login' && tieneSesion) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/pedidos/:path*',
    '/menu/:path*',
    '/cocina/:path*',
    '/qr/:path*',
    '/reservas/:path*',   // ← añadido
    '/login',
  ],
}
