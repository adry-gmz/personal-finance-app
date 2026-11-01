import { supabase } from '@/lib/supabase'
import type { Fund, FundMovement, FundMovementType, FundType } from '@/types/database'
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

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

export type FundInputData = {
  name: string
  type: FundType
  target_amount: number
  target_date: string | null
}

export type FundMovementInputData = {
  type: FundMovementType
  amount: number
  date: string
  description: string
}

function describeWriteError(error: { code?: string; message?: string }, fallback: string): string {
  // El trigger que recalcula el saldo lanza su propio mensaje cuando un
  // retiro dejaría el fondo en negativo. Ese texto ya explica el problema
  // mejor que cualquier genérico, así que se muestra tal cual.
  if (error.message?.includes('saldo negativo')) return error.message

  switch (error.code) {
    case '23505': // unique_violation: (user_id, type, name)
      return 'Ya tienes un fondo con ese nombre.'
    case '23514':
      return 'Los montos deben ser mayores que cero.'
    case '42501':
      return 'No tienes permiso para modificar este registro.'
    default:
      return fallback
  }
}

/**
 * Crea un fondo.
 *
 * No enviamos current_amount: arranca en 0 y lo mantiene el trigger desde
 * fund_movements. La base de datos revoca su escritura, así que enviarlo
 * fallaría.
 */
export async function createFund(userId: string, input: FundInputData): Promise<Fund> {
  const { data, error } = await supabase
    .from('funds')
    .insert({ ...input, user_id: userId })
    .select()
    .single()

  if (error) throw new Error(describeWriteError(error, 'No se pudo guardar el fondo.'))
  return normalizeFund(data)
}

export async function updateFund(id: string, input: FundInputData): Promise<Fund> {
  const { data, error } = await supabase
    .from('funds')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(describeWriteError(error, 'No se pudo actualizar el fondo.'))
  return normalizeFund(data)
}

/** Eliminar un fondo borra también su historial de movimientos, en cascada. */
export async function deleteFund(id: string): Promise<void> {
  const { error } = await supabase.from('funds').delete().eq('id', id)
  if (error) throw new Error('No se pudo eliminar el fondo.')
}

/** Historial de un fondo, del movimiento más reciente al más antiguo. */
export async function getMovementsForFund(fundId: string): Promise<FundMovement[]> {
  const { data, error } = await supabase
    .from('fund_movements')
    .select('*')
    .eq('fund_id', fundId)
    .order('date', { ascending: false })

  if (error) throw new Error('No se pudo cargar el historial del fondo.')
  return data.map((row) => ({ ...row, amount: toNumber(row.amount) }))
}

/**
 * Registra un aporte o un retiro.
 *
 * Si el retiro dejara el fondo en negativo, el trigger aborta la operación:
 * esa regla vive en la base de datos, no solo en el formulario.
 */
export async function createFundMovement(
  fundId: string,
  input: FundMovementInputData,
): Promise<FundMovement> {
  const { data, error } = await supabase
    .from('fund_movements')
    .insert({ ...input, fund_id: fundId })
    .select()
    .single()

  if (error) throw new Error(describeWriteError(error, 'No se pudo registrar el movimiento.'))
  return { ...data, amount: toNumber(data.amount) }
}

/**
 * Borrar un aporte puede dejar el saldo en negativo si después hubo retiros.
 * El trigger lo impide y el mensaje lo explica.
 */
export async function deleteFundMovement(id: string): Promise<void> {
  const { error } = await supabase.from('fund_movements').delete().eq('id', id)
  if (error) throw new Error(describeWriteError(error, 'No se pudo eliminar el movimiento.'))
}
