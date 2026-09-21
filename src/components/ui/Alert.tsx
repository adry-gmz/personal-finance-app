type AlertTone = 'error' | 'success' | 'info'

const TONES: Record<AlertTone, string> = {
  error: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  info: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
}

/**
 * Mensaje de estado para el usuario.
 *
 * Los errores usan role="alert" para que los lectores de pantalla los
 * anuncien apenas aparecen.
 */
export function Alert({ tone = 'info', children }: { tone?: AlertTone; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg px-3 py-2.5 text-sm ring-1 ring-inset ${TONES[tone]}`}
    >
      {children}
    </div>
  )
}
