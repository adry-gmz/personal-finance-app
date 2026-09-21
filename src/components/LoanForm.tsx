import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useLoanMutations } from '@/hooks/useLoans'
import type { Loan, LoanStatus } from '@/types/database'
import { todayAsDateString } from '@/utils/dates'
import { formatMoney, toCents } from '@/utils/money'

type FieldErrors = Partial<Record<'borrower' | 'principal' | 'rate' | 'total' | 'date', string>>

/**
 * Registrar dinero prestado.
 *
 * La forma de cobrar interés la decide cada persona, así que la app no la
 * impone: con el % propone un total (monto + %), y el usuario puede
 * escribir otro. Desde que lo edita a mano, el total deja de recalcularse.
 */
export function LoanForm({ loan, onClose }: { loan?: Loan | null; onClose: () => void }) {
  const isEditing = Boolean(loan)

  const [borrower, setBorrower] = useState(loan?.borrower_name ?? '')
  const [principal, setPrincipal] = useState(loan ? String(loan.principal_amount) : '')
  const [rate, setRate] = useState(
    loan?.interest_rate !== null && loan?.interest_rate !== undefined ? String(loan.interest_rate) : '',
  )
  const [manualTotal, setManualTotal] = useState(loan ? String(loan.total_amount) : '')
  // Un préstamo que se edita respeta el total guardado.
  const [isTotalManual, setIsTotalManual] = useState(isEditing)
  const [loanDate, setLoanDate] = useState(loan?.loan_date ?? todayAsDateString())
  const [dueDate, setDueDate] = useState(loan?.due_date ?? '')
  const [notes, setNotes] = useState(loan?.notes ?? '')
  const [isCancelled, setIsCancelled] = useState(loan?.status === 'CANCELLED')

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const { create, update } = useLoanMutations()
  const isSaving = create.isPending || update.isPending

  const principalValue = Number(principal)
  const rateValue = rate.trim() ? Number(rate) : 0
  const suggestedTotal =
    principalValue > 0 && rateValue >= 0
      ? Math.round(principalValue * (1 + rateValue / 100) * 100) / 100
      : null

  const total = isTotalManual ? manualTotal : suggestedTotal !== null ? String(suggestedTotal) : ''
  const profit =
    principalValue > 0 && Number(total) > 0
      ? (toCents(Number(total)) - toCents(principalValue)) / 100
      : null

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!borrower.trim()) errors.borrower = 'Escribe a quién le prestaste.'
    if (!(principalValue > 0)) errors.principal = 'El monto debe ser mayor que cero.'
    if (rate.trim() && !(Number(rate) >= 0 && Number(rate) <= 9999.99)) {
      errors.rate = 'Escribe un porcentaje entre 0 y 9999.99.'
    }
    if (!(Number(total) > 0)) {
      errors.total = 'El total a recibir debe ser mayor que cero.'
    } else if (principalValue > 0 && toCents(Number(total)) < toCents(principalValue)) {
      errors.total = 'No puede ser menor que lo que prestaste.'
    }
    if (!loanDate) errors.date = 'La fecha es obligatoria.'
    return errors
  }

  function resolveStatus(totalAmount: number): LoanStatus {
    if (isCancelled) return 'CANCELLED'
    return toCents(loan?.received_amount ?? 0) >= toCents(totalAmount) ? 'PAID' : 'ACTIVE'
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const totalAmount = Math.round(Number(total) * 100) / 100
    const input = {
      borrower_name: borrower.trim(),
      principal_amount: Math.round(principalValue * 100) / 100,
      interest_rate: rate.trim() ? Math.round(Number(rate) * 100) / 100 : null,
      total_amount: totalAmount,
      loan_date: loanDate,
      due_date: dueDate || null,
      status: resolveStatus(totalAmount),
      notes: notes.trim(),
    }

    try {
      if (loan) {
        await update.mutateAsync({ id: loan.id, input })
      } else {
        await create.mutateAsync(input)
      }
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el préstamo.')
    }
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
    <Modal isOpen onClose={onClose} title={isEditing ? 'Editar préstamo' : 'Nuevo préstamo'}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="¿A quién le prestaste?"
          value={borrower}
          onChange={(e) => setBorrower(e.target.value)}
          error={fieldErrors.borrower}
          placeholder="Nombre de la persona"
          maxLength={80}
          disabled={isSaving}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Monto prestado"
            {...moneyInput}
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            error={fieldErrors.principal}
          />
          <Input
            label="Interés %"
            {...moneyInput}
            placeholder="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            error={fieldErrors.rate}
            hint="El que acordaste."
          />
        </div>

        <div>
          <Input
            label="Total a recibir"
            {...moneyInput}
            value={total}
            onChange={(e) => {
              setIsTotalManual(true)
              setManualTotal(e.target.value)
            }}
            error={fieldErrors.total}
            hint={
              isTotalManual
                ? 'Escrito a mano.'
                : 'Calculado como monto + %. Puedes cambiarlo.'
            }
          />
          {isTotalManual && suggestedTotal !== null && (
            <button
              type="button"
              onClick={() => setIsTotalManual(false)}
              disabled={isSaving}
              className="mt-1 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
            >
              Usar el calculado ({formatMoney(suggestedTotal)})
            </button>
          )}
        </div>

        {profit !== null && profit >= 0 && (
          <div className="flex items-baseline justify-between rounded-lg bg-muted px-3 py-2.5 text-sm">
            <span className="text-fg-muted">Ganancia esperada</span>
            <span className="font-medium text-receivable tabular-nums">{formatMoney(profit)}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha del préstamo"
            type="date"
            value={loanDate}
            onChange={(e) => setLoanDate(e.target.value)}
            error={fieldErrors.date}
            disabled={isSaving}
          />
          <Input
            label="Fecha acordada de pago"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            hint="Opcional."
            disabled={isSaving}
          />
        </div>

        <Input
          label="Notas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          hint="Opcional."
          placeholder="Condiciones del acuerdo"
          maxLength={200}
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
            Marcar como cancelado
          </label>
        )}

        {formError && <Alert tone="error">{formError}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {isEditing ? 'Guardar cambios' : 'Registrar préstamo'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
