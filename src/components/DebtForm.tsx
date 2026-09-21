import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { useDebtMutations } from '@/hooks/useDebts'
import type { DebtInputData } from '@/services/debts'
import type { Debt, DebtStatus, DebtType } from '@/types/database'
import { calculateInstallmentPlan } from '@/utils/installments'
import { DEBT_TYPE_LABELS } from '@/utils/labels'
import { formatMoney, toCents } from '@/utils/money'

type Mode = 'installments' | 'manual'

type FieldErrors = Partial<
  Record<'name' | 'principal' | 'rate' | 'count' | 'total' | 'installment', string>
>

/** Número de 2 decimales, o null si el campo está vacío. */
function parseOptional(value: string): number | null {
  return value.trim() ? Math.round(Number(value) * 100) / 100 : null
}

function toField(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

function isValidCount(value: string): boolean {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 600
}

/**
 * Formulario de deudas con dos formas de cargar los montos:
 *
 *   · Por cuotas: el usuario da monto, tasa anual y número de cuotas, y la
 *     app calcula cuota, interés y total con la fórmula de amortización.
 *   · Manual: el usuario escribe los valores tal como se los dio el banco o
 *     la tienda, porque no todos los planes siguen esa fórmula.
 *
 * En ambos casos lo que se guarda como total_amount es lo que se paga en
 * total. Es contra ese valor que el trigger compara los pagos.
 */
export function DebtForm({ onClose, debt }: { onClose: () => void; debt?: Debt | null }) {
  const isEditing = Boolean(debt)

  // Una deuda con monto, tasa y cuotas se abre en modo cuotas; el resto,
  // en manual, para mostrar los valores tal como se guardaron.
  const [mode, setMode] = useState<Mode>(
    !debt ||
      (debt.principal_amount !== null && debt.installments !== null && debt.interest_rate !== null)
      ? 'installments'
      : 'manual',
  )

  const [debtType, setDebtType] = useState<DebtType>(debt?.debt_type ?? 'LOAN')
  const [name, setName] = useState(debt?.name ?? '')
  const [principal, setPrincipal] = useState(toField(debt?.principal_amount))
  const [rate, setRate] = useState(toField(debt?.interest_rate))
  const [count, setCount] = useState(toField(debt?.installments))
  const [total, setTotal] = useState(toField(debt?.total_amount))
  const [installment, setInstallment] = useState(toField(debt?.installment_amount))
  const [dueDate, setDueDate] = useState(debt?.due_date ?? '')
  const [isCancelled, setIsCancelled] = useState(debt?.status === 'CANCELLED')

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const { create, update } = useDebtMutations()
  const isSaving = create.isPending || update.isPending

  // Vista previa en vivo del modo cuotas. Solo se calcula con datos válidos.
  const principalValue = Number(principal)
  const rateValue = rate.trim() ? Number(rate) : 0
  const plan =
    mode === 'installments' && principalValue > 0 && rateValue >= 0 && isValidCount(count)
      ? calculateInstallmentPlan(principalValue, rateValue, Number(count))
      : null

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!name.trim()) errors.name = 'Escribe el nombre de la deuda.'

    const rateIsValid = !rate.trim() || (Number(rate) >= 0 && Number(rate) <= 999.99)
    if (!rateIsValid) errors.rate = 'Escribe una tasa entre 0 y 999.99.'

    if (mode === 'installments') {
      if (!(Number(principal) > 0)) errors.principal = 'El monto debe ser mayor que cero.'
      if (!isValidCount(count)) errors.count = 'Escribe un número entero de cuotas (1 a 600).'
      return errors
    }

    if (!(Number(total) > 0)) errors.total = 'El total a pagar debe ser mayor que cero.'
    if (principal.trim()) {
      if (!(Number(principal) > 0)) {
        errors.principal = 'El monto debe ser mayor que cero.'
      } else if (toCents(Number(principal)) > toCents(Number(total))) {
        errors.principal = 'No puede ser mayor que el total a pagar.'
      }
    }
    if (installment.trim() && !(Number(installment) > 0)) {
      errors.installment = 'La cuota debe ser mayor que cero.'
    }
    if (count.trim() && !isValidCount(count)) {
      errors.count = 'Escribe un número entero de cuotas (1 a 600).'
    }
    return errors
  }

  /**
   * El estado sigue la misma regla que el trigger. El trigger solo corre al
   * registrar un pago, así que si aquí cambia el total, el estado debe
   * recalcularse en este momento.
   */
  function resolveStatus(totalAmount: number): DebtStatus {
    if (isCancelled) return 'CANCELLED'
    return toCents(debt?.paid_amount ?? 0) >= toCents(totalAmount) ? 'PAID' : 'ACTIVE'
  }

  function buildInput(): DebtInputData {
    const common = { name: name.trim(), debt_type: debtType, due_date: dueDate || null }

    if (mode === 'installments' && plan) {
      return {
        ...common,
        total_amount: plan.total,
        principal_amount: Math.round(principalValue * 100) / 100,
        installments: Number(count),
        installment_amount: plan.installment,
        interest_rate: Math.round(rateValue * 100) / 100,
        status: resolveStatus(plan.total),
      }
    }

    const totalAmount = Math.round(Number(total) * 100) / 100
    return {
      ...common,
      total_amount: totalAmount,
      principal_amount: parseOptional(principal),
      installments: count.trim() ? Number(count) : null,
      installment_amount: parseOptional(installment),
      interest_rate: parseOptional(rate),
      status: resolveStatus(totalAmount),
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      const input = buildInput()
      if (debt) {
        await update.mutateAsync({ id: debt.id, input })
      } else {
        await create.mutateAsync(input)
      }
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar la deuda.')
    }
  }

  function switchMode(next: Mode) {
    // Al pasar a manual con un cálculo hecho, se llevan sus resultados para
    // poder ajustarlos a mano a partir de ahí.
    if (next === 'manual' && plan) {
      setTotal(String(plan.total))
      setInstallment(String(plan.installment))
    }
    setMode(next)
    setFieldErrors({})
  }

  const moneyInput = {
    type: 'number',
    inputMode: 'decimal',
    step: '0.01',
    min: '0',
    placeholder: '0.00',
    disabled: isSaving,
  } as const

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Editar deuda' : 'Nueva deuda'}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Segmented
          label="Tipo"
          options={(Object.keys(DEBT_TYPE_LABELS) as DebtType[]).map((type) => ({
            value: type,
            label: DEBT_TYPE_LABELS[type],
          }))}
          value={debtType}
          onChange={setDebtType}
          disabled={isSaving}
        />

        <Input
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          placeholder="Nombre de la deuda"
          maxLength={80}
          disabled={isSaving}
        />

        <Segmented
          label="¿Cómo quieres ingresar los montos?"
          options={[
            { value: 'installments', label: 'Calcular por cuotas' },
            { value: 'manual', label: 'Manualmente' },
          ]}
          value={mode}
          onChange={switchMode}
          disabled={isSaving}
        />

        {mode === 'installments' ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Monto"
                {...moneyInput}
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                error={fieldErrors.principal}
              />
              <Input
                label="Tasa anual %"
                {...moneyInput}
                placeholder="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                error={fieldErrors.rate}
              />
              <Input
                label="Cuotas"
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                placeholder="12"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                error={fieldErrors.count}
                disabled={isSaving}
              />
            </div>

            {/* Resultado del cálculo, en vivo */}
            <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-3 text-sm">
              <PlanValue label="Cuota mensual" value={plan ? formatMoney(plan.installment) : '—'} />
              <PlanValue label="Interés total" value={plan ? formatMoney(plan.interest) : '—'} />
              <PlanValue label="Total a pagar" value={plan ? formatMoney(plan.total) : '—'} strong />
            </dl>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Total a pagar"
                {...moneyInput}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                error={fieldErrors.total}
                hint="Con intereses incluidos."
              />
              <Input
                label="Monto original"
                {...moneyInput}
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                error={fieldErrors.principal}
                hint="Opcional. Sin intereses."
              />
              <Input
                label="Cuota mensual"
                {...moneyInput}
                value={installment}
                onChange={(e) => setInstallment(e.target.value)}
                error={fieldErrors.installment}
                hint="Opcional."
              />
              <Input
                label="Número de cuotas"
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                error={fieldErrors.count}
                hint="Opcional."
                disabled={isSaving}
              />
            </div>
            <Input
              label="Tasa %"
              {...moneyInput}
              placeholder="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              error={fieldErrors.rate}
              hint="Opcional, solo como referencia."
            />
          </>
        )}

        <Input
          label="Fecha de vencimiento"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          hint="Opcional."
          disabled={isSaving}
        />

        {isEditing && (
          <label className="flex items-center gap-2.5 text-sm text-fg-secondary">
            <input
              type="checkbox"
              checked={isCancelled}
              onChange={(e) => setIsCancelled(e.target.checked)}
              disabled={isSaving}
              className="size-4 accent-primary"
            />
            Marcar como cancelada
          </label>
        )}

        {formError && <Alert tone="error">{formError}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {isEditing ? 'Guardar cambios' : 'Crear deuda'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function PlanValue({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className={`mt-0.5 tabular-nums ${strong ? 'font-semibold text-fg' : 'text-fg-secondary'}`}>
        {value}
      </dd>
    </div>
  )
}
