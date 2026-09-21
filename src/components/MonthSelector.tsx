import { usePeriod } from '@/hooks/usePeriod'
import { addMonths, formatPeriod, shortMonthName } from '@/utils/dates'

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
 * Navegación entre meses: anterior, actual (resaltado) y siguiente.
 *
 * El mes seleccionado vive en la URL (ver usePeriod), no aquí dentro. Este
 * componente solo lo muestra y dispara los cambios.
 */
export function MonthSelector() {
  const { period, setPeriod, goToPreviousMonth, goToNextMonth, goToCurrentMonth, isCurrentMonth } =
    usePeriod()

  const previous = addMonths(period, -1)
  const next = addMonths(period, 1)

  const neighbour =
    'hidden rounded-full px-2.5 py-1 text-sm text-fg-subtle transition-colors hover:text-fg sm:block'

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={goToPreviousMonth}
        className="rounded-full p-1.5 text-fg-muted transition-colors hover:bg-muted hover:text-fg"
        aria-label="Mes anterior"
      >
        <ChevronIcon direction="left" />
      </button>

      <button type="button" onClick={() => setPeriod(previous)} className={neighbour}>
        {shortMonthName(previous.month)}
      </button>

      {/* aria-live avisa a los lectores de pantalla del cambio de mes. */}
      <span
        aria-live="polite"
        className="rounded-full bg-primary/15 px-3.5 py-1 text-sm font-semibold whitespace-nowrap text-fg ring-1 ring-primary/60 ring-inset"
      >
        {formatPeriod(period)}
      </span>

      <button type="button" onClick={() => setPeriod(next)} className={neighbour}>
        {shortMonthName(next.month)}
      </button>

      <button
        type="button"
        onClick={goToNextMonth}
        className="rounded-full p-1.5 text-fg-muted transition-colors hover:bg-muted hover:text-fg"
        aria-label="Mes siguiente"
      >
        <ChevronIcon direction="right" />
      </button>

      {/* Atajo de vuelta: al navegar varios meses es fácil perderse. */}
      {!isCurrentMonth && (
        <button
          type="button"
          onClick={goToCurrentMonth}
          className="ml-1 rounded-full px-2.5 py-1 text-sm font-medium text-fg-muted ring-1 ring-line transition-colors ring-inset hover:text-fg"
        >
          Hoy
        </button>
      )}
    </div>
  )
}
