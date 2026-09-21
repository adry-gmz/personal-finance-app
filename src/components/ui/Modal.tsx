import { useEffect, useRef } from 'react'
import { CloseIcon } from '@/components/Icons'

/**
 * Diálogo modal.
 *
 * Usa el elemento nativo <dialog> en lugar de un div con posición fija: el
 * navegador se encarga solo de atrapar el foco dentro del diálogo, de cerrarlo
 * con Escape y de ocultar el resto de la página a los lectores de pantalla.
 * Replicar eso a mano son decenas de líneas fáciles de equivocar.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      // El navegador dispara "cancel" al pulsar Escape. Lo interceptamos
      // para que el estado de React también se entere de que se cerró.
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-line-subtle px-5 py-4">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1.5 rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-muted hover:text-fg"
          aria-label="Cerrar"
        >
          <CloseIcon className="size-5" />
        </button>
      </div>
      <div className="px-5 py-5">{children}</div>
    </dialog>
  )
}
