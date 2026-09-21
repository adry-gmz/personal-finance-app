import { supabase } from '@/lib/supabase'
import type { Category, TransactionType } from '@/types/database'

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

export type CategoryInputData = {
  name: string
  color: string
}

function describeWriteError(code: string | undefined, fallback: string): string {
  switch (code) {
    case '23505': // unique_violation: (user_id, type, name)
      return 'Ya tienes una categoría con ese nombre.'
    case '23503': // foreign_key_violation: hay transacciones que la usan
      return 'Esta categoría tiene movimientos registrados. Cámbialos a otra categoría antes de eliminarla.'
    case '23514':
      return 'El nombre no puede estar vacío y el color debe ser un código hexadecimal.'
    default:
      return fallback
  }
}

export async function createCategory(
  userId: string,
  type: TransactionType,
  input: CategoryInputData,
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...input, type, user_id: userId })
    .select()
    .single()

  if (error) throw new Error(describeWriteError(error.code, 'No se pudo crear la categoría.'))
  return data
}

/**
 * Solo se editan nombre y color. El tipo no se puede cambiar: las
 * transacciones apuntan a la categoría por (id, type), así que cambiarlo
 * dejaría sus movimientos apuntando a una combinación que ya no existe.
 */
export async function updateCategory(id: string, input: CategoryInputData): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(describeWriteError(error.code, 'No se pudo actualizar la categoría.'))
  return data
}

/**
 * La base de datos impide borrar una categoría en uso (ON DELETE RESTRICT),
 * así que no hace falta comprobarlo antes: si tiene movimientos, falla con
 * un mensaje que explica por qué.
 */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) throw new Error(describeWriteError(error.code, 'No se pudo eliminar la categoría.'))
}
