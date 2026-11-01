import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { useFundMutations } from '@/hooks/useFunds'
import type { Fund, FundType } from '@/types/database'
import { FUND_TYPE_HINTS, FUND_TYPE_LABELS } from '@/utils/labels'
import { formatMoney, toCents } from '@/utils/money'

type FieldErrors = Partial<Record<'name' | 'target', string>>

/**
 * Crear y editar fondos.
 *
 * El saldo actual no aparece: lo mantiene el trigger desde los aportes y
 * retiros. Aquí solo se define la meta.
 */
export function FundForm({
  fund,
  defaultType = 'PROVISION',
  onClose,
}: {
  fund?: Fund | null
  defaultType?: FundType
  onClose: () => void
}) {
  const isEditing = Boolean(fund)

  const [type, setType] = useState<FundType>(fund?.type ?? defaultType)
  const [name, setName] = useState(fund?.name ?? '')
  const [target, setTarget] = useState(fund ? String(fund.target_amount) : '')
  const [targetDate, setTargetDate] = useState(fund?.target_date ?? '')

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const { create, update } = useFundMutations()
  const isSaving = create.isPending || update.isPending

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!name.trim()) errors.name = 'Escribe el nombre del fondo.'

    const value = Number(target)
    if (!target.trim()) {
      errors.target = 'La meta es obligatoria.'
    } else if (Number.isNaN(value) || value <= 0) {
      errors.target = 'La meta debe ser mayor que cero.'
    } else if (fund && toCents(value) < toCents(fund.current_amount)) {
      // La base de datos no lo prohíbe, pero una meta por debajo de lo ya
      // apartado deja el progreso en 100% y pierde sentido.
      errors.target = `Ya tienes ${formatMoney(fund.current_amount)} apartados. La meta no puede ser menor.`
    }

    return errors
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const input = {
      name: name.trim(),
      type,
      target_amount: Math.round(Number(target) * 100) / 100,
      target_date: targetDate || null,
    }

    try {
      if (fund) {
        await update.mutateAsync({ id: fund.id, input })
      } else {
        await create.mutateAsync(input)
      }
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el fondo.')
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Editar fondo' : 'Nuevo fondo'}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Segmented<FundType>
            label="Tipo"
            options={(Object.keys(FUND_TYPE_LABELS) as FundType[]).map((value) => ({
              value,
              label: FUND_TYPE_LABELS[value],
            }))}
            value={type}
            onChange={setType}
            disabled={isSaving}
          />
          <p className="mt-1.5 text-sm text-fg-muted">{FUND_TYPE_HINTS[type]}</p>
        </div>

        <Input
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          placeholder={type === 'PROVISION' ? 'Emergencia de casa' : 'Laptop'}
          maxLength={80}
          disabled={isSaving}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Meta"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            error={fieldErrors.target}
            placeholder="0.00"
            disabled={isSaving}
          />
          <Input
            label="Fecha objetivo"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            hint="Opcional."
            disabled={isSaving}
          />
        </div>

        {formError && <Alert tone="error">{formError}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {isEditing ? 'Guardar cambios' : 'Crear fondo'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
