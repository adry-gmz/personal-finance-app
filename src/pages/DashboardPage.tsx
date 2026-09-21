import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CategoryChart } from '@/components/CategoryChart'
import { DebtProgress } from '@/components/DebtProgress'
import { FundProgress } from '@/components/FundProgress'
import { IncomeExpenseChart } from '@/components/IncomeExpenseChart'
import { MonthSelector } from '@/components/MonthSelector'
import { SummaryCard } from '@/components/SummaryCard'
import { TransactionForm } from '@/components/TransactionForm'
import { TransactionList } from '@/components/TransactionList'
import { Button } from '@/components/ui/Button'
import { Card, ErrorState, LoadingState } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useDashboard } from '@/hooks/useDashboard'
import { usePeriod } from '@/hooks/usePeriod'
import { defaultDateForPeriod, formatPeriod } from '@/utils/dates'
import { formatMoney } from '@/utils/money'

/**
 * Dashboard del mes seleccionado.
 *
 * La organización responde a una idea central: el dinero que se gasta y el
 * dinero que se aparta son cosas distintas. La primera fila resume el mes
 * (entró, salió, quedó); la segunda muestra los acumulados que no se
 * consumen (deuda pendiente, provisiones, ahorros), cada uno con lo que se
 * movió durante este mes en particular.
 */
export function DashboardPage() {
  const { period } = usePeriod()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const { isLoading, error, summary, transactions, yearlyTotals, funds, debts } =
    useDashboard(period)

  const provisions = funds.filter((fund) => fund.type === 'PROVISION')
  const savings = funds.filter((fund) => fund.type === 'SAVING')

  return (
    <>
      <PageHeader
        title="Finanzas"
        description={formatPeriod(period)}
        actions={
          <>
            <MonthSelector />
            <Button onClick={() => setIsFormOpen(true)}>+ Registrar</Button>
          </>
        }
      />

      {error ? (
        <Card>
          <ErrorState>
            {error instanceof Error ? error.message : 'No se pudieron cargar tus datos.'}
          </ErrorState>
        </Card>
      ) : isLoading ? (
        <Card>
          <LoadingState>Cargando tus finanzas…</LoadingState>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Lo que ocurrió este mes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard label="Ingresos" amount={summary.income} tone="income" />
            <SummaryCard
              label="Gastos"
              amount={summary.expense}
              tone="expense"
              caption={`${formatMoney(summary.fixedExpense)} fijos · ${formatMoney(summary.variableExpense)} variables`}
            />
            <SummaryCard
              label="Balance"
              amount={summary.balance}
              tone="balance"
              showSign
              caption={summary.balance < 0 ? 'Gastaste más de lo que ingresaste' : undefined}
            />
          </div>

          {/* Lo acumulado, que no es gasto */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Deudas pendientes"
              amount={summary.pendingDebt}
              tone="debt"
              caption={
                summary.debtPaidThisMonth > 0
                  ? `Pagaste ${formatMoney(summary.debtPaidThisMonth)} este mes`
                  : 'Sin pagos este mes'
              }
            />
            <SummaryCard
              label="Provisiones"
              amount={summary.provisionsTotal}
              tone="provision"
              caption={captionForMonth(summary.provisionsThisMonth)}
            />
            <SummaryCard
              label="Ahorros"
              amount={summary.savingsTotal}
              tone="saving"
              caption={captionForMonth(summary.savingsThisMonth)}
            />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Gastos por categoría">
              <CategoryChart data={summary.expensesByCategory} total={summary.expense} />
            </Card>

            <Card title={`Ingresos vs gastos · ${period.year}`}>
              <IncomeExpenseChart data={yearlyTotals} highlightMonth={period.month} />
            </Card>
          </div>

          {/* Fondos y deudas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card title="Provisiones">
              <FundProgress
                funds={provisions}
                emptyMessage="No tienes provisiones registradas."
              />
            </Card>

            <Card title="Ahorros">
              <FundProgress funds={savings} emptyMessage="No tienes ahorros registrados." />
            </Card>

            <Card title="Deudas">
              <DebtProgress debts={debts} />
            </Card>
          </div>

          {/* Movimientos recientes */}
          <Card
            title="Movimientos recientes"
            action={
              <Link
                to="/transactions"
                className="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
              >
                Ver todos
              </Link>
            }
          >
            <TransactionList
              transactions={transactions}
              limit={8}
              emptyMessage={`No tienes movimientos registrados en ${formatPeriod(period).toLowerCase()}.`}
            />
          </Card>
        </div>
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

/** Texto bajo las tarjetas de fondos: cuánto se apartó o retiró este mes. */
function captionForMonth(amount: number): string {
  if (amount > 0) return `Apartaste ${formatMoney(amount)} este mes`
  if (amount < 0) return `Retiraste ${formatMoney(Math.abs(amount))} este mes`
  return 'Sin movimientos este mes'
}
