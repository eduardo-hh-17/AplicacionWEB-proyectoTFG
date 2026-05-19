import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {

  const rutasProtegidas = ['/dashboard', '/pedidos', '/menu', '/cocina', '/qr']
  const esRutaProtegida = rutasProtegidas.some(ruta =>
    req.nextUrl.pathname.startsWith(ruta)
  )

  const cookiesSesion = req.cookies.getAll().filter(c =>
    c.name.includes('auth-token') || c.name.includes('supabase')
  )

  const tieneSesion = cookiesSesion.length > 0

  if (esRutaProtegida && !tieneSesion) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (req.nextUrl.pathname === '/login' && tieneSesion) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/pedidos/:path*', '/menu/:path*', '/cocina/:path*', '/qr/:path*', '/login']
}