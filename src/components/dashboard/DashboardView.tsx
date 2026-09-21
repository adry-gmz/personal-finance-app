import { Link } from 'react-router-dom'
import { AnnualCard } from '@/components/dashboard/AnnualCard'
import { BalanceCard } from '@/components/dashboard/BalanceCard'
import { CompareChart } from '@/components/dashboard/CompareChart'
import { CostsCard } from '@/components/dashboard/CostsCard'
import { GoalsCard } from '@/components/dashboard/GoalsCard'
import { ObligationsCard } from '@/components/dashboard/ObligationsCard'
import { TransactionList } from '@/components/TransactionList'
import { Card } from '@/components/ui/Card'
import type { DashboardSummary } from '@/hooks/useDashboard'
import type { MonthlyTotals, YearTotals } from '@/services/transactions'
import type { Fund, TransactionWithCategory } from '@/types/database'
import type { MonthPeriod } from '@/utils/dates'
import { formatPeriod } from '@/utils/dates'

export type DashboardViewProps = {
  period: MonthPeriod
  summary: DashboardSummary
  transactions: TransactionWithCategory[]
  yearlyTotals: MonthlyTotals[]
  annualTotals: YearTotals[]
  funds: Fund[]
  onSelectMonth: (month: number) => void
}

/**
 * Presentación del dashboard, sin acceso a datos.
 *
 * Recibe todo por props: DashboardPage le pasa los datos reales, y la vista
 * previa de desarrollo le pasa datos de ejemplo para poder revisar el
 * diseño sin iniciar sesión.
 *
 * Columna izquierda: el balance y lo acumulado (metas, deudas, préstamos).
 * Columna derecha: en qué se fue el dinero y cómo evoluciona el año.
 */
export function DashboardView({
  period,
  summary,
  transactions,
  yearlyTotals,
  annualTotals,
  funds,
  onSelectMonth,
}: DashboardViewProps) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="space-y-5">
        <BalanceCard
          period={period}
          income={summary.income}
          expense={summary.expense}
          balance={summary.balance}
          yearlyTotals={yearlyTotals}
        />
        <GoalsCard funds={funds} />
        <ObligationsCard
          pendingDebt={summary.pendingDebt}
          debtPaidThisMonth={summary.debtPaidThisMonth}
          receivablePending={summary.receivablePending}
          receivedThisMonth={summary.receivedThisMonth}
        />
        <AnnualCard data={annualTotals} year={period.year} />
      </div>

      <div className="space-y-5">
        <CostsCard data={summary.expensesByCategory} total={summary.expense} />
        <CompareChart
          data={yearlyTotals}
          year={period.year}
          selectedMonth={period.month}
          onSelectMonth={onSelectMonth}
        />
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
            limit={6}
            emptyMessage={`No tienes movimientos registrados en ${formatPeriod(period).toLowerCase()}.`}
          />
        </Card>
      </div>
    </div>
  )
}
