import { EmptyState } from '@/components/ui/Card'
import type { TransactionWithCategory } from '@/types/database'
import { formatDayMonth } from '@/utils/dates'
import { formatSignedMoney } from '@/utils/money'

/**
 * Lista de movimientos.
 *
 * El signo y el color los determina el tipo, no el monto: en la base de datos
 * todos los importes son positivos y es `type` quien dice si entra o sale.
 */
export function TransactionList({
  transactions,
  emptyMessage,
  limit,
  onEdit,
  onDelete,
}: {
  transactions: TransactionWithCategory[]
  emptyMessage: string
  /** Si se indica, solo muestra los primeros N. */
  limit?: number
  /** Si se indican, cada fila muestra sus botones de acción. */
  onEdit?: (transaction: TransactionWithCategory) => void
  onDelete?: (transaction: TransactionWithCategory) => void
}) {
  if (transactions.length === 0) {
    return <EmptyState>{emptyMessage}</EmptyState>
  }

  const visible = limit ? transactions.slice(0, limit) : transactions

  return (
    <ul className="divide-y divide-slate-100">
      {visible.map((transaction) => {
        const isIncome = transaction.type === 'INCOME'

        return (
          <li key={transaction.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="w-12 shrink-0 text-xs text-slate-400 tabular-nums">
              {formatDayMonth(transaction.date)}
            </span>

            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: transaction.category?.color ?? '#94a3b8' }}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {transaction.description || transaction.category?.name || 'Sin descripción'}
              </p>
              <p className="truncate text-xs text-slate-500">
                {transaction.category?.name ?? 'Sin categoría'}
                {transaction.expense_type === 'FIXED' && ' · Fijo'}
                {transaction.expense_type === 'VARIABLE' && ' · Variable'}
                {transaction.is_recurring && ' · Recurrente'}
              </p>
            </div>

            <span
              className={`shrink-0 text-sm font-medium tabular-nums ${
                isIncome ? 'text-income' : 'text-slate-900'
              }`}
            >
              {formatSignedMoney(transaction.amount, isIncome ? 'in' : 'out')}
            </span>

            {(onEdit || onDelete) && (
              <div className="flex shrink-0 gap-0.5">
                {onEdit && (
                  <IconButton
                    onClick={() => onEdit(transaction)}
                    label={`Editar ${transaction.description || 'movimiento'}`}
                  >
                    <EditIcon />
                  </IconButton>
                )}
                {onDelete && (
                  <IconButton
                    onClick={() => onDelete(transaction)}
                    label={`Eliminar ${transaction.description || 'movimiento'}`}
                    className="hover:text-red-600"
                  >
                    <TrashIcon />
                  </IconButton>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function IconButton({
  onClick,
  label,
  className = '',
  children,
}: {
  onClick: () => void
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 ${className}`}
    >
      {children}
    </button>
  )
}

function EditIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" />
      <path d="M14.5 6.5l3 3" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </svg>
  )
}
