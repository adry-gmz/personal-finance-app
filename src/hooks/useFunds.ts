import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import type { FundInputData, FundMovementInputData } from '@/services/funds'
import {
  createFund,
  createFundMovement,
  deleteFund,
  deleteFundMovement,
  getFunds,
  getMovementsForFund,
  updateFund,
} from '@/services/funds'

export function useFunds() {
  return useQuery({ queryKey: ['funds'], queryFn: getFunds })
}

/** Historial de un fondo. Solo se pide cuando el usuario lo despliega. */
export function useFundMovements(fundId: string) {
  return useQuery({
    queryKey: ['fund-movements-for', fundId],
    queryFn: () => getMovementsForFund(fundId),
  })
}

/**
 * Alta, edición y borrado de fondos y de sus movimientos.
 *
 * Igual que en deudas y préstamos, cualquier cambio en un movimiento
 * invalida también `funds`: el trigger recalcula current_amount en la base
 * de datos, así que la copia en caché queda obsoleta.
 */
export function useFundMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['funds'] })
    queryClient.invalidateQueries({ queryKey: ['fund-movements'] })
    queryClient.invalidateQueries({ queryKey: ['fund-movements-for'] })
  }

  const create = useMutation({
    mutationFn: (input: FundInputData) => {
      if (!user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
      return createFund(user.id, input)
    },
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: FundInputData }) => updateFund(id, input),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteFund(id),
    onSuccess: invalidate,
  })

  const addMovement = useMutation({
    mutationFn: ({ fundId, input }: { fundId: string; input: FundMovementInputData }) =>
      createFundMovement(fundId, input),
    onSuccess: invalidate,
  })

  const removeMovement = useMutation({
    mutationFn: (id: string) => deleteFundMovement(id),
    onSuccess: invalidate,
  })

  return { create, update, remove, addMovement, removeMovement }
}
