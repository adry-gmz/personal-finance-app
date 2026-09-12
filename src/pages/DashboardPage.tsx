import { ComingSoon, PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { currentPeriod, formatPeriod } from '@/utils/dates'

/**
 * Dashboard.
 *
 * En la FASE 3 solo confirma que la sesión funciona y muestra el perfil que
 * la base de datos creó automáticamente al registrarse. El selector de mes,
 * las tarjetas de resumen y los gráficos llegan en la FASE 4.
 */
export function DashboardPage() {
  const { profile, user } = useAuth()

  return (
    <>
      <PageHeader
        title={profile ? `Hola, ${profile.full_name || profile.username}` : 'Dashboard'}
        description={formatPeriod(currentPeriod())}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Tu sesión</h2>
        <p className="mt-1 text-sm text-slate-500">
          Estos datos vienen de Supabase Auth y de la tabla <code>profiles</code>.
        </p>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Detail label="Correo" value={user?.email ?? '—'} />
          <Detail label="Nombre de usuario" value={profile?.username ?? 'Cargando…'} />
          <Detail label="Nombre" value={profile?.full_name || '—'} />
          <Detail label="Rol" value={profile?.role ?? 'Cargando…'} />
        </dl>
      </section>

      <div className="mt-6">
        <ComingSoon phase="FASE 4">
          Aquí irán el selector de mes, el resumen de ingresos y gastos, y los gráficos.
        </ComingSoon>
      </div>
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="truncate font-medium text-slate-900">{value}</dd>
    </div>
  )
}
