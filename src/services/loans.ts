import { supabase } from '@/lib/supabase'
import type { Loan, LoanRepayment, LoanStatus } from '@/types/database'
import type { MonthPeriod } from '@/utils/dates'
import { periodEnd, periodStart } from '@/utils/dates'

/**
 * Servicio de "Por cobrar": dinero que el usuario prestó.
 *
 * Es el reflejo de debts. received_amount y status los mantiene el trigger
 * de la base de datos a partir de loan_repayments.
 */

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function normalizeLoan(row: Loan): Loan {
  return {
    ...row,
    principal_amount: toNumber(row.principal_amount),
    total_amount: toNumber(row.total_amount),
    received_amount: toNumber(row.received_amount),
    interest_rate: row.interest_rate === null ? null : toNumber(row.interest_rate),
  }
}

function describeWriteError(code: string | undefined, fallback: string): string {
  switch (code) {
    case '23514':
      return 'Los montos deben ser mayores que cero y el total no puede ser menor que lo prestado.'
    case '42501':
      return 'No tienes permiso para modificar este registro.'
    default:
      return fallback
  }
}

export async function getLoans(): Promise<Loan[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .order('status', { ascending: true })
    .order('loan_date', { ascending: false })

  if (error) throw new Error('No se pudieron cargar los préstamos.')
  return data.map(normalizeLoan)
}

export type LoanInputData = {
  borrower_name: string
  principal_amount: number
  interest_rate: number | null
  total_amount: number
  loan_date: string
  due_date: string | null
  status: LoanStatus
  notes: string
}

export async function createLoan(userId: string, input: LoanInputData): Promise<Loan> {
  const { data, error } = await supabase
    .from('loans')
    .insert({ ...input, user_id: userId })
    .select()
    .single()

  if (error) throw new Error(describeWriteError(error.code, 'No se pudo guardar el préstamo.'))
  return normalizeLoan(data)
}

export async function updateLoan(id: string, input: LoanInputData): Promise<Loan> {
  const { data, error } = await supabase
    .from('loans')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(describeWriteError(error.code, 'No se pudo actualizar el préstamo.'))
  return normalizeLoan(data)
}

/** Borra también el historial de cobros, en cascada. */
export async function deleteLoan(id: string): Promise<void> {
  const { error } = await supabase.from('loans').delete().eq('id', id)
  if (error) throw new Error('No se pudo eliminar el préstamo.')
}

export async function getRepaymentsForLoan(loanId: string): Promise<LoanRepayment[]> {
  const { data, error } = await supabase
    .from('loan_repayments')
    .select('*')
    .eq('loan_id', loanId)
    .order('date', { ascending: false })

  if (error) throw new Error('No se pudo cargar el historial de cobros.')
  return data.map((row) => ({ ...row, amount: toNumber(row.amount) }))
}

/** Cobros recibidos dentro de un mes, para el dashboard. */
export async function getRepaymentsByPeriod(period: MonthPeriod): Promise<LoanRepayment[]> {
  const { data, error } = await supabase
    .from('loan_repayments')
    .select('*')
    .gte('date', periodStart(period))
    .lte('date', periodEnd(period))

  if (error) throw new Error('No se pudieron cargar los cobros del mes.')
  return data.map((row) => ({ ...row, amount: toNumber(row.amount) }))
}

export type RepaymentInputData = {
  amount: number
  date: string
  description: string
}

export async function createRepayment(
  loanId: string,
  input: RepaymentInputData,
): Promise<LoanRepayment> {
  const { data, error } = await supabase
    .from('loan_repayments')
    .insert({ ...input, loan_id: loanId })
    .select()
    .single()

  if (error) throw new Error(describeWriteError(error.code, 'No se pudo registrar el cobro.'))
  return { ...data, amount: toNumber(data.amount) }
}

export async function deleteRepayment(id: string): Promise<void> {
  const { error } = await supabase.from('loan_repayments').delete().eq('id', id)
  if (error) throw new Error('No se pudo eliminar el cobro.')
}
