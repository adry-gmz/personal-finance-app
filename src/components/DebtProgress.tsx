import { EmptyState, ProgressBar } from '@/components/ui/Card'
import type { Debt } from '@/types/database'
import { formatDate } from '@/utils/dates'
import { formatMoney, progressPercent } from '@/utils/money'

/**
 * Cuánto se lleva pagado de cada deuda.
 *
 * El saldo pendiente no está guardado en la base de datos: se calcula como
 * total_amount - paid_amount, y paid_amount lo mantiene un trigger a partir
 * del historial de pagos. Así nunca puede contradecir a los pagos reales.
 */
export function DebtProgress({ debts }: { debts: Debt[] }) {
  const active = debts.filter((debt) => debt.status === 'ACTIVE')

  if (active.length === 0) {
    const hasPaidDebts = debts.length > 0
    return (
      <EmptyState>
        {hasPaidDebts ? 'No tienes deudas pendientes. 🎉' : 'No tienes deudas registradas.'}
      </EmptyState>
    )
  }

  return (
    <ul className="space-y-4">
      {active.map((debt) => {
        const percent = progressPercent(debt.paid_amount, debt.total_amount)
        const pending = debt.total_amount - debt.paid_amount

        return (
          <li key={debt.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-fg">{debt.name}</span>
              <span className="shrink-0 text-fg-muted tabular-nums">
                {formatMoney(debt.paid_amount)}{' '}
                <span className="text-fg-subtle">/ {formatMoney(debt.total_amount)}</span>
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <ProgressBar percent={percent} className="flex-1" barClassName="bg-debt" />
              <span className="w-9 shrink-0 text-right text-xs text-fg-muted tabular-nums">
                {Math.round(percent)}%
              </span>
            </div>
            <p className="mt-1.5 text-xs text-fg-subtle">
              Faltan {formatMoney(pending)}
              {debt.due_date && ` · vence el ${formatDate(debt.due_date)}`}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
