import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const rutasProtegidas = ['/dashboard', '/pedidos', '/menu', '/cocina', '/qr']
  const esRutaProtegida = rutasProtegidas.some(ruta =>
    req.nextUrl.pathname.startsWith(ruta)
  )

  // Buscar cualquier cookie que contenga 'sb-' (Supabase)
  const todasLasCookies = req.cookies.getAll()
  const tieneSesion = todasLasCookies.some(cookie => 
    cookie.name.includes('sb-') || cookie.name.includes('supabase')
  )

  // Si la ruta es protegida y no hay sesión → login
  if (esRutaProtegida && !tieneSesion) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Si ya está logueado y va al login → dashboard
  if (req.nextUrl.pathname === '/login' && tieneSesion) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/pedidos/:path*', '/menu/:path*', '/cocina/:path*', '/qr/:path*', '/login']
}