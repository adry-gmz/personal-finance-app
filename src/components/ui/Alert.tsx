type AlertTone = 'error' | 'success' | 'info'

const TONES: Record<AlertTone, string> = {
  error: 'bg-red-50 text-red-800 ring-red-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
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
