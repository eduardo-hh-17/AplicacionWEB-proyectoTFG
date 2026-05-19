import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'sb-ahmcpczngnuhmfwaibfa-auth-token',
      storage: {
        getItem: (key) => {
          if (typeof window === 'undefined') return null
          return window.localStorage.getItem(key) ?? window.document.cookie
            .split('; ')
            .find(row => row.startsWith(key))
            ?.split('=')[1] ?? null
        },
        setItem: (key, value) => {
          if (typeof window === 'undefined') return
          window.localStorage.setItem(key, value)
          // También guarda en cookie para que el middleware lo lea
          document.cookie = `${key}=${value}; path=/; max-age=604800; SameSite=Lax`
        },
        removeItem: (key) => {
          if (typeof window === 'undefined') return
          window.localStorage.removeItem(key)
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        }
      }
    }
  }
)