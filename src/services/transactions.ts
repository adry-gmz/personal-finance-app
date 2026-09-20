import { supabase } from '@/lib/supabase'
import type {
  ExpenseType,
  Transaction,
  TransactionType,
  TransactionWithCategory,
} from '@/types/database'
import type { MonthPeriod } from '@/utils/dates'

/**
 * Servicio de transacciones.
 *
 * Nota sobre RLS: ninguna consulta filtra por user_id. No hace falta, porque
 * las políticas de PostgreSQL ya limitan cada SELECT a las filas del usuario
 * autenticado. Filtrar también aquí sería duplicar la regla en dos sitios,
 * con el riesgo de que un día dejen de coincidir.
 */

/**
 * PostgREST puede entregar los NUMERIC como texto para no perder precisión,
 * según la versión. Normalizamos aquí, en el borde del sistema, para que el
 * resto de la aplicación siempre trabaje con números.
 */
function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0)
}

const SELECT_WITH_CATEGORY = '*, category:categories(id, name, type, color)'

/**
 * Movimientos de un mes concreto.
 *
 * Filtra por las columnas generadas `year` y `month` en vez de por un rango
 * de fechas: PostgreSQL las calcula y las indexa, así que la consulta es una
 * búsqueda directa en el índice.
 */
export async function getTransactionsByPeriod(
  period: MonthPeriod,
): Promise<TransactionWithCategory[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(SELECT_WITH_CATEGORY)
    .eq('year', period.year)
    .eq('month', period.month)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error('No se pudieron cargar los movimientos del mes.')

  return (data as TransactionWithCategory[]).map((row) => ({
    ...row,
    amount: toNumber(row.amount),
  }))
}

/** Un punto del gráfico anual: cuánto entró y cuánto salió cada mes. */
export type MonthlyTotals = {
  month: number
  income: number
  expense: number
}

/**
 * Totales de ingresos y gastos de cada mes de un año.
 *
 * Traemos solo tres columnas y agregamos en el cliente. Con el volumen de
 * un uso personal (cientos de filas al año) es más simple que crear una
 * vista en la base de datos, y evita una capa extra que mantener.
 */
export async function getYearlyTotals(year: number): Promise<MonthlyTotals[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('month, type, amount')
    .eq('year', year)

  if (error) throw new Error('No se pudo cargar el resumen anual.')

  // Un acumulador por mes, en centavos enteros para no arrastrar
  // error de coma flotante al sumar.
  const totals = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    incomeCents: 0,
    expenseCents: 0,
  }))

  for (const row of data) {
    const cents = Math.round(toNumber(row.amount) * 100)
    const bucket = totals[row.month - 1]
    if (!bucket) continue

    if (row.type === 'INCOME') {
      bucket.incomeCents += cents
    } else {
      bucket.expenseCents += cents
    }
  }

  return totals.map(({ month, incomeCents, expenseCents }) => ({
    month,
    income: incomeCents / 100,
    expense: expenseCents / 100,
  }))
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

export type TransactionInput = {
  category_id: string
  type: TransactionType
  /** Obligatorio en gastos, debe ser null en ingresos. */
  expense_type: ExpenseType | null
  description: string
  amount: number
  date: string
  is_recurring: boolean
}

/**
 * Traduce los errores de PostgreSQL a algo que el usuario entienda.
 *
 * Las restricciones del esquema son la última línea de defensa: el formulario
 * ya valida antes de enviar, pero si algo se cuela, el mensaje debe explicar
 * qué pasó en lugar de mostrar jerga de base de datos.
 */
function describeWriteError(code: string | undefined, fallback: string): string {
  switch (code) {
    case '23514': // check_violation
      return 'Los datos no cumplen las reglas: revisa que el monto sea mayor que cero y que el tipo de gasto sea correcto.'
    case '23503': // foreign_key_violation
      return 'La categoría seleccionada no existe o no corresponde al tipo de movimiento.'
    case '42501': // insufficient_privilege / RLS
      return 'No tienes permiso para modificar este movimiento.'
    default:
      return fallback
  }
}

export async function createTransaction(
  userId: string,
  input: TransactionInput,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...input, user_id: userId })
    .select()
    .single()

  if (error) throw new Error(describeWriteError(error.code, 'No se pudo guardar el movimiento.'))

  return data
}

export async function updateTransaction(
  id: string,
  input: TransactionInput,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(describeWriteError(error.code, 'No se pudo actualizar el movimiento.'))

  return data
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)

  if (error) throw new Error('No se pudo eliminar el movimiento.')
}
