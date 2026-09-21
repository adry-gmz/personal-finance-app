import { toCents } from '@/utils/money'

export type InstallmentPlan = {
  /** Valor de cada cuota mensual. */
  installment: number
  /** Lo que se paga en total al terminar. */
  total: number
  /** total - principal */
  interest: number
}

/**
 * Cuota fija de un préstamo o compra a plazos (sistema francés).
 *
 *   cuota = P · r / (1 − (1 + r)^−n)
 *
 * donde P es el monto, n el número de cuotas y r la tasa mensual
 * (tasa anual / 12). Con tasa 0 la cuota es simplemente P / n, que es el
 * caso de las compras "a plazos sin intereses" con tarjeta.
 *
 * La cuota se redondea a centavos. Por ese redondeo, cuota × n puede quedar
 * unos centavos por debajo de P cuando no hay interés (100 / 3 = 33.33 y
 * 33.33 × 3 = 99.99). En ese caso el total se ajusta a P: en la práctica la
 * última cuota absorbe la diferencia.
 */
export function calculateInstallmentPlan(
  principal: number,
  annualRatePercent: number,
  count: number,
): InstallmentPlan {
  const monthlyRate = annualRatePercent / 100 / 12

  const exactInstallment =
    monthlyRate === 0
      ? principal / count
      : (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -count)

  const installmentCents = Math.round(exactInstallment * 100)
  const principalCents = toCents(principal)
  const totalCents = Math.max(principalCents, installmentCents * count)

  return {
    installment: installmentCents / 100,
    total: totalCents / 100,
    interest: (totalCents - principalCents) / 100,
  }
}
