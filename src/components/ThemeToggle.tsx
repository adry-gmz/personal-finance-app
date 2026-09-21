import type { Theme } from '@/lib/theme'
import { setTheme, useTheme } from '@/lib/theme'

const OPTIONS: { value: Theme; label: string; path: React.ReactNode }[] = [
  {
    value: 'dark',
    label: 'Tema oscuro',
    path: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  },
  {
    value: 'light',
    label: 'Tema claro',
    path: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
]

/** Selector de tema: luna y sol lado a lado, con el activo resaltado. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme } = useTheme()

  return (
    <div
      role="group"
      aria-label="Tema"
      className={`flex items-center gap-0.5 rounded-full bg-muted p-0.5 ring-1 ring-line ring-inset ${className}`}
    >
      {OPTIONS.map((option) => {
        const isActive = theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={isActive}
            aria-label={option.label}
            title={option.label}
            className={`rounded-full p-1.5 transition-colors ${
              isActive ? 'bg-raised text-primary shadow-sm' : 'text-fg-subtle hover:text-fg'
            }`}
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {option.path}
            </svg>
          </button>
        )
      })}
    </div>
  )
}
