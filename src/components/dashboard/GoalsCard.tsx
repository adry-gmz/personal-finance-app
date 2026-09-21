import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui/Card'
import type { Fund } from '@/types/database'
import { formatMoney, progressPercent, sumAmounts } from '@/utils/money'

const MAX_VISIBLE = 5

/**
 * Metas: el progreso de provisiones y ahorros hacia su objetivo.
 * Arriba el total de todos los fondos; debajo, cada uno por separado.
 */
export function GoalsCard({ funds }: { funds: Fund[] }) {
  const current = sumAmounts(funds.map((fund) => fund.current_amount))
  const target = sumAmounts(funds.map((fund) => fund.target_amount))
  const totalPercent = progressPercent(current, target)

  // Los más cercanos a cumplirse primero: son los que motivan.
  const visible = [...funds]
    .sort(
      (a, b) =>
        progressPercent(b.current_amount, b.target_amount) -
        progressPercent(a.current_amount, a.target_amount),
    )
    .slice(0, MAX_VISIBLE)

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">
          Metas{' '}
          {funds.length > 0 && (
            <span className="font-medium text-primary tabular-nums">
              {formatMoney(current)} / {formatMoney(target)}
            </span>
          )}
        </h2>
        {funds.length > 0 && (
          <span className="text-sm font-semibold text-fg tabular-nums">
            {Math.round(totalPercent)}%
          </span>
        )}
      </div>

      {funds.length === 0 ? (
        <EmptyState>Crea provisiones o ahorros para ver tus metas.</EmptyState>
      ) : (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#3fd5ec] to-[#2f6bff] shadow-[0_0_12px_#3fd5ec]"
              style={{ width: `${totalPercent}%` }}
            />
          </div>

          <ul className="mt-5 space-y-3.5">
            {visible.map((fund) => {
              const percent = progressPercent(fund.current_amount, fund.target_amount)
              const isProvision = fund.type === 'PROVISION'
              return (
                <li key={fund.id} className="flex items-center gap-3">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                      isProvision ? 'bg-provision/15 text-provision' : 'bg-saving/15 text-saving'
                    }`}
                    title={isProvision ? 'Provisión' : 'Ahorro'}
                  >
                    {isProvision ? <ShieldIcon /> : <StarIcon />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-fg-secondary">{fund.name}</span>
                      <span className="shrink-0 text-fg-muted tabular-nums">
                        {Math.round(percent)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${isProvision ? 'bg-provision' : 'bg-saving'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-fg-subtle tabular-nums">
                      {formatMoney(fund.current_amount)} de {formatMoney(fund.target_amount)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>

          {funds.length > MAX_VISIBLE && (
            <Link
              to="/funds"
              className="mt-4 inline-block text-xs font-medium text-fg-muted hover:text-fg"
            >
              Ver los {funds.length} fondos
            </Link>
          )}
        </>
      )}
    </section>
  )
}

function ShieldIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </svg>
  )
}
