/**
 * Utilidades de dinero.
 *
 * PostgreSQL guarda los montos como NUMERIC(14,2), pero al viajar por JSON
 * llegan a JavaScript como `number` (coma flotante). Sumar muchos floats
 * acumula error (0.1 + 0.2 = 0.30000000000000004), así que toda operación
 * aritmética se hace en centavos enteros y solo se convierte al final.
 */

/** Convierte un monto en dólares a centavos enteros. */
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

/** Convierte centavos enteros de vuelta a dólares. */
export function fromCents(cents: number): number {
  return cents / 100
}

/** Suma una lista de montos sin error de coma flotante. */
export function sumAmounts(amounts: number[]): number {
  return fromCents(amounts.reduce((total, amount) => total + toCents(amount), 0))
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formatea un monto como moneda: 350 -> "$350.00" */
export function formatMoney(amount: number): string {
  return currencyFormatter.format(amount)
}

/** Formatea un monto con signo según el tipo: "+$300.00" / "-$6.50" */
export function formatSignedMoney(amount: number, direction: 'in' | 'out'): string {
  const sign = direction === 'in' ? '+' : '-'
  return `${sign}${currencyFormatter.format(Math.abs(amount))}`
}

/**
 * Calcula un porcentaje de progreso acotado entre 0 y 100.
 * Devuelve 0 si el total es cero para evitar división por cero.
 */
export function progressPercent(current: number, target: number): number {
  if (target <= 0) return 0
  const percent = (toCents(current) / toCents(target)) * 100
  return Math.min(100, Math.max(0, percent))
}
