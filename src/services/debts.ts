import { supabase } from '@/lib/supabase'
import type { Debt, DebtPayment } from '@/types/database'
import type { MonthPeriod } from '@/utils/dates'
import { periodEnd, periodStart } from '@/utils/dates'

/** Igual que en transactions: normalizamos los NUMERIC en el borde. */
function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function normalizeDebt(row: Debt): Debt {
  return {
    ...row,
    total_amount: toNumber(row.total_amount),
    paid_amount: toNumber(row.paid_amount),
    interest_rate: row.interest_rate === null ? null : toNumber(row.interest_rate),
  }
}

/** Todas las deudas del usuario, las activas primero. */
export async function getDebts(): Promise<Debt[]> {
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw new Error('No se pudieron cargar las deudas.')

  return data.map(normalizeDebt)
}

export type DebtPaymentWithDebt = DebtPayment & {
  debt: Pick<Debt, 'id' | 'name'> | null
}

/**
 * Pagos de deuda hechos dentro de un mes.
 *
 * `debt_payments` no tiene columnas year/month, así que aquí sí filtramos por
 * rango de fechas. Es igual de correcto; la diferencia es que aprovecha el
 * índice (debt_id, date) en lugar de uno por mes.
 */
export async function getDebtPaymentsByPeriod(
  period: MonthPeriod,
): Promise<DebtPaymentWithDebt[]> {
  const { data, error } = await supabase
    .from('debt_payments')
    .select('*, debt:debts(id, name)')
    .gte('date', periodStart(period))
    .lte('date', periodEnd(period))
    .order('date', { ascending: false })

  if (error) throw new Error('No se pudieron cargar los pagos de deudas.')

  return (data as DebtPaymentWithDebt[]).map((row) => ({
    ...row,
    amount: toNumber(row.amount),
  }))
}
