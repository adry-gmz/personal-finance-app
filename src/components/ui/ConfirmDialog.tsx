import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

/**
 * Confirmación antes de una acción irreversible.
 *
 * Muestra qué se va a borrar, no solo "¿estás seguro?": con una lista de
 * movimientos parecidos, el usuario necesita ver cuál está a punto de
 * eliminar para poder confirmar con criterio.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  detail,
  confirmLabel = 'Eliminar',
  isLoading = false,
  error,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  detail?: React.ReactNode
  confirmLabel?: string
  isLoading?: boolean
  error?: string | null
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-sm text-slate-600">{message}</p>

      {detail && (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-900">
          {detail}
        </div>
      )}

      <p className="mt-3 text-sm text-slate-500">Esta acción no se puede deshacer.</p>

      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
