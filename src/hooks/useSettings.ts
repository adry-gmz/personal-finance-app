import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import type { CategoryInputData } from '@/services/categories'
import { createCategory, deleteCategory, updateCategory } from '@/services/categories'
import { updateProfile } from '@/services/profiles'
import type { TransactionType } from '@/types/database'

export function useProfileMutation() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (changes: { username: string; full_name: string }) => {
      if (!user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
      return updateProfile(user.id, changes)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  })
}

/**
 * Tras cambiar una categoría también se invalidan las transacciones: las
 * listas y los gráficos muestran el nombre y el color de la categoría.
 */
export function useCategoryMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }

  const create = useMutation({
    mutationFn: ({ type, input }: { type: TransactionType; input: CategoryInputData }) => {
      if (!user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
      return createCategory(user.id, type, input)
    },
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryInputData }) =>
      updateCategory(id, input),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
