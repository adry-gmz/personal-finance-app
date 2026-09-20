import { supabase } from '@/lib/supabase'
import type { Fund, FundMovement } from '@/types/database'
import type { MonthPeriod } from '@/utils/dates'
import { periodEnd, periodStart } from '@/utils/dates'

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function normalizeFund(row: Fund): Fund {
  return {
    ...row,
    target_amount: toNumber(row.target_amount),
    current_amount: toNumber(row.current_amount),
  }
}

/**
 * Todos los fondos del usuario: provisiones y ahorros juntos.
 *
 * `current_amount` viene ya calculado por el trigger de la base de datos a
 * partir de fund_movements, así que no hay que sumar nada aquí.
 */
export async function getFunds(): Promise<Fund[]> {
  const { data, error } = await supabase
    .from('funds')
    .select('*')
    .order('type', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error('No se pudieron cargar los fondos.')

  return data.map(normalizeFund)
}

export type FundMovementWithFund = FundMovement & {
  fund: Pick<Fund, 'id' | 'name' | 'type'> | null
}

/** Aportes y retiros realizados dentro de un mes. */
export async function getFundMovementsByPeriod(
  period: MonthPeriod,
): Promise<FundMovementWithFund[]> {
  const { data, error } = await supabase
    .from('fund_movements')
    .select('*, fund:funds(id, name, type)')
    .gte('date', periodStart(period))
    .lte('date', periodEnd(period))
    .order('date', { ascending: false })

  if (error) throw new Error('No se pudieron cargar los movimientos de fondos.')

  return (data as FundMovementWithFund[]).map((row) => ({
    ...row,
    amount: toNumber(row.amount),
  }))
}
