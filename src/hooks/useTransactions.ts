import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCategories } from '@/services/categories'
import type { TransactionInput } from '@/services/transactions'
import {
  createTransaction,
  deleteTransaction,
  getTransactionsByPeriod,
  updateTransaction,
} from '@/services/transactions'
import { useAuth } from '@/hooks/useAuth'
import type { MonthPeriod } from '@/utils/dates'

/** Las categorías cambian poco, así que se cachean durante toda la sesión. */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 10 * 60_000,
  })
}

export function useTransactions(period: MonthPeriod) {
  return useQuery({
    queryKey: ['transactions', period.year, period.month],
    queryFn: () => getTransactionsByPeriod(period),
  })
}

/**
 * Crear, editar y eliminar movimientos.
 *
 * Tras cada operación se invalidan las consultas afectadas para que la lista
 * y el dashboard se actualicen solos. Se invalida por prefijo (`transactions`
 * sin mes) porque al cambiar la fecha de un movimiento este puede saltar de
 * un mes a otro, y ambos meses quedan desactualizados.
 */
export function useTransactionMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  function invalidateAffectedQueries() {
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['yearly-totals'] })
  }

  const create = useMutation({
    mutationFn: (input: TransactionInput) => {
      if (!user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
      return createTransaction(user.id, input)
    },
    onSuccess: invalidateAffectedQueries,
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransactionInput }) =>
      updateTransaction(id, input),
    onSuccess: invalidateAffectedQueries,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: invalidateAffectedQueries,
  })

  return { create, update, remove }
}
