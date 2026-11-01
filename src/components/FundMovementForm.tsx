import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { useFundMutations } from '@/hooks/useFunds'
import type { Fund, FundMovementType } from '@/types/database'
import { todayAsDateString } from '@/utils/dates'
import { formatMoney, toCents } from '@/utils/money'

type FieldErrors = Partial<Record<'amount' | 'date', string>>

/**
 * Aportar o retirar de un fondo.
 *
 * El retiro no puede dejar el fondo en negativo. Esa regla la impone un
 * trigger de PostgreSQL; aquí se valida antes solo para avisar al instante,
 * sin esperar al servidor.
 */
export function FundMovementForm({
  fund,
  initialType = 'CONTRIBUTION',
  onClose,
}: {
  fund: Fund
  initialType?: FundMovementType
  onClose: () => void
}) {
  const [type, setType] = useState<FundMovementType>(initialType)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayAsDateString())
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const { addMovement } = useFundMutations()
  const isSaving = addMovement.isPending

  const isWithdrawal = type === 'WITHDRAWAL'
  const remainingToTarget = Math.max(
    0,
    (toCents(fund.target_amount) - toCents(fund.current_amount)) / 100,
  )

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    const value = Number(amount)

    if (!amount.trim()) {
      errors.amount = 'El monto es obligatorio.'
    } else if (Number.isNaN(value) || value <= 0) {
      errors.amount = 'El monto debe ser mayor que cero.'
    } else if (isWithdrawal && toCents(value) > toCents(fund.current_amount)) {
      errors.amount = `Solo tienes ${formatMoney(fund.current_amount)} en este fondo.`
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
      await addMovement.mutateAsync({
        fundId: fund.id,
        input: {
          type,
          amount: Math.round(Number(amount) * 100) / 100,
          date,
          description: description.trim(),
        },
      })
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo registrar el movimiento.')
    }
  }

  /** Atajo para completar la meta de una vez. */
  const completeShortcut = !isWithdrawal && remainingToTarget > 0 ? remainingToTarget : null

  return (
    <Modal isOpen onClose={onClose} title={fund.name}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Segmented<FundMovementType>
          label="Movimiento"
          options={[
            { value: 'CONTRIBUTION', label: 'Aportar' },
            { value: 'WITHDRAWAL', label: 'Retirar' },
          ]}
          value={type}
          onChange={(value) => {
            setType(value)
            setFieldErrors({})
          }}
          disabled={isSaving}
        />

        <div className="flex items-baseline justify-between rounded-lg bg-muted px-3 py-2.5 text-sm">
          <span className="text-fg-muted">{isWithdrawal ? 'Disponible' : 'Falta para la meta'}</span>
          <span className="font-medium text-fg tabular-nums">
            {formatMoney(isWithdrawal ? fund.current_amount : remainingToTarget)}
          </span>
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

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {completeShortcut !== null && (
            <button
              type="button"
              onClick={() => setAmount(completeShortcut.toFixed(2))}
              disabled={isSaving}
              className="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
            >
              Completar la meta ({formatMoney(completeShortcut)})
            </button>
          )}
          {isWithdrawal && fund.current_amount > 0 && (
            <button
              type="button"
              onClick={() => setAmount(fund.current_amount.toFixed(2))}
              disabled={isSaving}
              className="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
            >
              Retirar todo ({formatMoney(fund.current_amount)})
            </button>
          )}
        </div>

        <Input
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          hint="Opcional."
          placeholder={isWithdrawal ? 'Motivo del retiro' : 'Aporte mensual'}
          maxLength={120}
          disabled={isSaving}
        />

        {formError && <Alert tone="error">{formError}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {isWithdrawal ? 'Registrar retiro' : 'Registrar aporte'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
