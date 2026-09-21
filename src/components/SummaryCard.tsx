import { formatMoney } from '@/utils/money'

/**
 * Cada concepto financiero tiene su propio color, definido como token en
 * index.css. Que un ahorro nunca se vea igual que un gasto es parte del
 * objetivo de la aplicación, no una decoración.
 */
type Tone = 'income' | 'expense' | 'balance' | 'saving' | 'provision' | 'debt' | 'receivable'

const TONES: Record<Tone, { value: string; dot: string }> = {
  income: { value: 'text-income', dot: 'bg-income' },
  expense: { value: 'text-expense', dot: 'bg-expense' },
  balance: { value: 'text-fg', dot: 'bg-fg' },
  saving: { value: 'text-saving', dot: 'bg-saving' },
  provision: { value: 'text-provision', dot: 'bg-provision' },
  debt: { value: 'text-debt', dot: 'bg-debt' },
  receivable: { value: 'text-receivable', dot: 'bg-receivable' },
}

export function SummaryCard({
  label,
  amount,
  tone,
  caption,
  /** Muestra el signo del monto. Se usa en el balance, que puede ser negativo. */
  showSign = false,
}: {
  label: string
  amount: number
  tone: Tone
  caption?: string
  showSign?: boolean
}) {
  const styles = TONES[tone]

  // Un balance negativo se pinta en tono de alerta aunque su tono sea neutro:
  // es la información más importante de la tarjeta.
  const valueColor = showSign && amount < 0 ? 'text-debt' : styles.value

  const formatted = showSign && amount > 0 ? `+${formatMoney(amount)}` : formatMoney(amount)

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <span aria-hidden className={`size-2 rounded-full ${styles.dot}`} />
        <p className="text-sm text-fg-muted">{label}</p>
      </div>
      <p className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${valueColor}`}>
        {formatted}
      </p>
      {caption && <p className="mt-1 text-xs text-fg-subtle">{caption}</p>}
    </div>
  )
}
