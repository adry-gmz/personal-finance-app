/** Botón que solo muestra un icono. `label` es obligatorio para accesibilidad. */
export function IconButton({
  onClick,
  label,
  className = '',
  children,
}: {
  onClick: () => void
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 ${className}`}
    >
      {children}
    </button>
  )
}
