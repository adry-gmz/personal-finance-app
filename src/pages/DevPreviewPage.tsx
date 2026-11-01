import { useSearchParams } from 'react-router-dom'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { MonthSelector } from '@/components/MonthSelector'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import type { DashboardSummary } from '@/hooks/useDashboard'
import { queryClient } from '@/lib/queryClient'
import { usePeriod } from '@/hooks/usePeriod'
import { FundsPage } from '@/pages/FundsPage'
import type { Fund, FundMovement, TransactionWithCategory } from '@/types/database'

/**
 * Vista previa del dashboard con datos de ejemplo.
 *
 * Solo existe en desarrollo (ver App.tsx): sirve para revisar el diseño sin
 * iniciar sesión ni depender de la base de datos. No se incluye en el build
 * de producción.
 */
export default function DevPreviewPage() {
  const [searchParams] = useSearchParams()
  return searchParams.get('vista') === 'fondos' ? <FundsPreview /> : <DashboardPreview />
}

/**
 * Fondos con datos de ejemplo.
 *
 * En vez de duplicar la pantalla se monta la página real, con la caché de
 * React Query ya sembrada (ver el final del archivo): así lo que se revisa
 * es el mismo componente que verá el usuario, no una copia que puede quedar
 * desfasada.
 */
function FundsPreview() {
  return <FundsPage />
}

function DashboardPreview() {
  const { period, setPeriod } = usePeriod()

  return (
    <>
      <PageHeader
        title="Hola, Yisus"
        description="Vista previa con datos de ejemplo."
        actions={
          <>
            <MonthSelector />
            <Button>+ Registrar</Button>
          </>
        }
      />
      <DashboardView
        period={period}
        summary={SUMMARY}
        transactions={TRANSACTIONS}
        yearlyTotals={YEARLY}
        annualTotals={[
          { year: period.year - 2, income: 3100, expense: 2650 },
          { year: period.year - 1, income: 3900, expense: 3050 },
          { year: period.year, income: 3250, expense: 2210 },
        ]}
        funds={FUNDS}
        onSelectMonth={(month) => setPeriod({ year: period.year, month })}
      />
    </>
  )
}

const YEARLY = [
  [300, 262], [300, 240], [335, 310], [300, 205], [350, 280], [300, 226],
  [335, 290], [335, 256], [350, 183], [0, 0], [0, 0], [0, 0],
].map(([income, expense], index) => ({ month: index + 1, income: income!, expense: expense! }))

const SUMMARY: DashboardSummary = {
  income: 350,
  expense: 183.24,
  balance: 166.76,
  fixedExpense: 64.99,
  variableExpense: 118.25,
  provisionsTotal: 240,
  savingsTotal: 370,
  pendingDebt: 190,
  provisionsThisMonth: 80,
  savingsThisMonth: 135,
  debtPaidThisMonth: 50,
  receivablePending: 220,
  receivedThisMonth: 40,
  expensesByCategory: [
    { name: 'Servicios', value: 55, color: '#06b6d4' },
    { name: 'Alimentación', value: 59.75, color: '#ef4444' },
    { name: 'Compras', value: 22, color: '#eab308' },
    { name: 'Transporte', value: 21.5, color: '#f97316' },
    { name: 'Salud', value: 15, color: '#ec4899' },
    { name: 'Entretenimiento', value: 9.99, color: '#a855f7' },
  ].sort((a, b) => b.value - a.value),
}

function fund(id: string, name: string, type: Fund['type'], current: number, target: number): Fund {
  return {
    id,
    user_id: 'demo',
    name,
    type,
    current_amount: current,
    target_amount: target,
    target_date: null,
    created_at: '',
  }
}

const FUNDS: Fund[] = [
  fund('1', 'Emergencia de casa', 'PROVISION', 180, 500),
  fund('2', 'Reparación de computadora', 'PROVISION', 60, 300),
  fund('3', 'Laptop', 'SAVING', 250, 800),
  fund('4', 'Emprendimiento', 'SAVING', 120, 1000),
]

function movement(
  id: string,
  fundId: string,
  type: FundMovement['type'],
  amount: number,
  date: string,
  description: string,
): FundMovement {
  return { id, fund_id: fundId, type, amount, date, description, created_at: '' }
}

const FUND_MOVEMENTS: Record<string, FundMovement[]> = {
  '1': [
    movement('m1', '1', 'CONTRIBUTION', 60, '2026-09-02', 'Aporte mensual'),
    movement('m2', '1', 'CONTRIBUTION', 60, '2026-08-02', 'Aporte mensual'),
    movement('m3', '1', 'CONTRIBUTION', 60, '2026-07-02', 'Aporte mensual'),
  ],
  '2': [
    movement('m4', '2', 'CONTRIBUTION', 40, '2026-09-03', 'Aporte mensual'),
    movement('m5', '2', 'WITHDRAWAL', 20, '2026-09-15', 'Cambio de teclado'),
    movement('m6', '2', 'CONTRIBUTION', 40, '2026-08-03', 'Aporte mensual'),
  ],
}

function tx(
  id: string,
  date: string,
  description: string,
  amount: number,
  type: 'INCOME' | 'EXPENSE',
  category: string,
  color: string,
): TransactionWithCategory {
  return {
    id,
    user_id: 'demo',
    category_id: id,
    type,
    expense_type: type === 'EXPENSE' ? 'VARIABLE' : null,
    description,
    amount,
    date,
    is_recurring: false,
    created_at: '',
    year: 2026,
    month: 9,
    category: { id, name: category, type, color },
  }
}

const TRANSACTIONS: TransactionWithCategory[] = [
  tx('a', '2026-09-20', 'Ropa', 22, 'EXPENSE', 'Compras', '#eab308'),
  tx('b', '2026-09-19', 'Medicamentos', 15, 'EXPENSE', 'Salud', '#ec4899'),
  tx('c', '2026-09-17', 'Almuerzo', 8.25, 'EXPENSE', 'Alimentación', '#ef4444'),
  tx('d', '2026-09-14', 'Proyecto freelance', 50, 'INCOME', 'Trabajo extra', '#0d9488'),
  tx('e', '2026-09-12', 'Combustible', 20, 'EXPENSE', 'Transporte', '#f97316'),
  tx('f', '2026-09-01', 'Salario mensual', 300, 'INCOME', 'Salario', '#16a34a'),
]

/**
 * Siembra la caché al cargar el módulo, antes de que se monte nada.
 * El módulo solo se carga al entrar a /dev/preview, y queryClient es el
 * mismo singleton que usa la aplicación.
 */
queryClient.setQueryData(['funds'], FUNDS)
for (const demoFund of FUNDS) {
  queryClient.setQueryData(['fund-movements-for', demoFund.id], FUND_MOVEMENTS[demoFund.id] ?? [])
}
