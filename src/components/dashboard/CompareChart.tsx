import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState } from '@/components/ui/Card'
import type { MonthlyTotals } from '@/services/transactions'
import { currentPeriod, shortMonthName } from '@/utils/dates'
import { formatMoney, sumAmounts } from '@/utils/money'

type Series = 'income' | 'expense'

const SERIES: Record<Series, { label: string; color: string; gradient: string }> = {
  income: { label: 'Ingresos', color: 'var(--income)', gradient: 'compare-income' },
  expense: { label: 'Gastos', color: 'var(--expense)', gradient: 'compare-expense' },
}

/**
 * Ingresos contra gastos a lo largo del año.
 *
 * Curvas suaves con relleno degradado. Cada serie se puede ocultar con su
 * interruptor. El eje de meses son píldoras: la del mes seleccionado se
 * resalta y al pulsar otra se navega a ese mes.
 *
 * En el año en curso, los meses que aún no llegan no se dibujan (en vez de
 * caer a cero, que parecería un desplome).
 */
export function CompareChart({
  data,
  year,
  selectedMonth,
  onSelectMonth,
}: {
  data: MonthlyTotals[]
  year: number
  selectedMonth: number
  onSelectMonth: (month: number) => void
}) {
  const [visible, setVisible] = useState<Record<Series, boolean>>({ income: true, expense: true })

  const today = currentPeriod()
  const lastMonthWithData = year === today.year ? today.month : 12
  const chartData = data.map((month) => ({
    month: month.month,
    income: month.month <= lastMonthWithData ? month.income : null,
    expense: month.month <= lastMonthWithData ? month.expense : null,
  }))

  const hasData = data.some((month) => month.income > 0 || month.expense > 0)
  const totals = {
    income: sumAmounts(data.map((month) => month.income)),
    expense: sumAmounts(data.map((month) => month.expense)),
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h2 className="text-sm font-semibold text-fg">
          Ingresos vs gastos <span className="font-medium text-fg-muted">· {year}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          {(Object.keys(SERIES) as Series[]).map((key) => (
            <SeriesToggle
              key={key}
              label={SERIES[key].label}
              total={totals[key]}
              color={SERIES[key].color}
              checked={visible[key]}
              onChange={(checked) => setVisible((prev) => ({ ...prev, [key]: checked }))}
            />
          ))}
        </div>
      </div>

      {!hasData ? (
        <EmptyState>No hay movimientos registrados en {year}.</EmptyState>
      ) : (
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 24, right: 8, bottom: 0, left: -8 }}>
              <defs>
                {(Object.keys(SERIES) as Series[]).map((key) => (
                  <linearGradient key={key} id={SERIES[key].gradient} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES[key].color} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={SERIES[key].color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid stroke="var(--line-subtle)" vertical={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tick={{ fontSize: 11, fill: 'var(--fg-subtle)' }}
                tickFormatter={(value: number) => (value >= 1000 ? `$${value / 1000}k` : `$${value}`)}
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                interval={0}
                height={34}
                tick={(props: { x?: number | string; y?: number | string; payload?: { value: unknown } }) => (
                  <MonthPill
                    x={Number(props.x ?? 0)}
                    y={Number(props.y ?? 0)}
                    month={Number(props.payload?.value ?? 0)}
                    isSelected={Number(props.payload?.value) === selectedMonth}
                    onSelect={onSelectMonth}
                  />
                )}
              />
              <Tooltip
                cursor={{ stroke: 'var(--line)' }}
                labelFormatter={(month) => shortMonthName(Number(month))}
                formatter={(value, name) => [formatMoney(Number(value ?? 0)), String(name)]}
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--fg)',
                  fontSize: 13,
                }}
              />

              {/* Línea vertical que marca el mes seleccionado */}
              <ReferenceLine
                x={selectedMonth}
                stroke="var(--primary)"
                strokeOpacity={0.5}
                strokeDasharray="4 4"
              />

              {(Object.keys(SERIES) as Series[]).map(
                (key) =>
                  visible[key] && (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={SERIES[key].label}
                      stroke={SERIES[key].color}
                      strokeWidth={2.5}
                      fill={`url(#${SERIES[key].gradient})`}
                      connectNulls={false}
                      isAnimationActive={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)' }}
                      // El valor se lee de la fila: en un gráfico de área Recharts
                      // entrega props.value como el par [base, valor].
                      dot={(props: {
                        cx?: number
                        cy?: number
                        index?: number
                        payload?: { month: number; income: number | null; expense: number | null }
                      }) => (
                        <SelectedDot
                          key={props.index}
                          cx={props.cx}
                          cy={props.cy}
                          value={props.payload?.[key] ?? null}
                          color={SERIES[key].color}
                          isSelected={props.payload?.month === selectedMonth}
                        />
                      )}
                    />
                  ),
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

/** Punto con etiqueta de valor, solo en el mes seleccionado. */
function SelectedDot({
  cx,
  cy,
  value,
  color,
  isSelected,
}: {
  cx?: number
  cy?: number
  value: number | null
  color: string
  isSelected: boolean
}) {
  if (!isSelected || cx === undefined || cy === undefined || value === null) return <g />

  const label = formatMoney(value)
  const width = label.length * 6.6 + 12

  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="var(--surface)" stroke={color} strokeWidth={2.5} />
      <rect x={cx - width / 2} y={cy - 28} width={width} height={18} rx={5} fill={color} />
      <text
        x={cx}
        y={cy - 15}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="var(--primary-fg)"
      >
        {label}
      </text>
    </g>
  )
}

/** Mes del eje X como píldora pulsable. */
function MonthPill({
  x,
  y,
  month,
  isSelected,
  onSelect,
}: {
  x: number
  y: number
  month: number
  isSelected: boolean
  onSelect: (month: number) => void
}) {
  return (
    <g
      transform={`translate(${x},${y})`}
      onClick={() => onSelect(month)}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`Ver ${shortMonthName(month)}`}
    >
      <rect
        x={-17}
        y={6}
        width={34}
        height={20}
        rx={6}
        fill={isSelected ? 'var(--primary)' : 'transparent'}
        style={isSelected ? { filter: 'drop-shadow(0 0 6px var(--primary))' } : undefined}
      />
      <text
        x={0}
        y={20}
        textAnchor="middle"
        fontSize={11}
        fontWeight={isSelected ? 700 : 500}
        fill={isSelected ? 'var(--primary-fg)' : 'var(--fg-subtle)'}
      >
        {shortMonthName(month).toUpperCase()}
      </text>
    </g>
  )
}

/** Interruptor tipo switch con el nombre y el total de la serie. */
function SeriesToggle({
  label,
  total,
  color,
  checked,
  onChange,
}: {
  label: string
  total: number
  color: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs">
      <span className="font-semibold tabular-nums" style={{ color }}>
        {formatMoney(total)}
      </span>
      <span className="text-fg-muted">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`Mostrar ${label.toLowerCase()}`}
        onClick={() => onChange(!checked)}
        className="relative h-5 w-9 rounded-full transition-colors"
        style={{
          backgroundColor: checked ? color : 'var(--line)',
          boxShadow: checked ? `0 0 10px -2px ${color}` : undefined,
        }}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}
