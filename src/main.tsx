import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/components/AuthProvider'
import { queryClient } from '@/lib/queryClient'
import '@/index.css'

// El orden importa: AuthProvider usa el cliente de Query para cargar el
// perfil y para limpiar la caché al cerrar sesión, así que va por dentro.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
