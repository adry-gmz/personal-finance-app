import { useEffect, useState } from 'react'
import { env, isSupabaseConfigured } from '@/lib/env'
import { formatMoney, progressPercent } from '@/utils/money'
import { currentPeriod, formatDate, formatPeriod } from '@/utils/dates'

type ConnectionState =
  | { status: 'checking' }
  | { status: 'ok' }
  | { status: 'missing-config' }
  | { status: 'error'; message: string }

/**
 * Pantalla de verificación de la FASE 1.
 * Confirma que Tailwind compila y que el proyecto alcanza Supabase.
 * Será reemplazada por el router y el login en la FASE 3.
 */
function App() {
  const [connection, setConnection] = useState<ConnectionState>({ status: 'checking' })

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setConnection({ status: 'missing-config' })
      return
    }

    let cancelled = false

    fetch(`${env.supabaseUrl}/auth/v1/health`, {
      headers: { apikey: env.supabaseAnonKey },
    })
      .then((response) => {
        if (cancelled) return
        if (response.ok) {
          setConnection({ status: 'ok' })
        } else {
          setConnection({ status: 'error', message: `El servidor respondió ${response.status}.` })
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Error desconocido'
        setConnection({ status: 'error', message })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      <header>
        <p className="text-sm font-medium text-slate-500">Fase 1 · Configuración</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Finanzas</h1>
        <p className="mt-2 text-slate-600">
          Verificación del entorno antes de construir la base de datos.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Estado del proyecto</h2>
        <ul className="mt-4 space-y-3">
          <CheckRow label="React + Vite + TypeScript" state="ok" detail="La aplicación se está ejecutando." />
          <CheckRow
            label="Tailwind CSS"
            state="ok"
            detail="Si ves esta tarjeta con bordes y sombra, los estilos compilan."
          />
          <CheckRow label="Conexión con Supabase" {...supabaseRowProps(connection)} />
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Utilidades base</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <Sample label="Moneda" value={formatMoney(1234.5)} />
          <Sample label="Fecha" value={formatDate('2026-09-11')} />
          <Sample label="Período" value={formatPeriod(currentPeriod())} />
        </dl>
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-slate-600">Ejemplo de progreso de fondo</span>
            <span className="font-medium text-slate-900">
              {formatMoney(180)} / {formatMoney(500)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-provision"
              style={{ width: `${progressPercent(180, 500)}%` }}
            />
          </div>
        </div>
      </section>
    </main>
  )
}

function supabaseRowProps(connection: ConnectionState): { state: RowState; detail: string } {
  switch (connection.status) {
    case 'checking':
      return { state: 'pending', detail: 'Comprobando…' }
    case 'ok':
      return { state: 'ok', detail: 'Supabase responde correctamente.' }
    case 'missing-config':
      return {
        state: 'warn',
        detail: 'Falta el archivo .env. Copia .env.example y completa tus claves de Supabase.',
      }
    case 'error':
      return { state: 'error', detail: `No se pudo conectar: ${connection.message}` }
  }
}

type RowState = 'ok' | 'pending' | 'warn' | 'error'

const ROW_STYLES: Record<RowState, { dot: string; icon: string }> = {
  ok: { dot: 'bg-emerald-500', icon: '✓' },
  pending: { dot: 'bg-slate-300', icon: '…' },
  warn: { dot: 'bg-amber-500', icon: '!' },
  error: { dot: 'bg-red-500', icon: '×' },
}

function CheckRow({ label, state, detail }: { label: string; state: RowState; detail: string }) {
  const styles = ROW_STYLES[state]
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${styles.dot}`}
      >
        {styles.icon}
      </span>
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-sm text-slate-600">{detail}</p>
      </div>
    </li>
  )
}

function Sample({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}

export default App
