import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'

/**
 * Mientras Supabase lee la sesión guardada no sabemos si hay usuario.
 * Sin esta pantalla, al recargar se vería el login por un instante antes
 * de reconocer al usuario ya autenticado.
 */
function SessionLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-fg-subtle">
      <Spinner className="size-6" />
      <span className="sr-only">Cargando sesión…</span>
    </div>
  )
}

/**
 * Rutas que exigen sesión. Si no hay, manda al login y recuerda a dónde
 * quería ir el usuario para devolverlo ahí después de entrar.
 *
 * Esto es solo comodidad de navegación: la seguridad real está en las
 * políticas RLS de PostgreSQL, que no devuelven datos sin `auth.uid()`.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <SessionLoading />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

/** Rutas solo para visitantes: un usuario con sesión no debe ver el login. */
export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <SessionLoading />

  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/dashboard'} replace />
  }

  return <Outlet />
}
