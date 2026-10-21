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
  GithubAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  getAdditionalUserInfo,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  reauthenticateWithPopup,
  setPersistence,
  signInWithPopup,
  signOut,
  unlink,
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

/* ------------------------------------------------------------------ */
/* GitHub (vinculado DESPUÉS del login con Google; nunca como login)   */
/* ------------------------------------------------------------------ */

export type GithubLink = { username: string; accessToken: string | null }

/**
 * Vincula la cuenta de GitHub a la sesión actual de Google (linkWithPopup,
 * NO signInWithPopup — así no hay conflicto de cuentas) y devuelve su
 * usuario + token de acceso para traer repositorios.
 */
export async function linkGithubAccount(): Promise<GithubLink> {
  if (!firebaseAuth?.currentUser) {
    throw Object.assign(new Error('Inicia sesión con Google para conectar GitHub.'), {
      code: AUTH_ERRORS.NOT_CONFIGURED,
    })
  }
  const provider = new GithubAuthProvider()
  const ghToken = (c: unknown): string | null => {
    const t = (c as { credential?: { accessToken?: string } | null } | null)?.credential?.accessToken
    return t ?? null
  }
  /** Usuario de GitHub: del AdditionalUserInfo o, si falta, de la API. */
  const finish = async (cred: Parameters<typeof getAdditionalUserInfo>[0]): Promise<GithubLink> => {
    const info = getAdditionalUserInfo(cred)
    const accessToken = ghToken(cred)
    let username = info?.username ?? ''
    if (!username && accessToken) {
      try {
        const r = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        })
        if (r.ok) username = String((await r.json())?.login ?? '')
      } catch {
        /* sin usuario: el campo queda libre para escribirlo a mano */
      }
    }
    return { username, accessToken }
  }
  try {
    const cred = await linkWithPopup(firebaseAuth.currentUser, provider)
    return await finish(cred)
  } catch (err: any) {
    const code = String(err?.code ?? '')
    if (code === 'auth/provider-already-linked') {
      // Ya vinculado a ESTA cuenta: reautenticamos (misma sesión, renueva el
      // token de GitHub). Nunca signInWithPopup: podría cambiar la sesión.
      try {
        const cred = await reauthenticateWithPopup(firebaseAuth.currentUser!, provider)
        return await finish(cred)
      } catch (e2: any) {
        const c2 = String(e2?.code ?? '')
        if (c2.includes('popup-closed') || c2.includes('cancelled-popup')) {
          throw Object.assign(new Error(githubErrorText(AUTH_ERRORS.POPUP_CLOSED)), {
            code: AUTH_ERRORS.POPUP_CLOSED,
          })
        }
        if (c2 === 'auth/popup-blocked') {
          throw Object.assign(new Error(githubErrorText(AUTH_ERRORS.POPUP_BLOCKED)), {
            code: AUTH_ERRORS.POPUP_BLOCKED,
          })
        }
        throw Object.assign(new Error(githubErrorText(mapAuthError(e2))), { code: mapAuthError(e2) })
      }
    }
    if (code === 'auth/credential-already-in-use') {
      /**
       * El GitHub quedó vinculado a otra cuenta de Aletheia (p. ej. una cuenta
       * de prueba creada antes). Solo quien controla ese GitHub puede repararlo:
       *   1) entra con GitHub (demuestra que la controla),
       *   2) se desvincula de esa cuenta vieja,
       *   3) vuelve a su sesión de Google original (login_hint) y verifica el uid,
       *   4) vincula el mismo credential a la cuenta actual.
       * Si la restauración falla, se cierra la sesión para no escribir datos en
       * la cuenta equivocada.
       */
      const origUid = firebaseAuth.currentUser!.uid
      const origEmail = firebaseAuth.currentUser!.email ?? ''
      let ghCred: Awaited<ReturnType<typeof signInWithPopup>> | null = null
      try {
        pushToast(
          'info',
          'Moviendo tu conexión de GitHub',
          'Entra con GitHub y luego vuelve con Google para vincularlo a esta cuenta.',
        )
        ghCred = await signInWithPopup(firebaseAuth, provider)
        const link = await finish(ghCred)
        await unlink(ghCred.user, 'github.com').catch(() => {})
        const google = new GoogleAuthProvider()
        if (origEmail) google.setCustomParameters({ login_hint: origEmail })
        const back = await signInWithPopup(firebaseAuth, google)
        if (back.user.uid !== origUid) throw Object.assign(new Error('uid'), { code: 'github/session-changed' })
        const ghCredential =
          (ghCred as { credential?: Parameters<typeof linkWithCredential>[1] | null }).credential ?? null
        if (ghCredential) await linkWithCredential(back.user, ghCredential).catch(() => {})
        return link
      } catch (e2: any) {
        const c2 = String(e2?.code ?? '')
        // ¿quedamos en la cuenta vieja? cerramos sesión: nada se guarda ahí
        if (firebaseAuth.currentUser && firebaseAuth.currentUser.uid !== origUid) {
          await signOutGoogle()
        }
        if (c2 === 'github/session-changed') {
          throw Object.assign(
            new Error('La sesión cambió de cuenta. Vuelve a iniciar sesión con Google.'),
            { code: c2 },
          )
        }
        if (c2.includes('popup-closed') || c2.includes('cancelled-popup')) {
          throw Object.assign(new Error(githubErrorText(AUTH_ERRORS.POPUP_CLOSED)), {
            code: AUTH_ERRORS.POPUP_CLOSED,
          })
        }
        if (c2 === 'auth/popup-blocked') {
          throw Object.assign(new Error(githubErrorText(AUTH_ERRORS.POPUP_BLOCKED)), {
            code: AUTH_ERRORS.POPUP_BLOCKED,
          })
        }
        throw Object.assign(
          new Error('No pudimos mover la conexión de GitHub. Vuelve a iniciar sesión con Google.'),
          { code: c2 || 'github/move-failed' },
        )
      }
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw Object.assign(new Error(githubErrorText(AUTH_ERRORS.POPUP_CLOSED)), {
        code: AUTH_ERRORS.POPUP_CLOSED,
      })
    }
    if (code === 'auth/popup-blocked') {
      throw Object.assign(new Error(githubErrorText(AUTH_ERRORS.POPUP_BLOCKED)), {
        code: AUTH_ERRORS.POPUP_BLOCKED,
      })
    }
    throw Object.assign(new Error(githubErrorText(mapAuthError(err))), { code: mapAuthError(err) })
  }
}

/**
 * Desvincula GitHub de la cuenta actual (Firebase). El backend se limpia aparte
 * con `disconnectGithub()` de api/client.
 */
export async function unlinkGithubAccount(): Promise<void> {
  const user = firebaseAuth?.currentUser
  if (!user) return
  await unlink(user, 'github.com')
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

/** Mensajes equivalentes para el login con GitHub. */
export function githubErrorText(code: string): string {
  switch (code) {
    case AUTH_ERRORS.NOT_CONFIGURED:
      return 'Firebase no está configurado: falta el archivo .env con las credenciales.'
    case AUTH_ERRORS.POPUP_CLOSED:
      return 'Cerraste la ventana de GitHub antes de terminar.'
    case AUTH_ERRORS.POPUP_BLOCKED:
      return 'El navegador bloqueó la ventana de GitHub. Permite popups e inténtalo de nuevo.'
    case AUTH_ERRORS.UNAUTHORIZED_DOMAIN:
      return 'Este dominio no está autorizado en Firebase (Authentication → Settings → Authorized domains).'
    case AUTH_ERRORS.NETWORK:
      return 'Problema de red al contactar con GitHub. Revisa tu conexión.'
    default:
      return 'No se pudo iniciar sesión con GitHub. Inténtalo de nuevo.'
  }
}
