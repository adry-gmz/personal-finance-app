import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState } from '@/components/ui/Card'
import type { MonthlyTotals } from '@/services/transactions'
import { shortMonthName } from '@/utils/dates'
import { formatMoney } from '@/utils/money'

/**
 * Ingresos contra gastos a lo largo del año.
 *
 * Barras y no líneas: cada mes es un período cerrado e independiente, no una
 * magnitud que evoluciona de forma continua. Unir los puntos con una línea
 * sugeriría valores intermedios que no existen.
 *
 * El mes seleccionado se resalta bajando la opacidad de los demás, para
 * situarlo dentro del año sin sacarlo del contexto.
 */
export function IncomeExpenseChart({
  data,
  highlightMonth,
}: {
  data: MonthlyTotals[]
  highlightMonth: number
}) {
  const hasData = data.some((month) => month.income > 0 || month.expense > 0)

  if (!hasData) {
    return <EmptyState>No hay movimientos registrados en este año.</EmptyState>
  }

  const chartData = data.map((month) => ({
    ...month,
    label: shortMonthName(month.month),
  }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `$${value}`}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            formatter={(value, name) => [formatMoney(Number(value ?? 0)), String(name)]}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 13,
              boxShadow: '0 4px 12px rgb(15 23 42 / 0.08)',
            }}
          />
          <Bar dataKey="income" name="Ingresos" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {chartData.map((month) => (
              <Cell
                key={`income-${month.month}`}
                fill="var(--color-income)"
                fillOpacity={month.month === highlightMonth ? 1 : 0.35}
              />
            ))}
          </Bar>
          <Bar dataKey="expense" name="Gastos" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {chartData.map((month) => (
              <Cell
                key={`expense-${month.month}`}
                fill="var(--color-expense)"
                fillOpacity={month.month === highlightMonth ? 1 : 0.35}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 flex justify-center gap-5 text-xs text-slate-500">
        <LegendItem className="bg-income">Ingresos</LegendItem>
        <LegendItem className="bg-expense">Gastos</LegendItem>
      </div>
    </div>
  )
}

function LegendItem({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={`size-2.5 rounded-full ${className}`} />
      {children}
    </span>
  )
}
