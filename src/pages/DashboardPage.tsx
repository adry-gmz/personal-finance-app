import { useState } from 'react'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { MonthSelector } from '@/components/MonthSelector'
import { TransactionForm } from '@/components/TransactionForm'
import { Button } from '@/components/ui/Button'
import { Card, ErrorState, LoadingState } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { useDashboard } from '@/hooks/useDashboard'
import { usePeriod } from '@/hooks/usePeriod'
import { defaultDateForPeriod } from '@/utils/dates'

/**
 * Dashboard del mes seleccionado.
 *
 * Esta página solo carga los datos y maneja el formulario de registro. Todo
 * lo visual está en DashboardView.
 */
export function DashboardPage() {
  const { profile } = useAuth()
  const { period, setPeriod } = usePeriod()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const dashboard = useDashboard(period)

  const firstName = profile?.full_name?.split(' ')[0] || profile?.username

  return (
    <>
      <PageHeader
        title={firstName ? `Hola, ${firstName}` : 'Tus finanzas'}
        description="Así va tu mes."
        actions={
          <>
            <MonthSelector />
            <Button onClick={() => setIsFormOpen(true)}>+ Registrar</Button>
          </>
        }
      />

      {dashboard.error ? (
        <Card>
          <ErrorState>
            {dashboard.error instanceof Error
              ? dashboard.error.message
              : 'No se pudieron cargar tus datos.'}
          </ErrorState>
        </Card>
      ) : dashboard.isLoading ? (
        <Card>
          <LoadingState>Cargando tus finanzas…</LoadingState>
        </Card>
      ) : (
        <DashboardView
          period={period}
          summary={dashboard.summary}
          transactions={dashboard.transactions}
          yearlyTotals={dashboard.yearlyTotals}
          annualTotals={dashboard.annualTotals}
          funds={dashboard.funds}
          onSelectMonth={(month) => setPeriod({ year: period.year, month })}
        />
      )}

      {/* Se monta al abrir y se desmonta al cerrar: así cada apertura parte
          de un formulario limpio, sin reiniciarlo a mano. */}
      {isFormOpen && (
        <TransactionForm
          isOpen
          onClose={() => setIsFormOpen(false)}
          defaultDate={defaultDateForPeriod(period)}
        />
      )}
    </>
  )
}
