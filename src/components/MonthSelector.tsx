import { usePeriod } from '@/hooks/usePeriod'
import { formatPeriod } from '@/utils/dates'

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  )
}

/**
 * Navegación entre meses.
 *
 * El mes seleccionado vive en la URL (ver usePeriod), no aquí dentro. Este
 * componente solo lo muestra y dispara los cambios.
 */
export function MonthSelector() {
  const { period, goToPreviousMonth, goToNextMonth, goToCurrentMonth, isCurrentMonth } =
    usePeriod()

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg bg-surface ring-1 ring-line ring-inset">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="rounded-l-lg px-2.5 py-2 text-fg-muted transition-colors hover:bg-muted hover:text-fg"
          aria-label="Mes anterior"
        >
          <ChevronIcon direction="left" />
        </button>

        {/* aria-live avisa a los lectores de pantalla del cambio de mes,
            que de otro modo pasaría desapercibido. */}
        <span
          aria-live="polite"
          className="min-w-38 px-1 text-center text-sm font-medium text-fg"
        >
          {formatPeriod(period)}
        </span>

        <button
          type="button"
          onClick={goToNextMonth}
          className="rounded-r-lg px-2.5 py-2 text-fg-muted transition-colors hover:bg-muted hover:text-fg"
          aria-label="Mes siguiente"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      {/* Atajo de vuelta: al navegar varios meses es fácil perderse. */}
      {!isCurrentMonth && (
        <button
          type="button"
          onClick={goToCurrentMonth}
          className="rounded-lg px-2.5 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-muted hover:text-fg"
        >
          Hoy
        </button>
      )}
    </div>
  )
}
