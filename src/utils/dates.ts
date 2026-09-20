/**
 * Utilidades de fecha.
 *
 * Las fechas se guardan en PostgreSQL como DATE (`YYYY-MM-DD`, sin hora ni
 * zona horaria). Esto es intencional: si usáramos timestamps, un gasto del
 * 1 de septiembre registrado en El Salvador (UTC-6) podría mostrarse como
 * 31 de agosto al convertirse a UTC.
 *
 * Por eso NUNCA construimos un Date con `new Date('2026-09-01')` (que se
 * interpreta como UTC), sino parseando los componentes a mano.
 */

export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

const SHORT_MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const

/** Un período mensual: el eje sobre el que gira toda la aplicación. */
export type MonthPeriod = {
  year: number
  /** 1 = enero ... 12 = diciembre */
  month: number
}

/** Convierte "2026-09-11" en sus partes, sin pasar por zonas horarias. */
export function parseDateString(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number)
  return { year: year!, month: month!, day: day! }
}

/** Devuelve el período mensual al que pertenece una fecha "YYYY-MM-DD". */
export function periodOf(value: string): MonthPeriod {
  const { year, month } = parseDateString(value)
  return { year, month }
}

/** El mes actual según la hora local del usuario. */
export function currentPeriod(): MonthPeriod {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

/** Avanza o retrocede un período. addMonths({2026,12}, 1) -> {2027, 1} */
export function addMonths(period: MonthPeriod, delta: number): MonthPeriod {
  const zeroBased = period.month - 1 + delta
  return {
    year: period.year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  }
}

/** "Septiembre 2026" */
export function formatPeriod(period: MonthPeriod): string {
  return `${MONTH_NAMES[period.month - 1]} ${period.year}`
}

/** Primer día del período como "YYYY-MM-DD". */
export function periodStart(period: MonthPeriod): string {
  return `${period.year}-${String(period.month).padStart(2, '0')}-01`
}

/** Último día del período como "YYYY-MM-DD". */
export function periodEnd(period: MonthPeriod): string {
  const lastDay = new Date(period.year, period.month, 0).getDate()
  return `${period.year}-${String(period.month).padStart(2, '0')}-${lastDay}`
}

/** "2026-09-11" -> "11 Sep 2026" */
export function formatDate(value: string): string {
  const { year, month, day } = parseDateString(value)
  return `${day} ${SHORT_MONTHS[month - 1]} ${year}`
}

/** "2026-09-11" -> "11 Sep" (para listas dentro de un mes ya conocido) */
export function formatDayMonth(value: string): string {
  const { month, day } = parseDateString(value)
  return `${day} ${SHORT_MONTHS[month - 1]}`
}

/** La fecha de hoy como "YYYY-MM-DD" en hora local (para inputs type="date"). */
export function todayAsDateString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Nombre corto de un mes por su número (1-12): 9 -> "Sep" */
export function shortMonthName(month: number): string {
  return SHORT_MONTHS[month - 1] ?? ''
}

/**
 * Fecha que un formulario debe proponer al crear algo dentro de un período.
 *
 * Si el período es el mes actual devuelve hoy, que es lo que el usuario va a
 * querer casi siempre. Si está revisando un mes pasado devuelve su día 1,
 * para que el movimiento caiga en el mes que está viendo y no se le escape a
 * otro sin darse cuenta.
 */
export function defaultDateForPeriod(period: MonthPeriod): string {
  const today = currentPeriod()
  const isCurrentMonth = period.year === today.year && period.month === today.month

  return isCurrentMonth ? todayAsDateString() : periodStart(period)
}
