import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium text-fg-muted">Error 404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">
        Esta página no existe
      </h1>
      <Link
        to="/dashboard"
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg hover:bg-primary-hover"
      >
        Volver al dashboard
      </Link>
    </main>
  )
}
