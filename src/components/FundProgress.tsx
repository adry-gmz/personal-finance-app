import { EmptyState, ProgressBar } from '@/components/ui/Card'
import type { Fund } from '@/types/database'
import { formatMoney, progressPercent } from '@/utils/money'

/**
 * Progreso de cada fondo hacia su meta.
 *
 * El porcentaje se acota a 100 aunque se haya superado la meta: una barra
 * llena al 140% no comunica nada. El monto real sí se muestra completo.
 */
export function FundProgress({
  funds,
  emptyMessage,
}: {
  funds: Fund[]
  emptyMessage: string
}) {
  if (funds.length === 0) {
    return <EmptyState>{emptyMessage}</EmptyState>
  }

  return (
    <ul className="space-y-4">
      {funds.map((fund) => {
        const percent = progressPercent(fund.current_amount, fund.target_amount)
        const barColor = fund.type === 'PROVISION' ? 'bg-provision' : 'bg-saving'

        return (
          <li key={fund.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-slate-900">{fund.name}</span>
              <span className="shrink-0 text-slate-500 tabular-nums">
                {formatMoney(fund.current_amount)}{' '}
                <span className="text-slate-400">/ {formatMoney(fund.target_amount)}</span>
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <ProgressBar percent={percent} className="flex-1" barClassName={barColor} />
              <span className="w-9 shrink-0 text-right text-xs text-slate-500 tabular-nums">
                {Math.round(percent)}%
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
