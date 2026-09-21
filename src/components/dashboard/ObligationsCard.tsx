import { Link } from 'react-router-dom'
import { formatMoney } from '@/utils/money'

/**
 * Lo que debes frente a lo que te deben, con el movimiento del mes.
 * Ninguno de los dos es gasto ni ingreso: por eso van aparte.
 */
export function ObligationsCard({
  pendingDebt,
  debtPaidThisMonth,
  receivablePending,
  receivedThisMonth,
}: {
  pendingDebt: number
  debtPaidThisMonth: number
  receivablePending: number
  receivedThisMonth: number
}) {
  return (
    <section className="card grid grid-cols-2 divide-x divide-line-subtle">
      <Block
        to="/debts"
        label="Debes"
        amount={pendingDebt}
        colorClass="text-debt"
        dotClass="bg-debt"
        caption={
          debtPaidThisMonth > 0 ? `Pagaste ${formatMoney(debtPaidThisMonth)} este mes` : 'Sin pagos este mes'
        }
      />
      <Block
        to="/loans"
        label="Te deben"
        amount={receivablePending}
        colorClass="text-receivable"
        dotClass="bg-receivable"
        caption={
          receivedThisMonth > 0 ? `Cobraste ${formatMoney(receivedThisMonth)} este mes` : 'Sin cobros este mes'
        }
      />
    </section>
  )
}

function Block({
  to,
  label,
  amount,
  colorClass,
  dotClass,
  caption,
}: {
  to: string
  label: string
  amount: number
  colorClass: string
  dotClass: string
  caption: string
}) {
  return (
    <Link to={to} className="group p-5 transition-colors first:rounded-l-[1.125rem] last:rounded-r-[1.125rem] hover:bg-muted/60">
      <span className="flex items-center gap-2 text-sm text-fg-muted">
        <span aria-hidden className={`size-2 rounded-full ${dotClass}`} />
        {label}
      </span>
      <p className={`mt-1.5 text-xl font-semibold tracking-tight tabular-nums ${colorClass}`}>
        {formatMoney(amount)}
      </p>
      <p className="mt-0.5 text-xs text-fg-subtle">{caption}</p>
    </Link>
  )
}
