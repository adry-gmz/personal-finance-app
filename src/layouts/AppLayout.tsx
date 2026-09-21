import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  CloseIcon,
  DashboardIcon,
  DebtsIcon,
  FundsIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
  TransactionsIcon,
} from '@/components/Icons'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { to: '/transactions', label: 'Movimientos', Icon: TransactionsIcon },
  { to: '/debts', label: 'Deudas', Icon: DebtsIcon },
  { to: '/funds', label: 'Fondos', Icon: FundsIcon },
  { to: '/settings', label: 'Ajustes', Icon: SettingsIcon },
] as const

/**
 * Estructura de las pantallas con sesión iniciada.
 *
 * En escritorio la navegación es una barra lateral fija. En móvil se
 * convierte en un panel deslizante que se abre desde la cabecera, para no
 * robarle ancho a la pantalla.
 */
export function AppLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Cabecera, solo en móvil y tablet */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="-ml-1 rounded-lg p-1.5 text-fg-secondary hover:bg-muted hover:text-fg"
          aria-label="Abrir menú"
        >
          <MenuIcon />
        </button>
        <span className="flex-1 font-semibold tracking-tight text-fg">Finanzas</span>
        <ThemeToggle />
      </header>

      {/* Panel deslizante en móvil */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Cerrar menú"
          />
          <div className="relative flex h-full w-72 max-w-[85%] flex-col border-r border-line bg-surface">
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="absolute top-3 right-3 rounded-lg p-1.5 text-fg-muted hover:bg-muted"
              aria-label="Cerrar menú"
            >
              <CloseIcon />
            </button>
            {/* Al tocar un enlace el panel se cierra, porque ese toque es
                lo que provoca la navegación. */}
            <SidebarContent onNavigate={() => setIsMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Barra lateral fija en escritorio */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-line lg:bg-surface">
        <SidebarContent />
      </div>

      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, user, signOut } = useAuth()

  // Mientras el perfil carga mostramos el correo, que ya tenemos en la sesión.
  const displayName = profile?.username ?? user?.email ?? ''
  const initial = displayName.charAt(0).toUpperCase() || '?'

  return (
    <>
      <div className="flex h-16 items-center justify-between pr-3 pl-6">
        <span className="text-lg font-semibold tracking-tight text-fg">Finanzas</span>
        {/* En móvil el botón de tema vive en la cabecera; aquí chocaría con
            la ✕ de cerrar el panel. */}
        <ThemeToggle className="hidden lg:block" />
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-muted text-fg'
                  : 'text-fg-secondary hover:bg-muted hover:text-fg'
              }`
            }
          >
            <Icon className="size-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-fg">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{displayName}</p>
            <p className="truncate text-xs text-fg-muted">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-fg-secondary transition-colors hover:bg-muted hover:text-fg"
        >
          <LogoutIcon className="size-5 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </>
  )
}
