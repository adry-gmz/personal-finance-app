import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { MonthPeriod } from '@/utils/dates'
import { addMonths, currentPeriod } from '@/utils/dates'

const PARAM = 'mes'

/** Convierte "2026-09" en un período, o null si el texto no es válido. */
function parsePeriodParam(value: string | null): MonthPeriod | null {
  if (!value) return null

  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null

  return { year, month }
}

function toParam({ year, month }: MonthPeriod): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * El mes seleccionado, guardado en la URL como `?mes=2026-09`.
 *
 * Vive en la URL y no en un useState para que el mes sobreviva a un F5, se
 * pueda compartir como enlace y funcione con los botones de atrás y adelante
 * del navegador. Si el parámetro falta o está mal escrito, cae al mes actual
 * en lugar de romperse.
 */
export function usePeriod() {
  const [searchParams, setSearchParams] = useSearchParams()

  const period = useMemo(
    () => parsePeriodParam(searchParams.get(PARAM)) ?? currentPeriod(),
    [searchParams],
  )

  const setPeriod = useCallback(
    (next: MonthPeriod) => {
      setSearchParams(
        (previous) => {
          const updated = new URLSearchParams(previous)
          updated.set(PARAM, toParam(next))
          return updated
        },
        // replace: el selector de mes no debería llenar el historial de
        // navegación con una entrada por cada clic en la flecha.
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const goToPreviousMonth = useCallback(
    () => setPeriod(addMonths(period, -1)),
    [period, setPeriod],
  )

  const goToNextMonth = useCallback(() => setPeriod(addMonths(period, 1)), [period, setPeriod])

  const goToCurrentMonth = useCallback(() => setPeriod(currentPeriod()), [setPeriod])

  const today = currentPeriod()
  const isCurrentMonth = period.year === today.year && period.month === today.month

  return {
    period,
    setPeriod,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    isCurrentMonth,
  }
}
