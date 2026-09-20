import { supabase } from '@/lib/supabase'
import type { Debt, DebtPayment, DebtStatus } from '@/types/database'
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

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

export type DebtInputData = {
  name: string
  total_amount: number
  interest_rate: number | null
  due_date: string | null
  status: DebtStatus
}

export type DebtPaymentInputData = {
  amount: number
  date: string
  description: string
}

function describeWriteError(code: string | undefined, fallback: string): string {
  switch (code) {
    case '23514':
      return 'Los datos no cumplen las reglas: el monto debe ser mayor que cero.'
    case '42501':
      return 'No tienes permiso para modificar este registro.'
    default:
      return fallback
  }
}

/**
 * Crea una deuda.
 *
 * No enviamos paid_amount: arranca en 0 y a partir de ahí lo mantiene el
 * trigger desde los pagos. De hecho la base de datos revoca el permiso de
 * escritura sobre esa columna, así que un intento de enviarla fallaría.
 */
export async function createDebt(userId: string, input: DebtInputData): Promise<Debt> {
  const { data, error } = await supabase
    .from('debts')
    .insert({ ...input, user_id: userId })
    .select()
    .single()

  if (error) throw new Error(describeWriteError(error.code, 'No se pudo guardar la deuda.'))

  return normalizeDebt(data)
}

export async function updateDebt(id: string, input: DebtInputData): Promise<Debt> {
  const { data, error } = await supabase
    .from('debts')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(describeWriteError(error.code, 'No se pudo actualizar la deuda.'))

  return normalizeDebt(data)
}

/** Eliminar una deuda borra también su historial de pagos, en cascada. */
export async function deleteDebt(id: string): Promise<void> {
  const { error } = await supabase.from('debts').delete().eq('id', id)

  if (error) throw new Error('No se pudo eliminar la deuda.')
}

/** Historial completo de una deuda, del pago más reciente al más antiguo. */
export async function getPaymentsForDebt(debtId: string): Promise<DebtPayment[]> {
  const { data, error } = await supabase
    .from('debt_payments')
    .select('*')
    .eq('debt_id', debtId)
    .order('date', { ascending: false })

  if (error) throw new Error('No se pudo cargar el historial de pagos.')

  return data.map((row) => ({ ...row, amount: toNumber(row.amount) }))
}

/**
 * Registra un pago.
 *
 * Después de esto, paid_amount y status de la deuda quedan desactualizados
 * en la caché: el trigger los recalculó en la base de datos, así que hay que
 * volver a pedir la deuda en lugar de ajustarla a mano en el cliente.
 */
export async function createDebtPayment(
  debtId: string,
  input: DebtPaymentInputData,
): Promise<DebtPayment> {
  const { data, error } = await supabase
    .from('debt_payments')
    .insert({ ...input, debt_id: debtId })
    .select()
    .single()

  if (error) throw new Error(describeWriteError(error.code, 'No se pudo registrar el pago.'))

  return { ...data, amount: toNumber(data.amount) }
}

export async function deleteDebtPayment(id: string): Promise<void> {
  const { error } = await supabase.from('debt_payments').delete().eq('id', id)

  if (error) throw new Error('No se pudo eliminar el pago.')
}
