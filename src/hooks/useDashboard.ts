import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getDebtPaymentsByPeriod, getDebts } from '@/services/debts'
import { getFundMovementsByPeriod, getFunds } from '@/services/funds'
import { getTransactionsByPeriod, getYearlyTotals } from '@/services/transactions'
import type { Debt, Fund, TransactionWithCategory } from '@/types/database'
import type { MonthPeriod } from '@/utils/dates'
import { sumAmounts, toCents } from '@/utils/money'

/** Una porción del gráfico de gastos por categoría. */
export type CategorySlice = {
  name: string
  value: number
  color: string
}

/**
 * Reúne todo lo que el dashboard necesita para un mes.
 *
 * Las cinco consultas se lanzan en paralelo con useQueries. Cada una tiene su
 * propia clave de caché, así que al cambiar de mes solo se vuelven a pedir las
 * que dependen del período: la lista de fondos y deudas, que son totales
 * acumulados, se reutilizan sin ir de nuevo al servidor.
 */
export function useDashboard(period: MonthPeriod) {
  const results = useQueries({
    queries: [
      {
        queryKey: ['transactions', period.year, period.month],
        queryFn: () => getTransactionsByPeriod(period),
      },
      {
        queryKey: ['yearly-totals', period.year],
        queryFn: () => getYearlyTotals(period.year),
      },
      { queryKey: ['funds'], queryFn: getFunds },
      { queryKey: ['debts'], queryFn: getDebts },
      {
        queryKey: ['fund-movements', period.year, period.month],
        queryFn: () => getFundMovementsByPeriod(period),
      },
      {
        queryKey: ['debt-payments', period.year, period.month],
        queryFn: () => getDebtPaymentsByPeriod(period),
      },
    ],
  })

  const [transactions, yearlyTotals, funds, debts, fundMovements, debtPayments] = results

  const isLoading = results.some((result) => result.isLoading)
  const error = results.find((result) => result.error)?.error ?? null

  const summary = useMemo(
    () =>
      buildSummary({
        transactions: transactions.data ?? [],
        funds: funds.data ?? [],
        debts: debts.data ?? [],
        fundMovements: fundMovements.data ?? [],
        debtPayments: debtPayments.data ?? [],
      }),
    [transactions.data, funds.data, debts.data, fundMovements.data, debtPayments.data],
  )

  return {
    isLoading,
    error,
    summary,
    transactions: transactions.data ?? [],
    yearlyTotals: yearlyTotals.data ?? [],
    funds: funds.data ?? [],
    debts: debts.data ?? [],
  }
}

type SummaryInput = {
  transactions: TransactionWithCategory[]
  funds: Fund[]
  debts: Debt[]
  fundMovements: { type: string; amount: number; fund: { type: string } | null }[]
  debtPayments: { amount: number }[]
}

/**
 * Los números del dashboard.
 *
 * Están deliberadamente separados: un aporte a un ahorro no es un gasto, y un
 * pago de deuda tampoco. Mezclarlos daría un "balance" que no significa nada.
 */
function buildSummary(input: SummaryInput) {
  const { transactions, funds, debts, fundMovements, debtPayments } = input

  // --- Del mes seleccionado ---
  const income = sumAmounts(
    transactions.filter((t) => t.type === 'INCOME').map((t) => t.amount),
  )
  const expense = sumAmounts(
    transactions.filter((t) => t.type === 'EXPENSE').map((t) => t.amount),
  )
  const balance = (toCents(income) - toCents(expense)) / 100

  const fixedExpense = sumAmounts(
    transactions.filter((t) => t.expense_type === 'FIXED').map((t) => t.amount),
  )
  const variableExpense = (toCents(expense) - toCents(fixedExpense)) / 100

  // --- Acumulados, no dependen del mes ---
  const provisionsTotal = sumAmounts(
    funds.filter((f) => f.type === 'PROVISION').map((f) => f.current_amount),
  )
  const savingsTotal = sumAmounts(
    funds.filter((f) => f.type === 'SAVING').map((f) => f.current_amount),
  )
  const pendingDebt =
    debts
      .filter((d) => d.status === 'ACTIVE')
      .reduce((total, d) => total + toCents(d.total_amount) - toCents(d.paid_amount), 0) / 100

  // --- Movimiento del mes sobre esos acumulados ---
  const netFundMovement = (fundType: string) =>
    fundMovements
      .filter((m) => m.fund?.type === fundType)
      .reduce(
        (total, m) => total + (m.type === 'CONTRIBUTION' ? toCents(m.amount) : -toCents(m.amount)),
        0,
      ) / 100

  return {
    income,
    expense,
    balance,
    fixedExpense,
    variableExpense,
    provisionsTotal,
    savingsTotal,
    pendingDebt,
    provisionsThisMonth: netFundMovement('PROVISION'),
    savingsThisMonth: netFundMovement('SAVING'),
    debtPaidThisMonth: sumAmounts(debtPayments.map((p) => p.amount)),
    expensesByCategory: groupExpensesByCategory(transactions),
  }
}

/** Agrupa los gastos del mes por categoría, de mayor a menor. */
function groupExpensesByCategory(transactions: TransactionWithCategory[]): CategorySlice[] {
  const byCategory = new Map<string, CategorySlice>()

  for (const transaction of transactions) {
    if (transaction.type !== 'EXPENSE') continue

    const name = transaction.category?.name ?? 'Sin categoría'
    const existing = byCategory.get(name)

    if (existing) {
      existing.value = (toCents(existing.value) + toCents(transaction.amount)) / 100
    } else {
      byCategory.set(name, {
        name,
        value: transaction.amount,
        color: transaction.category?.color ?? '#64748b',
      })
    }
  }

  return [...byCategory.values()].sort((a, b) => b.value - a.value)
}
