import { useState } from 'react'
import { FundForm } from '@/components/FundForm'
import { FundMovementForm } from '@/components/FundMovementForm'
import { HistoryList } from '@/components/HistoryList'
import { EditIcon, TrashIcon } from '@/components/Icons'
import { SummaryCard } from '@/components/SummaryCard'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, ErrorState, LoadingState, ProgressBar } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DetailTile } from '@/components/ui/DetailTile'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { useFundMovements, useFundMutations, useFunds } from '@/hooks/useFunds'
import type { Fund, FundMovement, FundMovementType, FundType } from '@/types/database'
import { formatDate } from '@/utils/dates'
import { FUND_TYPE_HINTS } from '@/utils/labels'
import { formatMoney, progressPercent, sumAmounts, toCents } from '@/utils/money'

/** Qué formulario de movimiento está abierto y con qué tipo arranca. */
type MovementTarget = { fund: Fund; type: FundMovementType }

function remainingOf(fund: Fund): number {
  return Math.max(0, (toCents(fund.target_amount) - toCents(fund.current_amount)) / 100)
}

/**
 * Provisiones y ahorros.
 *
 * Los dos usan la misma tabla y la misma mecánica; lo que cambia es la
 * intención, y por eso se muestran en secciones separadas con su propio
 * color. current_amount llega ya calculado por el trigger.
 */
export function FundsPage() {
  const { data: funds = [], isLoading, error } = useFunds()
  const { remove, removeMovement } = useFundMutations()

  // `undefined` = cerrado. `null` en fundForm = creando uno nuevo.
  const [fundForm, setFundForm] = useState<Fund | null | undefined>(undefined)
  const [newFundType, setNewFundType] = useState<FundType>('PROVISION')
  const [movement, setMovement] = useState<MovementTarget | null>(null)
  const [deletingFund, setDeletingFund] = useState<Fund | null>(null)
  const [deletingMovement, setDeletingMovement] = useState<FundMovement | null>(null)

  const provisions = funds.filter((fund) => fund.type === 'PROVISION')
  const savings = funds.filter((fund) => fund.type === 'SAVING')

  const provisionsTotal = sumAmounts(provisions.map((fund) => fund.current_amount))
  const savingsTotal = sumAmounts(savings.map((fund) => fund.current_amount))
  const total = sumAmounts(funds.map((fund) => fund.current_amount))
  const targetTotal = sumAmounts(funds.map((fund) => fund.target_amount))

  function openNewFund(type: FundType) {
    setNewFundType(type)
    setFundForm(null)
  }

  async function confirmDeleteFund() {
    if (!deletingFund) return
    try {
      await remove.mutateAsync(deletingFund.id)
      setDeletingFund(null)
    } catch {
      // El error se muestra dentro del diálogo.
    }
  }

  async function confirmDeleteMovement() {
    if (!deletingMovement) return
    try {
      await removeMovement.mutateAsync(deletingMovement.id)
      setDeletingMovement(null)
    } catch {
      // El error se muestra dentro del diálogo.
    }
  }

  const cardHandlers = {
    onMove: (fund: Fund, type: FundMovementType) => setMovement({ fund, type }),
    onEdit: (fund: Fund) => setFundForm(fund),
    onDelete: setDeletingFund,
    onDeleteMovement: setDeletingMovement,
  }

  return (
    <>
      <PageHeader
        title="Fondos"
        description="Dinero que apartas: provisiones para imprevistos y ahorros con meta."
        actions={<Button onClick={() => openNewFund('PROVISION')}>+ Nuevo fondo</Button>}
      />

      {error ? (
        <Card>
          <ErrorState>
            {error instanceof Error ? error.message : 'No se pudieron cargar los fondos.'}
          </ErrorState>
        </Card>
      ) : isLoading ? (
        <Card>
          <LoadingState>Cargando fondos…</LoadingState>
        </Card>
      ) : funds.length === 0 ? (
        <Card>
          <EmptyState>
            No tienes fondos registrados. Crea una provisión para imprevistos o un ahorro con meta.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Provisiones"
              amount={provisionsTotal}
              tone="provision"
              caption={`${provisions.length} ${provisions.length === 1 ? 'fondo' : 'fondos'}`}
            />
            <SummaryCard
              label="Ahorros"
              amount={savingsTotal}
              tone="saving"
              caption={`${savings.length} ${savings.length === 1 ? 'fondo' : 'fondos'}`}
            />
            <SummaryCard
              label="Total apartado"
              amount={total}
              tone="balance"
              caption={`${Math.round(progressPercent(total, targetTotal))}% de ${formatMoney(targetTotal)} en metas`}
            />
          </div>

          <FundSection
            title="Provisiones"
            hint={FUND_TYPE_HINTS.PROVISION}
            funds={provisions}
            emptyMessage="No tienes provisiones registradas."
            onCreate={() => openNewFund('PROVISION')}
            handlers={cardHandlers}
          />

          <FundSection
            title="Ahorros"
            hint={FUND_TYPE_HINTS.SAVING}
            funds={savings}
            emptyMessage="No tienes ahorros registrados."
            onCreate={() => openNewFund('SAVING')}
            handlers={cardHandlers}
          />
        </div>
      )}

      {fundForm !== undefined && (
        <FundForm
          fund={fundForm}
          defaultType={newFundType}
          onClose={() => setFundForm(undefined)}
        />
      )}

      {movement && (
        <FundMovementForm
          fund={movement.fund}
          initialType={movement.type}
          onClose={() => setMovement(null)}
        />
      )}

      <ConfirmDialog
        isOpen={deletingFund !== null}
        onClose={() => setDeletingFund(null)}
        onConfirm={confirmDeleteFund}
        title="Eliminar fondo"
        message="Se eliminará el fondo junto con todo su historial de aportes y retiros."
        isLoading={remove.isPending}
        error={remove.error instanceof Error ? remove.error.message : null}
        detail={
          deletingFund && (
            <div className="flex justify-between gap-3">
              <span className="truncate">{deletingFund.name}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatMoney(deletingFund.current_amount)}
              </span>
            </div>
          )
        }
      />

      <ConfirmDialog
        isOpen={deletingMovement !== null}
        onClose={() => setDeletingMovement(null)}
        onConfirm={confirmDeleteMovement}
        title="Eliminar movimiento"
        message="El saldo del fondo se recalculará sin este movimiento."
        isLoading={removeMovement.isPending}
        error={removeMovement.error instanceof Error ? removeMovement.error.message : null}
        detail={
          deletingMovement && (
            <div className="flex justify-between gap-3">
              <span className="truncate">
                {deletingMovement.description ||
                  (deletingMovement.type === 'CONTRIBUTION' ? 'Aporte' : 'Retiro')}
                <span className="block text-xs text-fg-muted">
                  {formatDate(deletingMovement.date)}
                </span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatMoney(deletingMovement.amount)}
              </span>
            </div>
          )
        }
      />
    </>
  )
}

type CardHandlers = {
  onMove: (fund: Fund, type: FundMovementType) => void
  onEdit: (fund: Fund) => void
  onDelete: (fund: Fund) => void
  onDeleteMovement: (movement: FundMovement) => void
}

function FundSection({
  title,
  hint,
  funds,
  emptyMessage,
  onCreate,
  handlers,
}: {
  title: string
  hint: string
  funds: Fund[]
  emptyMessage: string
  onCreate: () => void
  handlers: CardHandlers
}) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-fg">
          {title} <span className="font-normal text-fg-muted">· {hint}</span>
        </h2>
        <button
          type="button"
          onClick={onCreate}
          className="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          + Agregar
        </button>
      </div>

      {funds.length === 0 ? (
        <Card>
          <EmptyState>{emptyMessage}</EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {funds.map((fund) => (
            <FundCard key={fund.id} fund={fund} {...handlers} />
          ))}
        </div>
      )}
    </section>
  )
}

function FundCard({
  fund,
  onMove,
  onEdit,
  onDelete,
  onDeleteMovement,
}: { fund: Fund } & CardHandlers) {
  const [showHistory, setShowHistory] = useState(false)

  const percent = progressPercent(fund.current_amount, fund.target_amount)
  const remaining = remainingOf(fund)
  const isComplete = remaining === 0
  const isProvision = fund.type === 'PROVISION'
  const accent = isProvision ? 'bg-provision' : 'bg-saving'

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-fg">{fund.name}</h3>
          {isComplete && (
            <span className="mt-1 inline-block rounded-full bg-income/10 px-2 py-0.5 text-xs font-medium text-income">
              Meta cumplida
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-0.5">
          <IconButton onClick={() => onEdit(fund)} label={`Editar ${fund.name}`}>
            <EditIcon className="size-4" />
          </IconButton>
          <IconButton
            onClick={() => onDelete(fund)}
            label={`Eliminar ${fund.name}`}
            className="hover:text-red-600 dark:hover:text-red-400"
          >
            <TrashIcon className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between text-sm">
        <span className="text-fg-muted tabular-nums">
          {formatMoney(fund.current_amount)}{' '}
          <span className="text-fg-subtle">/ {formatMoney(fund.target_amount)}</span>
        </span>
        <span className="text-xs text-fg-muted tabular-nums">{Math.round(percent)}%</span>
      </div>
      <ProgressBar
        percent={percent}
        className="mt-2"
        barClassName={isComplete ? 'bg-income' : accent}
      />

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <DetailTile label="Falta" value={isComplete ? '—' : formatMoney(remaining)} />
        <DetailTile
          label="Fecha objetivo"
          value={fund.target_date ? formatDate(fund.target_date) : '—'}
        />
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowHistory((open) => !open)}
          aria-expanded={showHistory}
          className="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          {showHistory ? 'Ocultar movimientos' : 'Ver movimientos'}
        </button>
        <div className="flex gap-2">
          {fund.current_amount > 0 && (
            <Button size="sm" variant="secondary" onClick={() => onMove(fund, 'WITHDRAWAL')}>
              Retirar
            </Button>
          )}
          <Button size="sm" onClick={() => onMove(fund, 'CONTRIBUTION')}>
            Aportar
          </Button>
        </div>
      </div>

      {showHistory && <MovementHistory fundId={fund.id} onDelete={onDeleteMovement} />}
    </Card>
  )
}

/** Historial del fondo. Solo se consulta cuando el usuario lo despliega. */
function MovementHistory({
  fundId,
  onDelete,
}: {
  fundId: string
  onDelete: (movement: FundMovement) => void
}) {
  const { data: movements = [], isLoading, error } = useFundMovements(fundId)

  return (
    <HistoryList
      items={movements}
      isLoading={isLoading}
      error={error}
      noun="movimiento"
      labelOf={(movement) => (movement.type === 'CONTRIBUTION' ? 'Aporte' : 'Retiro')}
      directionOf={(movement) => (movement.type === 'CONTRIBUTION' ? 'in' : 'out')}
      onDelete={onDelete}
    />
  )
}
