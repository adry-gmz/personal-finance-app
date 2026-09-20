import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MIN_PASSWORD_LENGTH, signIn, signUp } from '@/services/auth'

type Mode = 'signin' | 'signup'

type FieldErrors = Partial<Record<'email' | 'password' | 'username' | 'fullName', string>>

/**
 * Login y registro en una sola pantalla.
 *
 * Supabase Auth identifica por correo electrónico. El nombre de usuario que
 * se pide al registrarse se guarda en `profiles` y solo sirve para mostrarlo
 * en la interfaz.
 *
 * Tras iniciar sesión no navegamos manualmente: el cambio de sesión lo
 * detecta AuthProvider y la ruta pública redirige sola al dashboard.
 */
export function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSignUp = mode === 'signup'

  function switchMode(next: Mode) {
    setMode(next)
    setFieldErrors({})
    setFormError(null)
    setSuccessMessage(null)
  }

  /** Validación en el cliente, para dar respuesta inmediata sin ir al servidor. */
  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (!email.trim()) {
      errors.email = 'El correo es obligatorio.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Escribe un correo válido.'
    }

    if (!password) {
      errors.password = 'La contraseña es obligatoria.'
    } else if (isSignUp && password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    }

    if (isSignUp) {
      const cleanUsername = username.trim()
      if (!cleanUsername) {
        errors.username = 'El nombre de usuario es obligatorio.'
      } else if (cleanUsername.length < 2) {
        errors.username = 'Debe tener al menos 2 caracteres.'
      }

      if (!fullName.trim()) {
        errors.fullName = 'El nombre es obligatorio.'
      }
    }

    return errors
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      if (isSignUp) {
        const { needsEmailConfirmation } = await signUp({ email, password, username, fullName })

        if (needsEmailConfirmation) {
          setSuccessMessage(
            'Cuenta creada. Revisa tu correo y abre el enlace de confirmación para poder iniciar sesión.',
          )
          setPassword('')
        }
        // Si no hace falta confirmar, Supabase ya entregó sesión y
        // AuthProvider redirige solo.
      } else {
        await signIn({ email, password })
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Ocurrió un error inesperado.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Finanzas</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSignUp ? 'Crea tu cuenta para empezar.' : 'Ingresa para ver tus finanzas.'}
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Selector de modo */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            <ModeTab active={!isSignUp} onClick={() => switchMode('signin')}>
              Iniciar sesión
            </ModeTab>
            <ModeTab active={isSignUp} onClick={() => switchMode('signup')}>
              Crear cuenta
            </ModeTab>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {isSignUp && (
              <>
                <Input
                  label="Nombre"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  error={fieldErrors.fullName}
                  autoComplete="name"
                  placeholder="Yisus Rivera"
                  disabled={isSubmitting}
                />
                <Input
                  label="Nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  error={fieldErrors.username}
                  hint="Así aparecerás en la aplicación."
                  autoComplete="username"
                  placeholder="yisus"
                  disabled={isSubmitting}
                />
              </>
            )}

            <Input
              label="Correo"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              autoComplete="email"
              placeholder="yisus@ejemplo.com"
              disabled={isSubmitting}
            />

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              hint={isSignUp ? `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.` : undefined}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              disabled={isSubmitting}
            />

            {formError && <Alert tone="error">{formError}</Alert>}
            {successMessage && <Alert tone="success">{successMessage}</Alert>}

            <Button type="submit" isLoading={isSubmitting} className="w-full">
              {isSubmitting
                ? isSignUp
                  ? 'Creando cuenta…'
                  : 'Entrando…'
                : isSignUp
                  ? 'Crear cuenta'
                  : 'Entrar'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Proyecto de portafolio. Usa datos ficticios.
        </p>
      </div>
    </main>
  )
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}
