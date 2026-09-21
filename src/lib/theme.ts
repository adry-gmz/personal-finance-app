import { useSyncExternalStore } from 'react'

/**
 * Tema claro u oscuro.
 *
 * La fuente de verdad es la clase `.dark` en <html>, que index.html pone
 * antes de que cargue React para que la página no parpadee en blanco al
 * abrirse. Este módulo solo la lee y la cambia.
 *
 * Es un store externo (useSyncExternalStore) y no un useState porque hay
 * varios botones de tema a la vez en pantalla (cabecera móvil y barra
 * lateral): todos deben enterarse del cambio al mismo tiempo.
 */
export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'theme'
const listeners = new Set<() => void>()

function getTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Sin localStorage (modo privado estricto) el tema funciona igual,
    // solo que no se recuerda en la próxima visita.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme)
  return {
    theme,
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  }
}
