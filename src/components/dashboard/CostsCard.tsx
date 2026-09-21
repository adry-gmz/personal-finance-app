import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { EmptyState } from '@/components/ui/Card'
import type { CategorySlice } from '@/hooks/useDashboard'
import { formatMoney, progressPercent, toCents } from '@/utils/money'

/** Rampa cian → azul → marino del tema. Se asigna por tamaño del gasto. */
const RAMP = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-7)',
  'var(--chart-6)',
]

/** Más categorías que esto vuelven ilegible el donut: el resto va a "Otras". */
const MAX_SLICES = 6

/**
 * Gastos del mes por categoría: donut con el total al centro y una tabla con
 * porcentaje y monto de cada una.
 *
 * Los colores salen de la paleta del tema, no del color de cada categoría,
 * para que el gráfico se lea como un conjunto. El color propio de cada
 * categoría se sigue usando en las listas de movimientos.
 */
export function CostsCard({ data, total }: { data: CategorySlice[]; total: number }) {
  const slices = groupSmallSlices(data).map((slice, index) => ({
    ...slice,
    fill: RAMP[index % RAMP.length]!,
  }))

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">Gastos</h2>
        <span className="text-base font-semibold text-fg tabular-nums">{formatMoney(total)}</span>
      </div>

      {slices.length === 0 ? (
        <EmptyState>No hay gastos registrados en este mes.</EmptyState>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <div className="relative size-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="60%"
                  outerRadius="100%"
                  paddingAngle={1.5}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.name} fill={slice.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [formatMoney(Number(value ?? 0)), String(name)]}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid var(--line)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--fg)',
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold tracking-tight text-fg tabular-nums">
                {formatMoney(total)}
              </span>
              <span className="text-xs text-fg-muted">Total</span>
            </div>
          </div>

          <table className="w-full text-sm">
            <tbody>
              {slices.map((slice) => (
                <tr key={slice.name}>
                  <td className="py-1.5 pr-2">
                    <span className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: slice.fill }}
                      />
                      <span className="truncate text-fg-secondary">{slice.name}</span>
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 text-right text-xs text-fg-muted tabular-nums">
                    {Math.round(progressPercent(slice.value, total))}%
                  </td>
                  <td className="py-1.5 text-right font-medium text-fg tabular-nums">
                    {formatMoney(slice.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/** Deja las categorías más grandes y junta el resto en "Otras". */
function groupSmallSlices(data: CategorySlice[]): CategorySlice[] {
  if (data.length <= MAX_SLICES) return data

  const kept = data.slice(0, MAX_SLICES - 1)
  const restCents = data.slice(MAX_SLICES - 1).reduce((sum, slice) => sum + toCents(slice.value), 0)
  return [...kept, { name: 'Otras', value: restCents / 100, color: '' }]
}
