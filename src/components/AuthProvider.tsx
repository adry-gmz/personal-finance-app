import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import * as authService from '@/services/auth'
import { getProfile } from '@/services/profiles'

/**
 * Mantiene la sesión disponible para toda la aplicación.
 *
 * Supabase guarda la sesión en localStorage y la renueva sola, pero leerla al
 * arrancar es asíncrono. Por eso existe `isLoading`: sin él, al recargar la
 * página el usuario vería el login por un instante antes de ser reconocido.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    let active = true

    // Sesión guardada de una visita anterior.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setIsLoadingSession(false)
    })

    // Cambios posteriores: login, logout, renovación del token.
    //
    // Este callback se mantiene síncrono a propósito. Llamar a otras
    // funciones de Supabase dentro de él puede bloquear el cliente, así que
    // solo guardamos la sesión y dejamos que el resto reaccione al cambio.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setIsLoadingSession(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null

  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId!),
    enabled: userId !== null,
    staleTime: 5 * 60_000,
  })

  const signOut = useCallback(async () => {
    await authService.signOut()
    // Los datos en caché son del usuario que se va: hay que descartarlos
    // para que el siguiente en entrar no vea nada suyo.
    queryClient.clear()
  }, [queryClient])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile: profile ?? null,
      isLoading: isLoadingSession,
      isAuthenticated: session !== null,
      signOut,
    }),
    [session, profile, isLoadingSession, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
