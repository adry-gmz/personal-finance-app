import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LogoutIcon } from '@/components/Icons'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Movimientos' },
  { to: '/debts', label: 'Deudas' },
  { to: '/loans', label: 'Por cobrar' },
  { to: '/funds', label: 'Fondos' },
  { to: '/settings', label: 'Ajustes' },
] as const

/**
 * Estructura de las pantallas con sesión iniciada.
 *
 * Navegación superior en píldoras dentro de un panel redondeado. En móvil
 * las píldoras pasan a una fila desplazable bajo la cabecera, y el panel
 * ocupa toda la pantalla para no desperdiciar ancho.
 */
export function AppLayout() {
  return (
    <div className="min-h-dvh lg:p-6">
      <div className="app-frame mx-auto flex min-h-dvh max-w-[1440px] flex-col lg:min-h-[calc(100dvh-3rem)] lg:rounded-[28px]">
        <header className="flex items-center gap-4 px-4 pt-4 pb-3 sm:px-6 lg:px-8 lg:py-5">
          <Logo />

          <nav aria-label="Principal" className="hidden flex-1 justify-center gap-2 lg:flex">
            {NAV_ITEMS.map((item) => (
              <NavPill key={item.to} {...item} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 lg:ml-0">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        {/* En móvil y tablet la navegación va en una fila desplazable */}
        <nav
          aria-label="Principal"
          className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden"
        >
          {NAV_ITEMS.map((item) => (
            <NavPill key={item.to} {...item} />
          ))}
        </nav>

        <main className="flex-1 px-4 pt-3 pb-8 sm:px-6 lg:px-8 lg:pt-2">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NavPill({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap ring-1 transition ring-inset ${
          isActive
            ? 'bg-primary/15 text-fg shadow-[0_0_22px_-6px_var(--primary)] ring-primary'
            : 'text-fg-muted ring-line hover:text-fg hover:ring-fg-subtle'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

/** Avatar con menú desplegable: quién eres y cerrar sesión. */
function UserMenu() {
  const { profile, user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer clic fuera o al pulsar Escape.
  useEffect(() => {
    if (!isOpen) return

    function handlePointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  const displayName = profile?.full_name || profile?.username || user?.email || ''
  const initial = displayName.charAt(0).toUpperCase() || '?'

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Menú de usuario"
        className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3fd5ec] to-[#2f6bff] text-sm font-semibold text-white shadow-[0_0_18px_-6px_#3fd5ec] ring-2 ring-white/10"
      >
        {initial}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="card absolute right-0 z-50 mt-2 w-64 overflow-hidden p-1.5"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-medium text-fg">{displayName}</p>
            <p className="truncate text-xs text-fg-muted">{user?.email}</p>
          </div>
          <div className="my-1 border-t border-line-subtle" />
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-fg-secondary transition-colors hover:bg-muted hover:text-fg"
          >
            <LogoutIcon className="size-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
