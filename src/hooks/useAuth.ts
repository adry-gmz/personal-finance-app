import { use } from 'react'
import { AuthContext } from '@/lib/auth-context'

/**
 * Acceso a la sesión actual desde cualquier componente.
 *
 * Lanza un error si se usa fuera de <AuthProvider>, porque en ese caso el
 * valor sería undefined y el fallo aparecería más tarde y más confuso.
 */
export function useAuth() {
  const context = use(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  }

  return context
}
