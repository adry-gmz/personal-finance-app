import { supabase } from '@/lib/supabase'

/**
 * Servicio de autenticación.
 *
 * Es la única parte de la aplicación que llama a `supabase.auth`. Los
 * componentes usan el hook `useAuth`, nunca este módulo directamente.
 *
 * Nota sobre el inicio de sesión: Supabase Auth identifica a los usuarios
 * por correo electrónico, no por nombre de usuario. El `username` se guarda
 * en la tabla `profiles` y sirve para mostrarlo en la interfaz.
 */

export type Credentials = {
  email: string
  password: string
}

export type SignUpData = Credentials & {
  username: string
  fullName: string
}

/** Longitud mínima que exige Supabase Auth por defecto. */
export const MIN_PASSWORD_LENGTH = 6

export async function signIn({ email, password }: Credentials): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) throw new Error(translateAuthError(error.message))
}

/**
 * Crea la cuenta. El perfil en `profiles` lo crea automáticamente el trigger
 * `handle_new_user` de la base de datos, leyendo estos metadatos.
 *
 * Devuelve si el proyecto exige confirmar el correo: en ese caso Supabase no
 * entrega sesión y el usuario debe abrir el enlace que recibe por email.
 */
export async function signUp({
  email,
  password,
  username,
  fullName,
}: SignUpData): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        username: username.trim(),
        full_name: fullName.trim(),
      },
    },
  })

  if (error) throw new Error(translateAuthError(error.message))

  return { needsEmailConfirmation: data.session === null }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(translateAuthError(error.message))
}

/**
 * Traduce los mensajes de Supabase, que vienen en inglés y con vocabulario
 * técnico, a algo que el usuario pueda entender y accionar.
 */
function translateAuthError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }
  if (normalized.includes('email not confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.'
  }
  if (normalized.includes('user already registered') || normalized.includes('already been registered')) {
    return 'Ya existe una cuenta con ese correo. Inicia sesión.'
  }
  if (normalized.includes('password should be at least')) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  if (normalized.includes('unable to validate email address') || normalized.includes('invalid email')) {
    return 'El correo no tiene un formato válido.'
  }
  if (normalized.includes('email rate limit') || normalized.includes('for security purposes')) {
    return 'Demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.'
  }
  if (normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión a internet.'
  }

  return message
}
