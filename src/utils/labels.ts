import type { DebtType } from '@/types/database'

/** Nombre visible de cada tipo de deuda. */
export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  LOAN: 'Préstamo',
  CREDIT_CARD: 'Tarjeta',
  OTHER: 'Otro',
}
