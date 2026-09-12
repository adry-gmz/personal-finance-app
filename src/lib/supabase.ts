import { createClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from '@/lib/env'

if (!isSupabaseConfigured) {
  console.warn(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y completa los valores de tu proyecto Supabase.',
  )
}

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
