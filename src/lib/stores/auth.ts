/**
 * auth.ts — Autenticación con Google vía Firebase (SDK modular).
 *
 * Configuración por variables de entorno de Vite (archivo .env en la raíz):
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_APP_ID
 *
 * Flujo de la app:
 *   1. Landing pública → botón "Entrar con Google" (popup de Firebase Auth).
 *   2. Sesión iniciada → se desbloquea la zona Web3 (Pali Wallet + transacciones).
 *
 * Sin sesión no hay wallet: el orden SIEMPRE es Google → wallet.
 */
import { writable, get } from 'svelte/store'
import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { pushToast } from './toast'

/* ------------------------------------------------------------------ */
/* Detección rápida de cierre de popup                                 */
/* ------------------------------------------------------------------ */
let authPopup: Window | null = null
let popupMonitor: ReturnType<typeof setInterval> | null = null

/** Intercepts window.open to capture the popup reference. */
const originalOpen = window.open.bind(window)
window.open = function (...args: Parameters<typeof window.open>): ReturnType<typeof window.open> {
  const popup = originalOpen(...args)
  if (popup && typeof popup === 'object') {
    authPopup = popup
  }
  return popup
} as typeof window.open

/* ------------------------------------------------------------------ */
/* Configuración (Vite env)                                            */
/* ------------------------------------------------------------------ */

const env = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** true solo si hay credenciales reales en el .env. */
export const isFirebaseConfigured = Boolean(env.apiKey && env.authDomain && env.projectId)

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export type AuthUser = {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}

type AuthState = {
  /** true cuando Firebase ya resolvió la sesión inicial (o no hay config). */
  ready: boolean
  /** true si el .env tiene credenciales de Firebase. */
  configured: boolean
  /** popup de Google en curso. */
  loading: boolean
  /** usuario con sesión (null = visitante). */
  user: AuthUser | null
  /** último código de error (AUTH_ERRORS) para pintar mensajes en la UI. */
  error: string
}

export const AUTH_ERRORS = Object.freeze({
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  POPUP_CLOSED: 'POPUP_CLOSED',
  POPUP_BLOCKED: 'POPUP_BLOCKED',
  UNAUTHORIZED_DOMAIN: 'UNAUTHORIZED_DOMAIN',
  NETWORK: 'NETWORK',
  UNKNOWN: 'UNKNOWN',
})

export const auth = writable<AuthState>({
  ready: false,
  configured: isFirebaseConfigured,
  loading: false,
  user: null,
  error: '',
})

/* ------------------------------------------------------------------ */
/* Inicialización                                                      */
/* ------------------------------------------------------------------ */

let firebaseAuth: ReturnType<typeof getAuth> | null = null
let initialized = false

/** Llamar UNA vez al montar la app. Restaura la sesión previa si existe. */
export async function initAuth() {
  if (initialized) return
  initialized = true

  // Sin credenciales: la app sigue siendo una landing funcional,
  // pero el botón de Google avisará que falta configuración.
  if (!isFirebaseConfigured) {
    auth.update((s) => ({ ...s, ready: true }))
    return
  }

  try {
    const app = initializeApp(env)
    firebaseAuth = getAuth(app)
    await setPersistence(firebaseAuth, browserLocalPersistence)

    onAuthStateChanged(
      firebaseAuth,
      (fbUser) => {
        auth.update((s) => ({
          ...s,
          ready: true,
          user: fbUser
            ? {
                uid: fbUser.uid,
                displayName: fbUser.displayName,
                email: fbUser.email,
                photoURL: fbUser.photoURL,
              }
            : null,
          error: '',
        }))
      },
      (err) => {
        console.error('[aletheia] onAuthStateChanged:', err)
        auth.update((s) => ({ ...s, ready: true, error: AUTH_ERRORS.UNKNOWN }))
      },
    )
  } catch (err) {
    console.error('[aletheia] initAuth:', err)
    auth.update((s) => ({ ...s, ready: true, error: AUTH_ERRORS.UNKNOWN }))
  }
}

/* ------------------------------------------------------------------ */
/* Acciones                                                            */
/* ------------------------------------------------------------------ */

/**
 * Abre el popup de Google (Firebase Auth) y devuelve el usuario.
 * Detecta el cierre del popup en <100ms para feedback inmediato.
 */
export async function signInWithGoogle() {
  if (!firebaseAuth) {
    auth.update((s) => ({ ...s, error: AUTH_ERRORS.NOT_CONFIGURED }))
    const error = new Error('Firebase no está configurado.')
    error.code = AUTH_ERRORS.NOT_CONFIGURED
    throw error
  }

  auth.update((s) => ({ ...s, loading: true, error: '' }))

  // Limpiar monitor anterior si existe
  cleanupPopupMonitor()

  try {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    // Iniciar el popup y monitorearlo en paralelo
    const signInPromise = signInWithPopup(firebaseAuth, provider)

    // Monitorear cierre del popup cada 100ms (detecta en <100ms)
    const popupClosedPromise = new Promise<never>((_, reject) => {
      popupMonitor = setInterval(() => {
        if (authPopup && authPopup.closed) {
          cleanupPopupMonitor()
          const code = AUTH_ERRORS.POPUP_CLOSED
          auth.update((s) => ({ ...s, loading: false, error: code }))
          // Solo toast, sin error inline (el modal ya lo muestra)
          const error = new Error(googleErrorText(code))
          error.code = code
          reject(error)
        }
      }, 100)

      // Timeout de seguridad (60s)
      setTimeout(() => {
        if (authPopup && !authPopup.closed) {
          cleanupPopupMonitor()
          const code = AUTH_ERRORS.POPUP_CLOSED
          auth.update((s) => ({ ...s, loading: false, error: code }))
          const error = new Error('Tiempo de espera agotado')
          error.code = code
          reject(error)
        }
      }, 60000)
    })

    // Carrera entre Firebase y nuestro detector de cierre
    const cred = await Promise.race([signInPromise, popupClosedPromise])
    cleanupPopupMonitor()
    return cred.user
  } catch (err: any) {
    cleanupPopupMonitor()
    // Si el error ya fue manejado por el monitor (POPUP_CLOSED),
    // el store ya tiene el error y el modal lo muestra — no duplicar.
    if (err.code && err.code !== AUTH_ERRORS.UNKNOWN) {
      throw err
    }
    // Para errores nuevos de Firebase, mapear y guardar en store.
    // El modal lee auth.error y lo muestra inline — no hacemos toast.
    const code = mapAuthError(err)
    auth.update((s) => ({ ...s, error: code }))
    const error = new Error(googleErrorText(code))
    error.code = code
    throw error
  } finally {
    auth.update((s) => ({ ...s, loading: false }))
  }
}

function cleanupPopupMonitor() {
  if (popupMonitor) {
    clearInterval(popupMonitor)
    popupMonitor = null
  }
  authPopup = null
}

/** Cierra la sesión de Google (la wallet se desconecta aparte). */
export async function signOutGoogle() {
  if (!firebaseAuth) return
  try {
    await signOut(firebaseAuth)
    auth.update((s) => ({ ...s, user: null, error: '' }))
  } catch (err) {
    console.error('[aletheia] signOutGoogle:', err)
    auth.update((s) => ({ ...s, error: AUTH_ERRORS.UNKNOWN }))
  }
}

/** Devuelve el ID token de Firebase actual (para la API de Aletheia) o null. */
export async function getIdToken(): Promise<string | null> {
  if (!firebaseAuth?.currentUser) return null
  return firebaseAuth.currentUser.getIdToken()
}

/* ------------------------------------------------------------------ */
/* Errores → notificación bonita (toast) en vez de texto rojo          */
/* ------------------------------------------------------------------ */

/**
 * Muestra el toast adecuado según el código:
 *  - Cancelaciones del usuario (cerró la ventana) → warning ámbar suave.
 *  - Fallos reales (red, dominio, config) → error.
 */
function notifyAuthError(code: string) {
  if (code === AUTH_ERRORS.POPUP_CLOSED) {
    pushToast(
      'warning',
      googleErrorTitle(code),
      'Cerraste la ventana de Google. Cuando quieras, inténtalo de nuevo — tus datos están a salvo.',
    )
    return
  }
  pushToast('error', googleErrorTitle(code), googleErrorText(code))
}

/* ------------------------------------------------------------------ */
/* Errores → texto humano (es)                                         */
/* ------------------------------------------------------------------ */

function mapAuthError(err: any): string {
  const code = String(err?.code ?? '')
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  ) {
    return AUTH_ERRORS.POPUP_CLOSED
  }
  if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
    return AUTH_ERRORS.POPUP_BLOCKED
  }
  if (code === 'auth/unauthorized-domain') return AUTH_ERRORS.UNAUTHORIZED_DOMAIN
  if (code === 'auth/network-request-failed') return AUTH_ERRORS.NETWORK
  return AUTH_ERRORS.UNKNOWN
}

/** Mensaje corto (título del toast) según código de error. */
export function googleErrorTitle(code: string): string {
  switch (code) {
    case AUTH_ERRORS.POPUP_CLOSED:
      return 'Inicio de sesión cancelado'
    case AUTH_ERRORS.POPUP_BLOCKED:
      return 'Ventana bloqueada'
    case AUTH_ERRORS.UNAUTHORIZED_DOMAIN:
      return 'Dominio no autorizado'
    case AUTH_ERRORS.NETWORK:
      return 'Sin conexión con Google'
    case AUTH_ERRORS.NOT_CONFIGURED:
      return 'Falta configuración'
    default:
      return 'No se pudo iniciar sesión'
  }
}

/** Mensaje en español según código de error (para role="alert"). */
export function googleErrorText(code: string): string {
  switch (code) {
    case AUTH_ERRORS.NOT_CONFIGURED:
      return 'Firebase no está configurado: falta el archivo .env con las credenciales.'
    case AUTH_ERRORS.POPUP_CLOSED:
      return 'Cerraste la ventana de Google antes de terminar.'
    case AUTH_ERRORS.POPUP_BLOCKED:
      return 'El navegador bloqueó la ventana de Google. Permite popups e inténtalo de nuevo.'
    case AUTH_ERRORS.UNAUTHORIZED_DOMAIN:
      return 'Este dominio no está autorizado en Firebase (Authentication → Settings → Authorized domains).'
    case AUTH_ERRORS.NETWORK:
      return 'Problema de red al contactar a Google. Revisa tu conexión.'
    default:
      return 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.'
  }
}
