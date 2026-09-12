import { createClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from '@/lib/env'
import type { Database } from '@/types/database'

if (!isSupabaseConfigured) {
  console.warn(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y completa los valores de tu proyecto Supabase.',
  )
}

/**
 * Cliente único de Supabase para toda la aplicación.
 *
 * Está tipado con el esquema de la base de datos, así que las consultas
 * verifican nombres de tablas y columnas en tiempo de compilación.
 *
 * Solo los módulos de `src/services/` deberían importarlo: los componentes
 * acceden a los datos a través de los hooks.
 */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
