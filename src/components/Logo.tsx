/** Marca de la app: línea ascendente sobre un degradado cian → azul. */
export function Logo({ showName = true }: { showName?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg className="size-8 shrink-0" viewBox="0 0 32 32" aria-hidden>
        <defs>
          <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3fd5ec" />
            <stop offset="100%" stopColor="#2f6bff" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#logo-gradient)" />
        <path
          d="M7 21.5l5.5-5.5 4 3.5L25 11"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19.5 11H25v5.5"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showName && (
        <span className="text-lg font-semibold tracking-tight text-fg">Finanzas</span>
      )}
    </span>
  )
}
