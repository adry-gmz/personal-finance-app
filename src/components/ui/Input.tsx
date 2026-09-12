import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  /** Mensaje de validación. Si existe, el campo se marca como inválido. */
  error?: string
  /** Texto de ayuda bajo el campo, visible cuando no hay error. */
  hint?: string
}

/**
 * Campo de formulario con su etiqueta y su mensaje de error.
 *
 * Los ids se generan con useId para que la etiqueta quede asociada al campo
 * aunque el mismo componente se use varias veces en la página.
 */
export function Input({ label, error, hint, className = '', ...props }: InputProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-1.5 block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-slate-900 ring-1 ring-inset outline-none placeholder:text-slate-400 focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 ${
          error ? 'ring-red-300 focus:ring-red-500' : 'ring-slate-200 focus:ring-slate-900'
        } ${className}`}
      />
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
