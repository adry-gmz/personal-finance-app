import { ComingSoon, PageHeader } from '@/components/ui/PageHeader'

export function FundsPage() {
  return (
    <>
      <PageHeader
        title="Fondos"
        description="Provisiones para imprevistos y ahorros con meta."
      />
      <ComingSoon phase="FASE 7">
        Aquí podrás crear provisiones y ahorros, y registrar aportes y retiros.
      </ComingSoon>
    </>
  )
}
