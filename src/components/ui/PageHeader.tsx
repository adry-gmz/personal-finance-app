/** Encabezado común de las páginas: título, descripción y acciones. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  )
}

/**
 * Espacio reservado para una sección que todavía no existe.
 *
 * Se usa en las rutas de fases posteriores para que la navegación funcione
 * completa desde ahora y el usuario nunca encuentre una pantalla en blanco
 * sin explicación.
 */
export function ComingSoon({ phase, children }: { phase: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-900">{children}</p>
      <p className="mt-1 text-sm text-slate-500">Se construye en la {phase}.</p>
    </div>
  )
}
