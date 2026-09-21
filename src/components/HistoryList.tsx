import { TrashIcon } from '@/components/Icons'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { formatDate } from '@/utils/dates'
import { formatMoney } from '@/utils/money'

type HistoryItem = { id: string; date: string; description: string; amount: number }

/**
 * Historial de pagos de una deuda o de cobros de un préstamo.
 * Ambos tienen la misma forma, así que comparten esta lista.
 */
export function HistoryList<T extends HistoryItem>({
  items,
  isLoading,
  error,
  noun,
  onDelete,
}: {
  items: T[]
  isLoading: boolean
  error: unknown
  /** "pago" o "cobro": se usa en los textos. */
  noun: string
  onDelete: (item: T) => void
}) {
  if (isLoading) return <LoadingState>Cargando historial…</LoadingState>
  if (error) return <ErrorState>No se pudo cargar el historial.</ErrorState>
  if (items.length === 0) return <EmptyState>Todavía no hay {noun}s registrados.</EmptyState>

  const label = noun.charAt(0).toUpperCase() + noun.slice(1)

  return (
    <ul className="mt-3 divide-y divide-line-subtle border-t border-line-subtle">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-2.5">
          <span className="w-20 shrink-0 text-xs text-fg-subtle tabular-nums">
            {formatDate(item.date)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-fg-secondary">
            {item.description || label}
          </span>
          <span className="shrink-0 text-sm font-medium text-fg tabular-nums">
            {formatMoney(item.amount)}
          </span>
          <IconButton
            onClick={() => onDelete(item)}
            label={`Eliminar ${noun}`}
            className="hover:text-red-600 dark:hover:text-red-400"
          >
            <TrashIcon className="size-4" />
          </IconButton>
        </li>
      ))}
    </ul>
  )
}
