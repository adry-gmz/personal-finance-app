/** Control segmentado: una fila de opciones excluyentes. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <div role="group" aria-label={label}>
      <span className="block text-sm font-medium text-fg-secondary">{label}</span>
      <div
        className="mt-1.5 grid gap-1 rounded-lg bg-muted p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            disabled={disabled}
            className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
              value === option.value
                ? 'bg-raised text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
