import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from '@/components/RouteGuards'
import { AppLayout } from '@/layouts/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { DebtsPage } from '@/pages/DebtsPage'
import { FundsPage } from '@/pages/FundsPage'
import { LoansPage } from '@/pages/LoansPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TransactionsPage } from '@/pages/TransactionsPage'

/**
 * Vista previa del dashboard con datos de ejemplo, solo en desarrollo.
 * En producción import.meta.env.DEV es false y el bundler elimina esta
 * rama entera, junto con el archivo de la página.
 */
const DevPreviewPage = import.meta.env.DEV ? lazy(() => import('@/pages/DevPreviewPage')) : null

/**
 * Rutas de la aplicación.
 *
 * Se agrupan por tipo de acceso:
 *   · PublicOnlyRoute — solo para quien NO tiene sesión (el login)
 *   · ProtectedRoute  — exige sesión; dentro va el layout con la navegación
 */
export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/debts" element={<DebtsPage />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/funds" element={<FundsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {DevPreviewPage && (
        <Route element={<AppLayout />}>
          <Route
            path="/dev/preview"
            element={
              <Suspense>
                <DevPreviewPage />
              </Suspense>
            }
          />
        </Route>
      )}

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
