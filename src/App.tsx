import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from '@/components/RouteGuards'
import { AppLayout } from '@/layouts/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { DebtsPage } from '@/pages/DebtsPage'
import { FundsPage } from '@/pages/FundsPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LoansPage } from '@/pages/LoansPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TransactionsPage } from '@/pages/TransactionsPage'

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
          <Route path="/funds" element={<FundsPage />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
