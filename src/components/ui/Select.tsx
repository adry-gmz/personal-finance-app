import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
  hint?: string
}

/**
 * Lista desplegable con su etiqueta y su mensaje de error.
 *
 * Es un <select> nativo a propósito: en móvil abre el selector del sistema,
 * que es más cómodo y accesible que cualquier menú hecho a mano.
 */
export function Select({ label, error, hint, className = '', children, ...props }: SelectProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-fg-secondary">
        {label}
      </label>
      <select
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-1.5 block w-full rounded-lg border-0 bg-surface px-3 py-2.5 text-fg ring-1 ring-inset outline-none focus:ring-2 disabled:bg-muted disabled:text-fg-muted ${
          error ? 'ring-red-300 focus:ring-red-500 dark:ring-red-500/50' : 'ring-line focus:ring-primary'
        } ${className}`}
      >
        {children}
      </select>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
