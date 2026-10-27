import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RUTAS_PROTEGIDAS = [
  '/dashboard',
  '/pedidos',
  '/menu',
  '/cocina',
  '/qr',
  '/reservas',
]

// CAMBIADO: Ahora la función se llama proxy en lugar de middleware
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const esProtegida = RUTAS_PROTEGIDAS.some(r => pathname.startsWith(r))

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set({ name, value, ...options }))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const tieneSesion = !!user

  if (esProtegida && !tieneSesion) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname) 
    return NextResponse.redirect(url)
  }

  if (pathname === '/login' && tieneSesion) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/pedidos/:path*',
    '/menu/:path*',
    '/cocina/:path*',
    '/qr/:path*',
    '/reservas/:path*',
    '/login',
  ],
}
