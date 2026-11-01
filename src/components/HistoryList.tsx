import { TrashIcon } from '@/components/Icons'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { formatDate } from '@/utils/dates'
import { formatMoney, formatSignedMoney } from '@/utils/money'

type HistoryItem = { id: string; date: string; description: string; amount: number }

/**
 * Historial de pagos de una deuda, cobros de un préstamo o movimientos de un
 * fondo. Los tres tienen la misma forma, así que comparten esta lista.
 */
export function HistoryList<T extends HistoryItem>({
  items,
  isLoading,
  error,
  noun,
  onDelete,
  labelOf,
  directionOf,
}: {
  items: T[]
  isLoading: boolean
  error: unknown
  /** "pago", "cobro" o "movimiento": se usa en los textos. */
  noun: string
  onDelete: (item: T) => void
  /** Texto por defecto cuando el registro no tiene descripción. */
  labelOf?: (item: T) => string
  /**
   * Si se indica, el monto se muestra con signo. Lo necesitan los fondos,
   * donde la misma lista mezcla aportes y retiros.
   */
  directionOf?: (item: T) => 'in' | 'out'
}) {
  if (isLoading) return <LoadingState>Cargando historial…</LoadingState>
  if (error) return <ErrorState>No se pudo cargar el historial.</ErrorState>
  if (items.length === 0) return <EmptyState>Todavía no hay {noun}s registrados.</EmptyState>

  const defaultLabel = noun.charAt(0).toUpperCase() + noun.slice(1)

  return (
    <ul className="mt-3 divide-y divide-line-subtle border-t border-line-subtle">
      {items.map((item) => {
        const direction = directionOf?.(item)
        return (
          <li key={item.id} className="flex items-center gap-3 py-2.5">
            <span className="w-20 shrink-0 text-xs text-fg-subtle tabular-nums">
              {formatDate(item.date)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-fg-secondary">
              {item.description || labelOf?.(item) || defaultLabel}
            </span>
            <span
              className={`shrink-0 text-sm font-medium tabular-nums ${
                direction === 'in' ? 'text-income' : 'text-fg'
              }`}
            >
              {direction ? formatSignedMoney(item.amount, direction) : formatMoney(item.amount)}
            </span>
            <IconButton
              onClick={() => onDelete(item)}
              label={`Eliminar ${noun}`}
              className="hover:text-red-600 dark:hover:text-red-400"
            >
              <TrashIcon className="size-4" />
            </IconButton>
          </li>
        )
      })}
    </ul>
  )
}
