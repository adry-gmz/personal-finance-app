import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { EmptyState } from '@/components/ui/Card'
import type { CategorySlice } from '@/hooks/useDashboard'
import { formatMoney, progressPercent } from '@/utils/money'

/**
 * Gastos del mes repartidos por categoría.
 *
 * Es un donut, no un pastel: el hueco central deja sitio al total, que es el
 * número que se busca primero. Los colores vienen de cada categoría, que el
 * usuario podrá personalizar más adelante.
 *
 * La leyenda está escrita a mano en vez de usar la de Recharts porque así
 * puede mostrar el monto y el porcentaje de cada categoría, y adaptarse mejor
 * al ancho en móvil.
 */
export function CategoryChart({ data, total }: { data: CategorySlice[]; total: number }) {
  if (data.length === 0) {
    return <EmptyState>No hay gastos registrados en este mes.</EmptyState>
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative size-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatMoney(Number(value ?? 0)), String(name)]}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 13,
                boxShadow: '0 4px 12px rgb(15 23 42 / 0.08)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* El total va en el centro del donut, superpuesto al gráfico. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-500">Total</span>
          <span className="text-lg font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatMoney(total)}
          </span>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {data.map((slice) => (
          <li key={slice.name} className="flex items-center gap-2.5 text-sm">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="flex-1 truncate text-slate-600">{slice.name}</span>
            <span className="shrink-0 font-medium text-slate-900 tabular-nums">
              {formatMoney(slice.value)}
            </span>
            <span className="w-10 shrink-0 text-right text-xs text-slate-400 tabular-nums">
              {Math.round(progressPercent(slice.value, total))}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
