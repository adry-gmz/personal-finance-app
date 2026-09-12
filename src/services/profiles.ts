import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

/**
 * Servicio de perfiles.
 *
 * `profiles` es la extensión pública de `auth.users`: guarda el nombre de
 * usuario, el nombre completo y el rol. La fila la crea automáticamente el
 * trigger `handle_new_user` al registrarse, así que aquí solo leemos y
 * actualizamos.
 */

/**
 * Devuelve el perfil del usuario indicado, o null si todavía no existe.
 *
 * Usamos `maybeSingle()` en vez de `single()` porque en el instante justo
 * después del registro la fila puede no haberse replicado aún, y no queremos
 * tratar eso como un error.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error('No se pudo cargar tu perfil.')

  return data
}

export async function updateProfile(
  userId: string,
  changes: { username?: string; full_name?: string },
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(changes)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    // 23505 = violación de restricción única: el username ya está tomado.
    if (error.code === '23505') {
      throw new Error('Ese nombre de usuario ya está en uso. Elige otro.')
    }
    throw new Error('No se pudieron guardar los cambios.')
  }

  return data
}
