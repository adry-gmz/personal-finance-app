import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import type { DebtInputData, DebtPaymentInputData } from '@/services/debts'
import {
  createDebt,
  createDebtPayment,
  deleteDebt,
  deleteDebtPayment,
  getDebts,
  getPaymentsForDebt,
  updateDebt,
} from '@/services/debts'

export function useDebts() {
  return useQuery({ queryKey: ['debts'], queryFn: getDebts })
}

/** Historial de una deuda. Solo se pide cuando el usuario lo despliega. */
export function useDebtPayments(debtId: string | null) {
  return useQuery({
    queryKey: ['debt-payments-for', debtId],
    queryFn: () => getPaymentsForDebt(debtId!),
    enabled: debtId !== null,
  })
}

/**
 * Alta, edición y borrado de deudas y de sus pagos.
 *
 * Todas las operaciones invalidan `debts`, incluso las que solo tocan un
 * pago. Es imprescindible: el trigger de PostgreSQL recalcula paid_amount y
 * status de la deuda al registrarse un pago, así que la copia en caché queda
 * obsoleta aunque la fila de la deuda no se haya tocado desde aquí.
 */
export function useDebtMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  function invalidateAffectedQueries() {
    queryClient.invalidateQueries({ queryKey: ['debts'] })
    queryClient.invalidateQueries({ queryKey: ['debt-payments'] })
    queryClient.invalidateQueries({ queryKey: ['debt-payments-for'] })
  }

  const create = useMutation({
    mutationFn: (input: DebtInputData) => {
      if (!user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
      return createDebt(user.id, input)
    },
    onSuccess: invalidateAffectedQueries,
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: DebtInputData }) => updateDebt(id, input),
    onSuccess: invalidateAffectedQueries,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteDebt(id),
    onSuccess: invalidateAffectedQueries,
  })

  const addPayment = useMutation({
    mutationFn: ({ debtId, input }: { debtId: string; input: DebtPaymentInputData }) =>
      createDebtPayment(debtId, input),
    onSuccess: invalidateAffectedQueries,
  })

  const removePayment = useMutation({
    mutationFn: (id: string) => deleteDebtPayment(id),
    onSuccess: invalidateAffectedQueries,
  })

  return { create, update, remove, addPayment, removePayment }
}
