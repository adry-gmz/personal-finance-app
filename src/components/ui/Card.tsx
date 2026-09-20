import { Spinner } from '@/components/ui/Spinner'

/** Contenedor base de las secciones del dashboard. */
export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/**
 * Hueco para cuando una sección no tiene datos.
 *
 * Nunca dejamos un espacio en blanco sin explicación: el usuario debe poder
 * distinguir "no hay nada registrado" de "algo falló".
 */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-slate-500">{children}</p>
}

export function LoadingState({ children = 'Cargando…' }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
      <Spinner className="size-4" />
      {children}
    </div>
  )
}

export function ErrorState({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="py-8 text-center text-sm text-red-600">
      {children}
    </p>
  )
}

/**
 * Barra de progreso. El porcentaje ya viene acotado entre 0 y 100.
 *
 * `className` estiliza el carril exterior (ancho, márgenes) y `barClassName`
 * la barra de relleno (su color). Son dos elementos distintos, así que
 * mezclarlos en una sola prop llevaría a aplicar clases al elemento erróneo.
 */
export function ProgressBar({
  percent,
  className = '',
  barClassName = 'bg-slate-900',
}: {
  percent: number
  className?: string
  barClassName?: string
}) {
  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-slate-100 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${barClassName}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
