import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useDebtMutations } from '@/hooks/useDebts'
import type { Debt } from '@/types/database'
import { todayAsDateString } from '@/utils/dates'
import { formatMoney, toCents } from '@/utils/money'

type FieldErrors = Partial<Record<'amount' | 'date', string>>

/**
 * Registrar un pago de una deuda.
 *
 * El formulario no toca la deuda: solo inserta en debt_payments. El trigger
 * de PostgreSQL recalcula paid_amount y, si se completa el total, marca la
 * deuda como pagada.
 */
export function DebtPaymentForm({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const pending = (toCents(debt.total_amount) - toCents(debt.paid_amount)) / 100

  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayAsDateString())
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const { addPayment } = useDebtMutations()

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    const value = Number(amount)

    if (!amount.trim()) {
      errors.amount = 'El monto es obligatorio.'
    } else if (Number.isNaN(value) || value <= 0) {
      errors.amount = 'El monto debe ser mayor que cero.'
    } else if (toCents(value) > toCents(pending)) {
      // Pagar de más casi siempre es un error de tipeo.
      errors.amount = `El pago supera el saldo pendiente (${formatMoney(pending)}).`
    }

    if (!date) errors.date = 'La fecha es obligatoria.'

    return errors
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      await addPayment.mutateAsync({
        debtId: debt.id,
        input: {
          amount: Math.round(Number(amount) * 100) / 100,
          date,
          description: description.trim(),
        },
      })
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo registrar el pago.')
    }
  }

  const isSaving = addPayment.isPending

  return (
    <Modal isOpen onClose={onClose} title={`Pago · ${debt.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="flex items-baseline justify-between rounded-lg bg-muted px-3 py-2.5 text-sm">
          <span className="text-fg-muted">Saldo pendiente</span>
          <span className="font-medium text-fg tabular-nums">{formatMoney(pending)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Monto"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={fieldErrors.amount}
            placeholder="0.00"
            disabled={isSaving}
          />
          <Input
            label="Fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={fieldErrors.date}
            disabled={isSaving}
          />
        </div>

        {/* Atajo para liquidar la deuda sin calcular el monto a mano */}
        <button
          type="button"
          onClick={() => setAmount(pending.toFixed(2))}
          disabled={isSaving}
          className="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          Pagar el total pendiente
        </button>

        <Input
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          hint="Opcional."
          placeholder="Cuota mensual"
          maxLength={120}
          disabled={isSaving}
        />

        {formError && <Alert tone="error">{formError}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving}>
            Registrar pago
          </Button>
        </div>
      </form>
    </Modal>
  )
}
