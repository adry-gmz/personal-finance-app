import { EditIcon, TrashIcon } from '@/components/Icons'
import { EmptyState } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
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
                    <EditIcon className="size-4" />
                  </IconButton>
                )}
                {onDelete && (
                  <IconButton
                    onClick={() => onDelete(transaction)}
                    label={`Eliminar ${transaction.description || 'movimiento'}`}
                    className="hover:text-red-600"
                  >
                    <TrashIcon className="size-4" />
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

