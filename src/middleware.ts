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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const esProtegida = RUTAS_PROTEGIDAS.some(r => pathname.startsWith(r))

  // 1. Creamos una respuesta base
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Inicializamos el cliente de Supabase específico para Middleware
  // Esto refresca automáticamente el token si ha expirado (¡Crucial para seguridad!)
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

  // 3. Obtenemos el usuario real de la sesión (Forma segura y oficial)
  const { data: { user } } = await supabase.auth.getUser()
  const tieneSesion = !!user

  // 4. Lógica de Redirección (Tu lógica original mejorada)
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

// Configuración nativa que Next.js SÍ va a leer
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
