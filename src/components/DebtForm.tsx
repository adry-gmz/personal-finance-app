import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useDebtMutations } from '@/hooks/useDebts'
import type { DebtInputData } from '@/services/debts'
import type { Debt, DebtStatus } from '@/types/database'
import { toCents } from '@/utils/money'

type FieldErrors = Partial<Record<'name' | 'total' | 'interest', string>>

/**
 * Formulario para crear y editar deudas.
 *
 * Igual que TransactionForm, se monta al abrir y se desmonta al cerrar, así
 * que el estado inicial se toma una sola vez de la deuda recibida.
 *
 * paid_amount no aparece: lo mantiene el trigger desde los pagos.
 */
export function DebtForm({ onClose, debt }: { onClose: () => void; debt?: Debt | null }) {
  const isEditing = Boolean(debt)

  const [name, setName] = useState(debt?.name ?? '')
  const [total, setTotal] = useState(debt ? String(debt.total_amount) : '')
  const [interest, setInterest] = useState(
    debt?.interest_rate !== null && debt?.interest_rate !== undefined
      ? String(debt.interest_rate)
      : '',
  )
  const [dueDate, setDueDate] = useState(debt?.due_date ?? '')
  const [isCancelled, setIsCancelled] = useState(debt?.status === 'CANCELLED')

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const { create, update } = useDebtMutations()
  const isSaving = create.isPending || update.isPending

  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (!name.trim()) errors.name = 'El nombre es obligatorio.'

    const totalValue = Number(total)
    if (!total.trim()) {
      errors.total = 'El monto total es obligatorio.'
    } else if (Number.isNaN(totalValue) || totalValue <= 0) {
      errors.total = 'El monto debe ser mayor que cero.'
    }

    if (interest.trim()) {
      const rate = Number(interest)
      // La columna es NUMERIC(5,2): el máximo que admite es 999.99.
      if (Number.isNaN(rate) || rate < 0 || rate > 999.99) {
        errors.interest = 'Escribe un porcentaje entre 0 y 999.99.'
      }
    }

    return errors
  }

  /**
   * El estado sigue la misma regla que el trigger de la base de datos.
   * El trigger solo corre al registrar un pago, así que si aquí cambia el
   * total, el estado debe recalcularse en este mismo momento.
   */
  function resolveStatus(totalAmount: number): DebtStatus {
    if (isCancelled) return 'CANCELLED'
    const paid = debt?.paid_amount ?? 0
    return toCents(paid) >= toCents(totalAmount) ? 'PAID' : 'ACTIVE'
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const totalAmount = Math.round(Number(total) * 100) / 100

    const input: DebtInputData = {
      name: name.trim(),
      total_amount: totalAmount,
      interest_rate: interest.trim() ? Math.round(Number(interest) * 100) / 100 : null,
      due_date: dueDate || null,
      status: resolveStatus(totalAmount),
    }

    try {
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

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Editar deuda' : 'Nueva deuda'}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          placeholder="Nombre de la deuda"
          maxLength={80}
          disabled={isSaving}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Monto total"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            error={fieldErrors.total}
            placeholder="0.00"
            disabled={isSaving}
          />
          <Input
            label="Interés (%)"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            error={fieldErrors.interest}
            hint="Opcional."
            disabled={isSaving}
          />
        </div>

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
