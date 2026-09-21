import { useState } from 'react'
import { DebtForm } from '@/components/DebtForm'
import { DEBT_TYPE_LABELS } from '@/utils/labels'
import { DebtPaymentForm } from '@/components/DebtPaymentForm'
import { EditIcon, TrashIcon } from '@/components/Icons'
import { SummaryCard } from '@/components/SummaryCard'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingState, ProgressBar } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { useDebtMutations, useDebtPayments, useDebts } from '@/hooks/useDebts'
import type { Debt, DebtPayment, DebtStatus } from '@/types/database'
import { formatDate } from '@/utils/dates'
import { formatMoney, progressPercent, sumAmounts, toCents } from '@/utils/money'

const STATUS_LABELS: Record<DebtStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Activa', className: 'bg-debt/10 text-debt' },
  PAID: { label: 'Pagada', className: 'bg-income/10 text-income' },
  CANCELLED: { label: 'Cancelada', className: 'bg-muted text-fg-muted' },
}

function pendingOf(debt: Debt): number {
  return Math.max(0, (toCents(debt.total_amount) - toCents(debt.paid_amount)) / 100)
}

/**
 * Deudas con su progreso e historial de pagos.
 *
 * Los saldos no se calculan aquí: paid_amount y status llegan ya
 * actualizados por el trigger de la base de datos.
 */
export function DebtsPage() {
  const { data: debts = [], isLoading, error } = useDebts()
  const { remove, removePayment } = useDebtMutations()

  // Qué formulario o diálogo está abierto. `undefined` = cerrado,
  // `null` en debtForm = creando una deuda nueva.
  const [debtForm, setDebtForm] = useState<Debt | null | undefined>(undefined)
  const [paying, setPaying] = useState<Debt | null>(null)
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null)
  const [deletingPayment, setDeletingPayment] = useState<DebtPayment | null>(null)

  const active = debts.filter((debt) => debt.status === 'ACTIVE')
  const closed = debts.filter((debt) => debt.status !== 'ACTIVE')

  const totalPending = sumAmounts(active.map(pendingOf))
  const totalPaid = sumAmounts(debts.map((debt) => debt.paid_amount))

  async function confirmDeleteDebt() {
    if (!deletingDebt) return
    try {
      await remove.mutateAsync(deletingDebt.id)
      setDeletingDebt(null)
    } catch {
      // El error se muestra dentro del diálogo.
    }
  }

  async function confirmDeletePayment() {
    if (!deletingPayment) return
    try {
      await removePayment.mutateAsync(deletingPayment.id)
      setDeletingPayment(null)
    } catch {
      // El error se muestra dentro del diálogo.
    }
  }

  const cardHandlers = {
    onPay: setPaying,
    onEdit: (debt: Debt) => setDebtForm(debt),
    onDelete: setDeletingDebt,
    onDeletePayment: setDeletingPayment,
  }

  return (
    <>
      <PageHeader
        title="Deudas"
        description="Lo que debes y cuánto llevas pagado."
        actions={<Button onClick={() => setDebtForm(null)}>+ Nueva deuda</Button>}
      />

      {error ? (
        <Card>
          <ErrorState>
            {error instanceof Error ? error.message : 'No se pudieron cargar las deudas.'}
          </ErrorState>
        </Card>
      ) : isLoading ? (
        <Card>
          <LoadingState>Cargando deudas…</LoadingState>
        </Card>
      ) : debts.length === 0 ? (
        <Card>
          <EmptyState>No tienes deudas registradas.</EmptyState>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryCard
              label="Saldo pendiente"
              amount={totalPending}
              tone="debt"
              caption={`${active.length} ${active.length === 1 ? 'deuda activa' : 'deudas activas'}`}
            />
            <SummaryCard
              label="Total pagado"
              amount={totalPaid}
              tone="balance"
              caption="Suma de todos los pagos registrados"
            />
          </div>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-fg">Activas</h2>
            {active.length === 0 ? (
              <Card>
                <EmptyState>No tienes deudas pendientes. 🎉</EmptyState>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {active.map((debt) => (
                  <DebtCard key={debt.id} debt={debt} {...cardHandlers} />
                ))}
              </div>
            )}
          </section>

          {closed.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-fg">Pagadas y canceladas</h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {closed.map((debt) => (
                  <DebtCard key={debt.id} debt={debt} {...cardHandlers} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {debtForm !== undefined && (
        <DebtForm debt={debtForm} onClose={() => setDebtForm(undefined)} />
      )}

      {paying && <DebtPaymentForm debt={paying} onClose={() => setPaying(null)} />}

      <ConfirmDialog
        isOpen={deletingDebt !== null}
        onClose={() => setDeletingDebt(null)}
        onConfirm={confirmDeleteDebt}
        title="Eliminar deuda"
        message="Se eliminará la deuda junto con todo su historial de pagos."
        isLoading={remove.isPending}
        error={remove.error instanceof Error ? remove.error.message : null}
        detail={
          deletingDebt && (
            <div className="flex justify-between gap-3">
              <span className="truncate">{deletingDebt.name}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatMoney(deletingDebt.total_amount)}
              </span>
            </div>
          )
        }
      />

      <ConfirmDialog
        isOpen={deletingPayment !== null}
        onClose={() => setDeletingPayment(null)}
        onConfirm={confirmDeletePayment}
        title="Eliminar pago"
        message="El saldo de la deuda se recalculará sin este pago."
        isLoading={removePayment.isPending}
        error={removePayment.error instanceof Error ? removePayment.error.message : null}
        detail={
          deletingPayment && (
            <div className="flex justify-between gap-3">
              <span className="truncate">
                {deletingPayment.description || 'Pago'}
                <span className="block text-xs text-fg-muted">
                  {formatDate(deletingPayment.date)}
                </span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatMoney(deletingPayment.amount)}
              </span>
            </div>
          )
        }
      />
    </>
  )
}

function DebtCard({
  debt,
  onPay,
  onEdit,
  onDelete,
  onDeletePayment,
}: {
  debt: Debt
  onPay: (debt: Debt) => void
  onEdit: (debt: Debt) => void
  onDelete: (debt: Debt) => void
  onDeletePayment: (payment: DebtPayment) => void
}) {
  const [showPayments, setShowPayments] = useState(false)
  const status = STATUS_LABELS[debt.status]
  const percent = progressPercent(debt.paid_amount, debt.total_amount)
  const pending = pendingOf(debt)

  // El interés en dinero solo se conoce si se guardó el monto original.
  const interest =
    debt.principal_amount !== null
      ? (toCents(debt.total_amount) - toCents(debt.principal_amount)) / 100
      : null

  // Cuotas cubiertas con lo pagado hasta ahora. Es una estimación: si se
  // hicieron abonos de montos distintos a la cuota, cuenta cuotas enteras.
  const installmentsPaid =
    debt.installment_amount !== null
      ? Math.floor(toCents(debt.paid_amount) / toCents(debt.installment_amount))
      : null

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-fg">{debt.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
            >
              {status.label}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-fg-muted">
              {DEBT_TYPE_LABELS[debt.debt_type]}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <IconButton onClick={() => onEdit(debt)} label={`Editar ${debt.name}`}>
            <EditIcon className="size-4" />
          </IconButton>
          <IconButton
            onClick={() => onDelete(debt)}
            label={`Eliminar ${debt.name}`}
            className="hover:text-red-600 dark:hover:text-red-400"
          >
            <TrashIcon className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between text-sm">
        <span className="text-fg-muted tabular-nums">
          {formatMoney(debt.paid_amount)}{' '}
          <span className="text-fg-subtle">/ {formatMoney(debt.total_amount)}</span>
        </span>
        <span className="text-xs text-fg-muted tabular-nums">{Math.round(percent)}%</span>
      </div>
      <ProgressBar
        percent={percent}
        className="mt-2"
        barClassName={debt.status === 'PAID' ? 'bg-income' : 'bg-debt'}
      />

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Detail label="Pendiente" value={formatMoney(pending)} />
        <Detail
          label="Cuota"
          value={debt.installment_amount !== null ? formatMoney(debt.installment_amount) : '—'}
          caption={
            installmentsPaid !== null && debt.installments !== null
              ? `${Math.min(installmentsPaid, debt.installments)} de ${debt.installments} pagadas`
              : undefined
          }
        />
        <Detail
          label="Interés"
          value={interest !== null ? formatMoney(interest) : '—'}
          caption={debt.interest_rate !== null ? `${debt.interest_rate}%` : undefined}
        />
        <Detail label="Vence" value={debt.due_date ? formatDate(debt.due_date) : '—'} />
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowPayments((open) => !open)}
          aria-expanded={showPayments}
          className="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          {showPayments ? 'Ocultar pagos' : 'Ver pagos'}
        </button>
        {debt.status === 'ACTIVE' && (
          <Button size="sm" onClick={() => onPay(debt)}>
            Registrar pago
          </Button>
        )}
      </div>

      {showPayments && <PaymentHistory debtId={debt.id} onDelete={onDeletePayment} />}
    </Card>
  )
}

/** Historial de pagos. Solo se consulta cuando el usuario lo despliega. */
function PaymentHistory({
  debtId,
  onDelete,
}: {
  debtId: string
  onDelete: (payment: DebtPayment) => void
}) {
  const { data: payments = [], isLoading, error } = useDebtPayments(debtId)

  if (isLoading) return <LoadingState>Cargando pagos…</LoadingState>
  if (error) return <ErrorState>No se pudo cargar el historial de pagos.</ErrorState>
  if (payments.length === 0) return <EmptyState>Todavía no hay pagos registrados.</EmptyState>

  return (
    <ul className="mt-3 divide-y divide-line-subtle border-t border-line-subtle">
      {payments.map((payment) => (
        <li key={payment.id} className="flex items-center gap-3 py-2.5">
          <span className="w-20 shrink-0 text-xs text-fg-subtle tabular-nums">
            {formatDate(payment.date)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-fg-secondary">
            {payment.description || 'Pago'}
          </span>
          <span className="shrink-0 text-sm font-medium text-fg tabular-nums">
            {formatMoney(payment.amount)}
          </span>
          <IconButton
            onClick={() => onDelete(payment)}
            label="Eliminar pago"
            className="hover:text-red-600 dark:hover:text-red-400"
          >
            <TrashIcon className="size-4" />
          </IconButton>
        </li>
      ))}
    </ul>
  )
}

function Detail({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div className="rounded-lg bg-muted px-2.5 py-2">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-fg tabular-nums">{value}</dd>
      {caption && <dd className="truncate text-fg-subtle">{caption}</dd>}
    </div>
  )
}
