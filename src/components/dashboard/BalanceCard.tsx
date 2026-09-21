import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import type { MonthlyTotals } from '@/services/transactions'
import type { MonthPeriod } from '@/utils/dates'
import { formatPeriod, shortMonthName } from '@/utils/dates'
import { formatMoney, toCents } from '@/utils/money'

/**
 * Tarjeta principal del dashboard.
 *
 * Es oscura en los dos temas (clase card-hero), por eso usa colores fijos
 * claros en lugar de los tokens de texto, que cambian con el tema.
 *
 * Muestra el balance del mes, cuánto del ingreso se fue en gastos (el
 * anillo), la evolución del balance mes a mes y la diferencia con el mes
 * anterior.
 */
export function BalanceCard({
  period,
  income,
  expense,
  balance,
  yearlyTotals,
}: {
  period: MonthPeriod
  income: number
  expense: number
  balance: number
  yearlyTotals: MonthlyTotals[]
}) {
  // Balance de cada mes del año hasta el seleccionado, para la minigráfica.
  const history = yearlyTotals
    .filter((month) => month.month <= period.month)
    .map((month) => ({
      month: month.month,
      balance: (toCents(month.income) - toCents(month.expense)) / 100,
    }))

  const previous = history.find((month) => month.month === period.month - 1)
  const change = previous ? (toCents(balance) - toCents(previous.balance)) / 100 : null

  // Porcentaje del ingreso que se gastó. Sin ingresos no tiene sentido.
  const spentRatio = income > 0 ? Math.min(999, Math.round((expense / income) * 100)) : null

  return (
    <section className="card-hero relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#9fb4c4]">Balance</p>
          <p
            className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${
              balance < 0 ? 'text-[#f47b98]' : 'text-white'
            }`}
          >
            {formatMoney(balance)}
          </p>
        </div>
        <SpentRing percent={spentRatio} />
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-[#8aa2b3]">
        <CardChip />
        <span className="tracking-[0.2em]">••••</span>
        <span>{formatPeriod(period)}</span>
      </div>

      <div className="mt-3">
        <p className="text-xl font-semibold text-white tabular-nums">{formatMoney(income)}</p>
        <p className="text-xs text-[#8aa2b3]">Ingresos del mes · {formatMoney(expense)} en gastos</p>
      </div>

      {history.length > 1 && (
        <div className="-mx-5 mt-2 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
              <defs>
                <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3fd5ec" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3fd5ec" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#3fd5ec"
                strokeWidth={2}
                fill="url(#balance-fill)"
                isAnimationActive={false}
                dot={(props: { cx?: number; cy?: number; index?: number }) => (
                  <circle
                    key={props.index}
                    cx={props.cx}
                    cy={props.cy}
                    r={props.index === history.length - 1 ? 4 : 0}
                    fill="#0c1e2c"
                    stroke="#3fd5ec"
                    strokeWidth={2}
                  />
                )}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-medium text-[#c9d6df]">Cambio vs {previousLabel(period)}</span>
        <span
          className={`font-semibold tabular-nums ${
            change === null ? 'text-[#8aa2b3]' : change >= 0 ? 'text-[#3fd5ec]' : 'text-[#f47b98]'
          }`}
        >
          {change === null ? '—' : `${change >= 0 ? '+' : '−'}${formatMoney(Math.abs(change))}`}
        </span>
      </div>
    </section>
  )
}

function previousLabel(period: MonthPeriod): string {
  return period.month > 1 ? shortMonthName(period.month - 1).toLowerCase() : 'mes anterior'
}

/** Anillo con el porcentaje del ingreso que se fue en gastos. */
function SpentRing({ percent }: { percent: number | null }) {
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const filled = percent === null ? 0 : Math.min(100, percent) / 100
  const color = percent !== null && percent > 100 ? '#f47b98' : '#3fd5ec'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative size-14">
        <svg className="size-14 -rotate-90" viewBox="0 0 56 56" aria-hidden>
          <circle cx="28" cy="28" r={radius} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="5" />
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - filled)}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white tabular-nums">
          {percent === null ? '—' : `${percent}%`}
        </span>
      </div>
      <span className="text-[10px] text-[#8aa2b3]">del ingreso gastado</span>
    </div>
  )
}

/** Chip de tarjeta bancaria, puramente decorativo. */
function CardChip() {
  return (
    <svg className="h-4 w-6" viewBox="0 0 24 16" aria-hidden>
      <rect width="24" height="16" rx="3" fill="#c9d6df" opacity="0.85" />
      <path d="M0 6h24M0 10h24M9 0v16M15 0v16" stroke="#0f2638" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}
