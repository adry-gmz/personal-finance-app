import { useState } from 'react'
import { EditIcon, TrashIcon } from '@/components/Icons'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingState } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { useCategoryMutations, useProfileMutation } from '@/hooks/useSettings'
import { useCategories } from '@/hooks/useTransactions'
import type { Category, Profile, TransactionType } from '@/types/database'

/** Colores sugeridos. Se leen bien sobre fondo claro y oscuro. */
const PRESET_COLORS = [
  '#16a34a', '#0d9488', '#0891b2', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#ec4899', '#ef4444', '#f97316', '#eab308', '#64748b',
]

export function SettingsPage() {
  const { profile, user } = useAuth()

  return (
    <>
      <PageHeader title="Ajustes" description="Tu perfil y tus categorías." />
      <div className="space-y-6">
        {/* El formulario se monta cuando el perfil ya cargó, para que sus
            campos arranquen con los valores reales y no vacíos. */}
        {profile ? (
          <ProfileSection key={profile.id} profile={profile} email={user?.email ?? ''} />
        ) : (
          <Card title="Perfil">
            <LoadingState>Cargando perfil…</LoadingState>
          </Card>
        )}
        <CategoriesSection />
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

function ProfileSection({ profile, email }: { profile: Profile; email: string }) {
  const [fullName, setFullName] = useState(profile.full_name)
  const [username, setUsername] = useState(profile.username)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const mutation = useProfileMutation()

  const hasChanges = fullName !== profile.full_name || username !== profile.username

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSaved(false)

    const cleanUsername = username.trim()
    if (cleanUsername.length < 2 || cleanUsername.length > 32) {
      setError('El nombre de usuario debe tener entre 2 y 32 caracteres.')
      return
    }

    try {
      await mutation.mutateAsync({ username: cleanUsername, full_name: fullName.trim() })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.')
    }
  }

  return (
    <Card title="Perfil">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nombre"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              setSaved(false)
            }}
            maxLength={80}
            disabled={mutation.isPending}
          />
          <Input
            label="Nombre de usuario"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setSaved(false)
            }}
            maxLength={32}
            disabled={mutation.isPending}
          />
        </div>
        <Input label="Correo" value={email} disabled hint="El correo no se puede cambiar." />

        {error && <Alert tone="error">{error}</Alert>}
        {saved && <Alert tone="success">Cambios guardados.</Alert>}

        <div className="flex justify-end">
          <Button type="submit" isLoading={mutation.isPending} disabled={!hasChanges}>
            Guardar perfil
          </Button>
        </div>
      </form>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

type CategoryFormState = { type: TransactionType; category: Category | null }

function CategoriesSection() {
  const { data: categories = [], isLoading, error } = useCategories()
  const { remove } = useCategoryMutations()

  const [form, setForm] = useState<CategoryFormState | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  async function confirmDelete() {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      setDeleting(null)
    } catch {
      // El mensaje se muestra dentro del diálogo.
    }
  }

  function closeDelete() {
    setDeleting(null)
    remove.reset()
  }

  if (error) {
    return (
      <Card title="Categorías">
        <ErrorState>No se pudieron cargar las categorías.</ErrorState>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(['INCOME', 'EXPENSE'] as const).map((type) => (
          <Card
            key={type}
            title={type === 'INCOME' ? 'Categorías de ingreso' : 'Categorías de gasto'}
            action={
              <Button size="sm" variant="secondary" onClick={() => setForm({ type, category: null })}>
                + Nueva
              </Button>
            }
          >
            {isLoading ? (
              <LoadingState>Cargando categorías…</LoadingState>
            ) : (
              <CategoryList
                categories={categories.filter((category) => category.type === type)}
                onEdit={(category) => setForm({ type, category })}
                onDelete={setDeleting}
              />
            )}
          </Card>
        ))}
      </div>

      {form && (
        <CategoryForm type={form.type} category={form.category} onClose={() => setForm(null)} />
      )}

      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        title="Eliminar categoría"
        message="Solo se pueden eliminar categorías que no tengan movimientos."
        isLoading={remove.isPending}
        error={remove.error instanceof Error ? remove.error.message : null}
        detail={
          deleting && (
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: deleting.color }}
              />
              {deleting.name}
            </span>
          )
        }
      />
    </>
  )
}

function CategoryList({
  categories,
  onEdit,
  onDelete,
}: {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}) {
  if (categories.length === 0) {
    return <EmptyState>Todavía no tienes categorías de este tipo.</EmptyState>
  }

  return (
    <ul className="divide-y divide-line-subtle">
      {categories.map((category) => (
        <li key={category.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className="min-w-0 flex-1 truncate text-sm text-fg">{category.name}</span>
          <IconButton onClick={() => onEdit(category)} label={`Editar ${category.name}`}>
            <EditIcon className="size-4" />
          </IconButton>
          <IconButton
            onClick={() => onDelete(category)}
            label={`Eliminar ${category.name}`}
            className="hover:text-red-600 dark:hover:text-red-400"
          >
            <TrashIcon className="size-4" />
          </IconButton>
        </li>
      ))}
    </ul>
  )
}

function CategoryForm({
  type,
  category,
  onClose,
}: {
  type: TransactionType
  category: Category | null
  onClose: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[0]!)
  const [nameError, setNameError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | null>(null)
  const { create, update } = useCategoryMutations()
  const isSaving = create.isPending || update.isPending

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    if (!name.trim()) {
      setNameError('El nombre es obligatorio.')
      return
    }
    setNameError(undefined)

    const input = { name: name.trim(), color }
    try {
      if (category) {
        await update.mutateAsync({ id: category.id, input })
      } else {
        await create.mutateAsync({ type, input })
      }
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar la categoría.')
    }
  }

  const typeLabel = type === 'INCOME' ? 'ingreso' : 'gasto'

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={category ? 'Editar categoría' : `Nueva categoría de ${typeLabel}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={nameError}
          placeholder="Nombre de la categoría"
          maxLength={40}
          disabled={isSaving}
        />

        <fieldset>
          <legend className="text-sm font-medium text-fg-secondary">Color</legend>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setColor(preset)}
                aria-label={`Color ${preset}`}
                aria-pressed={color === preset}
                className={`size-7 rounded-full ring-offset-2 ring-offset-surface transition ${
                  color === preset ? 'ring-2 ring-fg' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: preset }}
              />
            ))}
            {/* Selector libre para cualquier otro color */}
            <label className="relative size-7 cursor-pointer overflow-hidden rounded-full ring-1 ring-line">
              <span className="sr-only">Otro color</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute -inset-2 size-11 cursor-pointer"
              />
            </label>
          </div>
        </fieldset>

        {formError && <Alert tone="error">{formError}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {category ? 'Guardar cambios' : 'Crear categoría'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
