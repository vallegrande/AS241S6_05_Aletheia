/**
 * linkedin.ts — Conexión de LinkedIn (Sign In with LinkedIn / OIDC).
 *
 * El popup sale de la app → LinkedIn → nuestro backend canjea el code →
 * redirige a `/?li=ok|error` en el MISMO origen. Esa página (el popup) avisa
 * al opener con postMessage y se cierra sola. El opener además sondea el
 * estado por si el mensaje no llega.
 */
import { getLinkedinState, startLinkedinConnect, type LinkedinState } from './api/client'

/**
 * Lado del popup: si la URL trae `?li=...`, avisa al opener y cierra la
 * ventana. Debe llamarse antes de montar la app.
 */
export function handleLinkedinCallback(): boolean {
  const params = new URLSearchParams(window.location.search)
  const li = params.get('li')
  if (!li) return false
  params.delete('li')
  const qs = params.toString()
  const url = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash
  window.history.replaceState({}, '', url)
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'aletheia:linkedin', ok: li === 'ok' }, window.location.origin)
    }
  } catch {
    /* opener inaccesible: el polling del opener cubre este caso */
  }
  window.close()
  return true
}

/**
 * Abre el popup de LinkedIn y espera a que termine (mensaje o polling).
 * Devuelve el estado final de la conexión.
 */
export async function connectLinkedIn(): Promise<LinkedinState> {
  const before = await getLinkedinState().catch(() => null)
  const changed = (st: LinkedinState | null): st is LinkedinState =>
    Boolean(st?.connected && (!before?.connected || st.name !== before.name))

  const { url } = await startLinkedinConnect()
  const popup = window.open(url, 'aletheia-linkedin', 'width=640,height=740')
  if (!popup) {
    throw Object.assign(
      new Error('El navegador bloqueó la ventana de LinkedIn. Permite los popups e inténtalo de nuevo.'),
      { code: 'linkedin/popup-blocked' }
    )
  }
  popup.focus?.()

  return await new Promise<LinkedinState>((resolve, reject) => {
    let done = false
    let poll: ReturnType<typeof setInterval> | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      window.removeEventListener('message', onMessage)
      if (poll) clearInterval(poll)
      if (timer) clearTimeout(timer)
    }
    const ok = (st: LinkedinState) => {
      if (done) return
      done = true
      cleanup()
      resolve(st)
    }
    const fail = (msg: string) => {
      if (done) return
      done = true
      cleanup()
      reject(Object.assign(new Error(msg), { code: 'linkedin/failed' }))
    }

    const current = () => getLinkedinState().catch(() => null)

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      const data = e.data as { type?: string; ok?: boolean } | null
      if (data?.type !== 'aletheia:linkedin') return
      if (!data.ok) return fail('LinkedIn no completó la conexión.')
      current().then((st) => (st?.connected ? ok(st) : fail('LinkedIn no devolvió tus datos.')))
    }
    window.addEventListener('message', onMessage)

    poll = setInterval(async () => {
      if (popup.closed) {
        const st = await current()
        if (changed(st)) return ok(st)
        return fail('Cerraste la ventana de LinkedIn antes de terminar.')
      }
      const st = await current()
      if (changed(st)) ok(st)
    }, 2000)

    timer = setTimeout(() => fail('Tiempo de espera agotado con LinkedIn.'), 120000)
  })
}
