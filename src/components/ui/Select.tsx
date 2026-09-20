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
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-1.5 block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-slate-900 ring-1 ring-inset outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 ${
          error ? 'ring-red-300 focus:ring-red-500' : 'ring-slate-200 focus:ring-slate-900'
        } ${className}`}
      >
        {children}
      </select>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
