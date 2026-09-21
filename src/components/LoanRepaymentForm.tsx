import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useLoanMutations } from '@/hooks/useLoans'
import type { Loan } from '@/types/database'
import { todayAsDateString } from '@/utils/dates'
import { formatMoney, toCents } from '@/utils/money'

type FieldErrors = Partial<Record<'amount' | 'date', string>>

/** Registrar dinero que te devolvieron de un préstamo. */
export function LoanRepaymentForm({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const pending = (toCents(loan.total_amount) - toCents(loan.received_amount)) / 100

  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayAsDateString())
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const { addRepayment } = useLoanMutations()

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    const value = Number(amount)
    if (!amount.trim()) {
      errors.amount = 'El monto es obligatorio.'
    } else if (Number.isNaN(value) || value <= 0) {
      errors.amount = 'El monto debe ser mayor que cero.'
    } else if (toCents(value) > toCents(pending)) {
      errors.amount = `Supera lo que falta por cobrar (${formatMoney(pending)}).`
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
      await addRepayment.mutateAsync({
        loanId: loan.id,
        input: {
          amount: Math.round(Number(amount) * 100) / 100,
          date,
          description: description.trim(),
        },
      })
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo registrar el cobro.')
    }
  }

  const isSaving = addRepayment.isPending

  return (
    <Modal isOpen onClose={onClose} title={`Cobro · ${loan.borrower_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="flex items-baseline justify-between rounded-lg bg-muted px-3 py-2.5 text-sm">
          <span className="text-fg-muted">Falta por cobrar</span>
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

        <button
          type="button"
          onClick={() => setAmount(pending.toFixed(2))}
          disabled={isSaving}
          className="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          Cobrar todo lo pendiente
        </button>

        <Input
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          hint="Opcional."
          placeholder="Abono"
          maxLength={120}
          disabled={isSaving}
        />

        {formError && <Alert tone="error">{formError}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving}>
            Registrar cobro
          </Button>
        </div>
      </form>
    </Modal>
  )
}
