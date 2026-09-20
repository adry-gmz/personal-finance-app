import { supabase } from '@/lib/supabase'
import type { Category } from '@/types/database'

/**
 * Servicio de categorías.
 *
 * Cada usuario tiene las suyas. Son la base de los formularios: una
 * transacción no puede existir sin categoría, y su tipo debe coincidir
 * (un gasto solo admite categorías de gasto).
 */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('type', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error('No se pudieron cargar las categorías.')

  return data
}
