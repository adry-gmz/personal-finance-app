import { QueryClient } from '@tanstack/react-query'

/**
 * Cliente de TanStack Query: centraliza caché, estados de carga y errores
 * de todas las consultas a Supabase.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
