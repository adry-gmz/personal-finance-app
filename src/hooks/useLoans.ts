import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import type { LoanInputData, RepaymentInputData } from '@/services/loans'
import {
  createLoan,
  createRepayment,
  deleteLoan,
  deleteRepayment,
  getLoans,
  getRepaymentsForLoan,
  updateLoan,
} from '@/services/loans'

export function useLoans() {
  return useQuery({ queryKey: ['loans'], queryFn: getLoans })
}

export function useLoanRepayments(loanId: string) {
  return useQuery({
    queryKey: ['loan-repayments-for', loanId],
    queryFn: () => getRepaymentsForLoan(loanId),
  })
}

/**
 * Igual que en deudas: registrar o borrar un cobro invalida también
 * `loans`, porque el trigger recalcula received_amount y status.
 */
export function useLoanMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['loans'] })
    queryClient.invalidateQueries({ queryKey: ['loan-repayments'] })
    queryClient.invalidateQueries({ queryKey: ['loan-repayments-for'] })
  }

  const create = useMutation({
    mutationFn: (input: LoanInputData) => {
      if (!user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
      return createLoan(user.id, input)
    },
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: LoanInputData }) => updateLoan(id, input),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteLoan(id),
    onSuccess: invalidate,
  })

  const addRepayment = useMutation({
    mutationFn: ({ loanId, input }: { loanId: string; input: RepaymentInputData }) =>
      createRepayment(loanId, input),
    onSuccess: invalidate,
  })

  const removeRepayment = useMutation({
    mutationFn: (id: string) => deleteRepayment(id),
    onSuccess: invalidate,
  })

  return { create, update, remove, addRepayment, removeRepayment }
}
