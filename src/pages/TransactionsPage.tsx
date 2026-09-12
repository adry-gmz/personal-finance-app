import { ComingSoon, PageHeader } from '@/components/ui/PageHeader'

export function TransactionsPage() {
  return (
    <>
      <PageHeader
        title="Movimientos"
        description="Ingresos y gastos del mes seleccionado."
      />
      <ComingSoon phase="FASE 5">
        Aquí podrás registrar, editar y eliminar ingresos y gastos.
      </ComingSoon>
    </>
  )
}
