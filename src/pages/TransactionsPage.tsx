import { useState } from 'react'
import { MonthSelector } from '@/components/MonthSelector'
import { TransactionForm } from '@/components/TransactionForm'
import { TransactionList } from '@/components/TransactionList'
import { Button } from '@/components/ui/Button'
import { Card, ErrorState, LoadingState } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePeriod } from '@/hooks/usePeriod'
import { useTransactionMutations, useTransactions } from '@/hooks/useTransactions'
import type { TransactionWithCategory } from '@/types/database'
import { defaultDateForPeriod, formatDate, formatPeriod } from '@/utils/dates'
import { formatMoney, sumAmounts } from '@/utils/money'

type Filter = 'ALL' | 'INCOME' | 'EXPENSE'

const FILTER_LABELS: Record<Filter, string> = {
  ALL: 'Todos',
  INCOME: 'Ingresos',
  EXPENSE: 'Gastos',
}

/**
 * Todos los movimientos del mes seleccionado, con alta, edición y borrado.
 *
 * Comparte el selector de mes con el dashboard: ambos leen el período de la
 * misma URL, así que al navegar entre las dos pantallas el mes se mantiene.
 */
export function TransactionsPage() {
  const { period } = usePeriod()
  const { data: transactions = [], isLoading, error } = useTransactions(period)
  const { remove } = useTransactionMutations()

  const [filter, setFilter] = useState<Filter>('ALL')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionWithCategory | null>(null)
  const [deleting, setDeleting] = useState<TransactionWithCategory | null>(null)

  const visible = transactions.filter(
    (transaction) => filter === 'ALL' || transaction.type === filter,
  )

  const visibleTotal = sumAmounts(visible.map((transaction) => transaction.amount))

  function openCreateForm() {
    setEditing(null)
    setIsFormOpen(true)
  }

  function openEditForm(transaction: TransactionWithCategory) {
    setEditing(transaction)
    setIsFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return

    try {
      await remove.mutateAsync(deleting.id)
      setDeleting(null)
    } catch {
      // El error queda en remove.error y se muestra dentro del diálogo,
      // que sigue abierto para que se pueda reintentar.
    }
  }

  return (
    <>
      <PageHeader
        title="Movimientos"
        description={formatPeriod(period)}
        actions={
          <>
            <MonthSelector />
            <Button onClick={openCreateForm}>+ Registrar</Button>
          </>
        }
      />

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {(Object.keys(FILTER_LABELS) as Filter[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                aria-pressed={filter === option}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === option
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {FILTER_LABELS[option]}
              </button>
            ))}
          </div>

          {!isLoading && visible.length > 0 && (
            <p className="text-sm text-slate-500">
              {visible.length} {visible.length === 1 ? 'movimiento' : 'movimientos'} ·{' '}
              <span className="font-medium text-slate-900 tabular-nums">
                {formatMoney(visibleTotal)}
              </span>
            </p>
          )}
        </div>

        {error ? (
          <ErrorState>
            {error instanceof Error ? error.message : 'No se pudieron cargar los movimientos.'}
          </ErrorState>
        ) : isLoading ? (
          <LoadingState>Cargando movimientos…</LoadingState>
        ) : (
          <TransactionList
            transactions={visible}
            onEdit={openEditForm}
            onDelete={setDeleting}
            emptyMessage={
              filter === 'ALL'
                ? `No tienes movimientos registrados en ${formatPeriod(period).toLowerCase()}.`
                : `No tienes ${FILTER_LABELS[filter].toLowerCase()} en ${formatPeriod(period).toLowerCase()}.`
            }
          />
        )}
      </Card>

      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        transaction={editing}
        // Un movimiento nuevo se propone dentro del mes que se está viendo.
        defaultDate={defaultDateForPeriod(period)}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Eliminar movimiento"
        message="Vas a eliminar este movimiento de tus registros."
        isLoading={remove.isPending}
        error={remove.error instanceof Error ? remove.error.message : null}
        detail={
          deleting && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate">
                {deleting.description || deleting.category?.name || 'Sin descripción'}
                <span className="block text-xs text-slate-500">{formatDate(deleting.date)}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatMoney(deleting.amount)}
              </span>
            </div>
          )
        }
      />
    </>
  )
}
