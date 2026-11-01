import type { DebtType, FundType } from '@/types/database'

/** Nombre visible de cada tipo de deuda. */
export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  LOAN: 'Préstamo',
  CREDIT_CARD: 'Tarjeta',
  OTHER: 'Otro',
}

/** Nombre visible de cada tipo de fondo. */
export const FUND_TYPE_LABELS: Record<FundType, string> = {
  PROVISION: 'Provisión',
  SAVING: 'Ahorro',
}

/**
 * Qué significa cada tipo de fondo. La diferencia es de intención, no de
 * mecánica: ambos apartan dinero, pero por motivos distintos.
 */
export const FUND_TYPE_HINTS: Record<FundType, string> = {
  PROVISION: 'Dinero apartado por si ocurre algo.',
  SAVING: 'Dinero apartado para conseguir una meta.',
}
