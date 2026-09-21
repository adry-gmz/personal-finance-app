import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { useCategories, useTransactionMutations } from '@/hooks/useTransactions'
import type { TransactionInput } from '@/services/transactions'
import type { ExpenseType, TransactionType, TransactionWithCategory } from '@/types/database'
import { todayAsDateString } from '@/utils/dates'

type FieldErrors = Partial<Record<'category' | 'amount' | 'date', string>>

type FormState = {
  type: TransactionType
  expenseType: ExpenseType
  categoryId: string
  amount: string
  date: string
  description: string
  isRecurring: boolean
}

function emptyForm(defaultDate: string): FormState {
  return {
    type: 'EXPENSE',
    expenseType: 'VARIABLE',
    categoryId: '',
    // Se guarda como texto porque es lo que devuelve un <input>. Convertir a
    // número solo al final evita que el campo se comporte de forma extraña
    // mientras se escribe (por ejemplo al teclear "0." o borrar todo).
    amount: '',
    date: defaultDate,
    description: '',
    isRecurring: false,
  }
}

function formFromTransaction(transaction: TransactionWithCategory): FormState {
  return {
    type: transaction.type,
    expenseType: transaction.expense_type ?? 'VARIABLE',
    categoryId: transaction.category_id,
    amount: String(transaction.amount),
    date: transaction.date,
    description: transaction.description,
    isRecurring: transaction.is_recurring,
  }
}

/**
 * Formulario para crear y editar movimientos.
 *
 * El mismo componente sirve para ambos casos: si recibe una transacción la
 * edita, y si no, crea una nueva. Son el mismo formulario con los mismos
 * campos y las mismas validaciones, así que duplicarlo solo daría dos sitios
 * donde corregir cada error.
 *
 * `defaultDate` hace que un movimiento nuevo caiga en el mes que el usuario
 * está viendo, no siempre en hoy: si está revisando agosto, lo natural es que
 * el formulario proponga una fecha de agosto.
 */
export function TransactionForm({
  isOpen,
  onClose,
  transaction,
  defaultDate,
}: {
  isOpen: boolean
  onClose: () => void
  transaction?: TransactionWithCategory | null
  defaultDate?: string
}) {
  const isEditing = Boolean(transaction)
  const initialDate = defaultDate ?? todayAsDateString()

  // El estado se inicializa una sola vez, al montar. Quien usa este
  // componente lo monta al abrir y lo desmonta al cerrar, así que cada
  // apertura parte de cero sin necesidad de reiniciarlo desde un efecto.
  const [form, setForm] = useState<FormState>(() =>
    transaction ? formFromTransaction(transaction) : emptyForm(initialDate),
  )
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const { data: categories = [], isLoading: isLoadingCategories } = useCategories()
  const { create, update } = useTransactionMutations()

  // Solo se ofrecen las categorías del tipo elegido. La base de datos lo
  // exige mediante una clave foránea compuesta, así que ofrecer las otras
  // solo llevaría a un error al guardar.
  const availableCategories = categories.filter((category) => category.type === form.type)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  /** Cambiar entre ingreso y gasto invalida la categoría seleccionada. */
  function changeType(type: TransactionType) {
    setForm((previous) => ({ ...previous, type, categoryId: '' }))
    setFieldErrors((previous) => ({ ...previous, category: undefined }))
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (!form.categoryId) {
      errors.category = 'Elige una categoría.'
    }

    const amount = Number(form.amount)
    if (!form.amount.trim()) {
      errors.amount = 'El monto es obligatorio.'
    } else if (Number.isNaN(amount)) {
      errors.amount = 'Escribe un número válido.'
    } else if (amount <= 0) {
      errors.amount = 'El monto debe ser mayor que cero.'
    }

    if (!form.date) {
      errors.date = 'La fecha es obligatoria.'
    }

    return errors
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const input: TransactionInput = {
      category_id: form.categoryId,
      type: form.type,
      // Un ingreso nunca es fijo ni variable. La base de datos rechaza
      // cualquier otra combinación.
      expense_type: form.type === 'EXPENSE' ? form.expenseType : null,
      description: form.description.trim(),
      // Redondeamos a centavos: la columna es NUMERIC(14,2) y un tercer
      // decimal se perdería en silencio.
      amount: Math.round(Number(form.amount) * 100) / 100,
      date: form.date,
      is_recurring: form.isRecurring,
    }

    try {
      if (transaction) {
        await update.mutateAsync({ id: transaction.id, input })
      } else {
        await create.mutateAsync(input)
      }
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el movimiento.')
    }
  }

  const isSaving = create.isPending || update.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar movimiento' : 'Registrar movimiento'}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Tipo: lo primero que se decide, porque cambia el resto */}
        <div>
          <span className="block text-sm font-medium text-fg-secondary">Tipo</span>
          <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <TypeTab
              active={form.type === 'INCOME'}
              onClick={() => changeType('INCOME')}
              activeClassName="text-income"
            >
              Ingreso
            </TypeTab>
            <TypeTab
              active={form.type === 'EXPENSE'}
              onClick={() => changeType('EXPENSE')}
              activeClassName="text-expense"
            >
              Gasto
            </TypeTab>
          </div>
        </div>

        <Select
          label="Categoría"
          value={form.categoryId}
          onChange={(e) => setField('categoryId', e.target.value)}
          error={fieldErrors.category}
          disabled={isSaving || isLoadingCategories}
        >
          <option value="">
            {isLoadingCategories ? 'Cargando categorías…' : 'Selecciona una categoría'}
          </option>
          {availableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>

        {/* Fijo o variable solo aplica a los gastos */}
        {form.type === 'EXPENSE' && (
          <div>
            {/* Dos opciones: botones en vez de lista desplegable, que en
                móvil abre el selector del sistema para elegir entre solo dos. */}
            <Segmented<ExpenseType>
              label="Tipo de gasto"
              options={[
                { value: 'VARIABLE', label: 'Variable' },
                { value: 'FIXED', label: 'Fijo' },
              ]}
              value={form.expenseType}
              onChange={(value) => setField('expenseType', value)}
              disabled={isSaving}
            />
            <p className="mt-1.5 text-sm text-fg-muted">
              Fijo se repite cada mes; variable depende del consumo.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Monto"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setField('amount', e.target.value)}
            error={fieldErrors.amount}
            placeholder="0.00"
            disabled={isSaving}
          />
          <Input
            label="Fecha"
            type="date"
            value={form.date}
            onChange={(e) => setField('date', e.target.value)}
            error={fieldErrors.date}
            disabled={isSaving}
          />
        </div>

        <Input
          label="Descripción"
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          hint="Opcional."
          placeholder="Almuerzo"
          maxLength={120}
          disabled={isSaving}
        />

        <label className="flex items-center gap-2.5 text-sm text-fg-secondary">
          <input
            type="checkbox"
            checked={form.isRecurring}
            onChange={(e) => setField('isRecurring', e.target.checked)}
            disabled={isSaving}
            className="size-4 accent-primary"
          />
          Se repite cada mes
        </label>

        {formError && <Alert tone="error">{formError}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {isEditing ? 'Guardar cambios' : 'Registrar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function TypeTab({
  active,
  onClick,
  activeClassName,
  children,
}: {
  active: boolean
  onClick: () => void
  activeClassName: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? `bg-raised shadow-sm ${activeClassName}` : 'text-fg-muted hover:text-fg'
      }`}
    >
      {children}
    </button>
  )
}
