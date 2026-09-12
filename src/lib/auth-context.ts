import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

/**
 * Forma del contexto de autenticación.
 *
 * Vive en su propio archivo (sin componentes) para que el hot-reload de React
 * no pierda el estado al editar el proveedor.
 */
export type AuthContextValue = {
  session: Session | null
  user: User | null
  /** Fila de `profiles`. Puede ser null mientras carga. */
  profile: Profile | null
  /** true mientras aún no sabemos si hay sesión. Evita parpadeos al recargar. */
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
