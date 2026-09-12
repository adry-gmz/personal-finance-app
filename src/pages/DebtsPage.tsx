import { ComingSoon, PageHeader } from '@/components/ui/PageHeader'

export function DebtsPage() {
  return (
    <>
      <PageHeader
        title="Deudas"
        description="Saldo pendiente y progreso de cada deuda."
      />
      <ComingSoon phase="FASE 6">
        Aquí podrás crear deudas y registrar sus pagos.
      </ComingSoon>
    </>
  )
}
