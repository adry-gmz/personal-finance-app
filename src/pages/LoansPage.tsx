import { useState } from 'react'
import { HistoryList } from '@/components/HistoryList'
import { EditIcon, TrashIcon } from '@/components/Icons'
import { LoanForm } from '@/components/LoanForm'
import { LoanRepaymentForm } from '@/components/LoanRepaymentForm'
import { SummaryCard } from '@/components/SummaryCard'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingState, ProgressBar } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DetailTile } from '@/components/ui/DetailTile'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { useLoanMutations, useLoanRepayments, useLoans } from '@/hooks/useLoans'
import type { Loan, LoanRepayment, LoanStatus } from '@/types/database'
import { formatDate } from '@/utils/dates'
import { formatMoney, progressPercent, sumAmounts, toCents } from '@/utils/money'

const STATUS_LABELS: Record<LoanStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Pendiente', className: 'bg-receivable/10 text-receivable' },
  PAID: { label: 'Cobrado', className: 'bg-income/10 text-income' },
  CANCELLED: { label: 'Cancelado', className: 'bg-muted text-fg-muted' },
}

function pendingOf(loan: Loan): number {
  return Math.max(0, (toCents(loan.total_amount) - toCents(loan.received_amount)) / 100)
}

function profitOf(loan: Loan): number {
  return (toCents(loan.total_amount) - toCents(loan.principal_amount)) / 100
}

/**
 * Dinero que el usuario prestó: el reflejo de Deudas.
 * received_amount y status llegan ya calculados por el trigger.
 */
export function LoansPage() {
  const { data: loans = [], isLoading, error } = useLoans()
  const { remove, removeRepayment } = useLoanMutations()

  const [loanForm, setLoanForm] = useState<Loan | null | undefined>(undefined)
  const [collecting, setCollecting] = useState<Loan | null>(null)
  const [deletingLoan, setDeletingLoan] = useState<Loan | null>(null)
  const [deletingRepayment, setDeletingRepayment] = useState<LoanRepayment | null>(null)

  const active = loans.filter((loan) => loan.status === 'ACTIVE')
  const closed = loans.filter((loan) => loan.status !== 'ACTIVE')

  const totalPending = sumAmounts(active.map(pendingOf))
  const lentActive = sumAmounts(active.map((loan) => loan.principal_amount))
  const expectedProfit = sumAmounts(
    loans.filter((loan) => loan.status !== 'CANCELLED').map(profitOf),
  )

  async function confirmDeleteLoan() {
    if (!deletingLoan) return
    try {
      await remove.mutateAsync(deletingLoan.id)
      setDeletingLoan(null)
    } catch {
      // El error se muestra dentro del diálogo.
    }
  }

  async function confirmDeleteRepayment() {
    if (!deletingRepayment) return
    try {
      await removeRepayment.mutateAsync(deletingRepayment.id)
      setDeletingRepayment(null)
    } catch {
      // El error se muestra dentro del diálogo.
    }
  }

  const cardHandlers = {
    onCollect: setCollecting,
    onEdit: (loan: Loan) => setLoanForm(loan),
    onDelete: setDeletingLoan,
    onDeleteRepayment: setDeletingRepayment,
  }

  return (
    <>
      <PageHeader
        title="Por cobrar"
        description="Dinero que prestaste y lo que te han devuelto."
        actions={<Button onClick={() => setLoanForm(null)}>+ Nuevo préstamo</Button>}
      />

      {error ? (
        <Card>
          <ErrorState>
            {error instanceof Error ? error.message : 'No se pudieron cargar los préstamos.'}
          </ErrorState>
        </Card>
      ) : isLoading ? (
        <Card>
          <LoadingState>Cargando préstamos…</LoadingState>
        </Card>
      ) : loans.length === 0 ? (
        <Card>
          <EmptyState>No has registrado dinero prestado.</EmptyState>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Por cobrar"
              amount={totalPending}
              tone="receivable"
              caption={`${active.length} ${active.length === 1 ? 'préstamo pendiente' : 'préstamos pendientes'}`}
            />
            <SummaryCard
              label="Prestado"
              amount={lentActive}
              tone="balance"
              caption="Capital en préstamos pendientes"
            />
            <SummaryCard
              label="Ganancia esperada"
              amount={expectedProfit}
              tone="income"
              caption="Intereses acordados en total"
            />
          </div>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-fg">Pendientes</h2>
            {active.length === 0 ? (
              <Card>
                <EmptyState>Nadie te debe dinero ahora mismo.</EmptyState>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {active.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} {...cardHandlers} />
                ))}
              </div>
            )}
          </section>

          {closed.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-fg">Cobrados y cancelados</h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {closed.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} {...cardHandlers} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {loanForm !== undefined && <LoanForm loan={loanForm} onClose={() => setLoanForm(undefined)} />}

      {collecting && <LoanRepaymentForm loan={collecting} onClose={() => setCollecting(null)} />}

      <ConfirmDialog
        isOpen={deletingLoan !== null}
        onClose={() => setDeletingLoan(null)}
        onConfirm={confirmDeleteLoan}
        title="Eliminar préstamo"
        message="Se eliminará el préstamo junto con todo su historial de cobros."
        isLoading={remove.isPending}
        error={remove.error instanceof Error ? remove.error.message : null}
        detail={
          deletingLoan && (
            <div className="flex justify-between gap-3">
              <span className="truncate">{deletingLoan.borrower_name}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatMoney(deletingLoan.principal_amount)}
              </span>
            </div>
          )
        }
      />

      <ConfirmDialog
        isOpen={deletingRepayment !== null}
        onClose={() => setDeletingRepayment(null)}
        onConfirm={confirmDeleteRepayment}
        title="Eliminar cobro"
        message="Lo pendiente del préstamo se recalculará sin este cobro."
        isLoading={removeRepayment.isPending}
        error={removeRepayment.error instanceof Error ? removeRepayment.error.message : null}
        detail={
          deletingRepayment && (
            <div className="flex justify-between gap-3">
              <span className="truncate">
                {deletingRepayment.description || 'Cobro'}
                <span className="block text-xs text-fg-muted">
                  {formatDate(deletingRepayment.date)}
                </span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatMoney(deletingRepayment.amount)}
              </span>
            </div>
          )
        }
      />
    </>
  )
}

function LoanCard({
  loan,
  onCollect,
  onEdit,
  onDelete,
  onDeleteRepayment,
}: {
  loan: Loan
  onCollect: (loan: Loan) => void
  onEdit: (loan: Loan) => void
  onDelete: (loan: Loan) => void
  onDeleteRepayment: (repayment: LoanRepayment) => void
}) {
  const [showHistory, setShowHistory] = useState(false)
  const status = STATUS_LABELS[loan.status]
  const percent = progressPercent(loan.received_amount, loan.total_amount)

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-fg">{loan.borrower_name}</h3>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
          >
            {status.label}
          </span>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <IconButton onClick={() => onEdit(loan)} label={`Editar préstamo de ${loan.borrower_name}`}>
            <EditIcon className="size-4" />
          </IconButton>
          <IconButton
            onClick={() => onDelete(loan)}
            label={`Eliminar préstamo de ${loan.borrower_name}`}
            className="hover:text-red-600 dark:hover:text-red-400"
          >
            <TrashIcon className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between text-sm">
        <span className="text-fg-muted tabular-nums">
          {formatMoney(loan.received_amount)}{' '}
          <span className="text-fg-subtle">/ {formatMoney(loan.total_amount)}</span>
        </span>
        <span className="text-xs text-fg-muted tabular-nums">{Math.round(percent)}%</span>
      </div>
      <ProgressBar
        percent={percent}
        className="mt-2"
        barClassName={loan.status === 'PAID' ? 'bg-income' : 'bg-receivable'}
      />

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <DetailTile label="Falta" value={formatMoney(pendingOf(loan))} />
        <DetailTile label="Prestado" value={formatMoney(loan.principal_amount)} />
        <DetailTile
          label="Ganancia"
          value={formatMoney(profitOf(loan))}
          caption={loan.interest_rate !== null ? `${loan.interest_rate}%` : undefined}
        />
        <DetailTile
          label="Prestado el"
          value={formatDate(loan.loan_date)}
          caption={loan.due_date ? `Vence ${formatDate(loan.due_date)}` : undefined}
        />
      </dl>

      {loan.notes && <p className="mt-3 text-sm text-fg-muted">{loan.notes}</p>}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowHistory((open) => !open)}
          aria-expanded={showHistory}
          className="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          {showHistory ? 'Ocultar cobros' : 'Ver cobros'}
        </button>
        {loan.status === 'ACTIVE' && (
          <Button size="sm" onClick={() => onCollect(loan)}>
            Registrar cobro
          </Button>
        )}
      </div>

      {showHistory && <RepaymentHistory loanId={loan.id} onDelete={onDeleteRepayment} />}
    </Card>
  )
}

/** Historial de cobros. Solo se consulta cuando el usuario lo despliega. */
function RepaymentHistory({
  loanId,
  onDelete,
}: {
  loanId: string
  onDelete: (repayment: LoanRepayment) => void
}) {
  const { data: repayments = [], isLoading, error } = useLoanRepayments(loanId)
  return (
    <HistoryList
      items={repayments}
      isLoading={isLoading}
      error={error}
      noun="cobro"
      onDelete={onDelete}
    />
  )
}
