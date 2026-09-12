/**
 * Variables de entorno de la aplicación.
 *
 * Solo se exponen al navegador las variables con prefijo `VITE_`.
 * La anon key de Supabase es pública por diseño: la seguridad real
 * está en las políticas RLS de PostgreSQL, no en ocultar esta clave.
 * Nunca coloques aquí la `service_role` key.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Si falta la configuración usamos valores de marcador para que el cliente
 * de Supabase pueda construirse y la app muestre un aviso claro en pantalla,
 * en lugar de fallar con una pantalla en blanco.
 */
export const env = {
  supabaseUrl: url || 'https://placeholder.supabase.co',
  supabaseAnonKey: anonKey || 'placeholder-anon-key',
}
