import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { YearTotals } from '@/services/transactions'
import { formatMoney } from '@/utils/money'

/**
 * Ingresos y gastos totales del año seleccionado frente a los dos
 * anteriores. El año actual se resalta; los otros quedan atenuados.
 */
export function AnnualCard({ data, year }: { data: YearTotals[]; year: number }) {
  const current = data.find((item) => item.year === year)

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">Resumen anual</h2>
        {current && (
          <span className="text-xs text-fg-muted tabular-nums">
            {formatMoney(current.income - current.expense)} de balance
          </span>
        )}
      </div>

      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barGap={4}>
            <defs>
              <linearGradient id="annual-income" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3fd5ec" />
                <stop offset="100%" stopColor="#14a9c4" />
              </linearGradient>
              <linearGradient id="annual-expense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5b8def" />
                <stop offset="100%" stopColor="#2f6bff" />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tick={(props: { x?: number | string; y?: number | string; payload?: { value: unknown } }) => {
                const isCurrent = Number(props.payload?.value) === year
                return (
                  <text
                    x={Number(props.x ?? 0)}
                    y={Number(props.y ?? 0) + 12}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={isCurrent ? 700 : 500}
                    fill={isCurrent ? 'var(--fg)' : 'var(--fg-subtle)'}
                  >
                    {String(props.payload?.value ?? '')}
                  </text>
                )
              }}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)' }}
              formatter={(value, name) => [formatMoney(Number(value ?? 0)), String(name)]}
              contentStyle={{
                borderRadius: 10,
                border: '1px solid var(--line)',
                backgroundColor: 'var(--surface)',
                color: 'var(--fg)',
                fontSize: 13,
              }}
            />
            <Bar
              dataKey="income"
              name="Ingresos"
              fill="url(#annual-income)"
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
              isAnimationActive={false}
              // Los años que no son el seleccionado se atenúan.
              shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: YearTotals }) => (
                <FadedBar {...props} faded={props.payload?.year !== year} fill="url(#annual-income)" />
              )}
            />
            <Bar
              dataKey="expense"
              name="Gastos"
              fill="url(#annual-expense)"
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
              isAnimationActive={false}
              shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: YearTotals }) => (
                <FadedBar {...props} faded={props.payload?.year !== year} fill="url(#annual-expense)" />
              )}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex justify-center gap-4 text-xs text-fg-muted">
        <Legend color="bg-income">Ingresos</Legend>
        <Legend color="bg-expense">Gastos</Legend>
      </div>
    </section>
  )
}

function FadedBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
  faded,
}: {
  x?: number
  y?: number
  width?: number
  height?: number
  fill: string
  faded: boolean
}) {
  if (height <= 0) return <g />
  const r = Math.min(4, width / 2)
  // Rectángulo con solo las esquinas superiores redondeadas.
  const path = `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`
  return <path d={path} fill={fill} opacity={faded ? 0.35 : 1} />
}

function Legend({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={`size-2 rounded-full ${color}`} />
      {children}
    </span>
  )
}
