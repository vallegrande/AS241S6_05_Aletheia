/**
 * stack.ts — latitud de la PILA DE ESCENAS.
 *
 * La coreografía entre escenas (lámina entrante con muelle + filo de luz)
 * vive en `cover.ts`. Aquí solo se mantiene ScrollTrigger sincronizado con
 * el layout asíncrono (fuentes, imágenes): las secciones registran
 * ScrollTriggers propios (sceneProgress/sceneMotion) y necesitan un
 * refresh cuando el documento termina de estabilizar sus alturas.
 *
 * NOTA DE DISEÑO: la escena CUBIERTA no se transforma (sin scale/deriva/
 * velado). Cualquier encogimiento de su rect expone bordes del fondo tras
 * ella y rompe la regla editorial: la lámina entrante tapa TODO.
 */
import { ScrollTrigger } from './scene'

export function initSceneStack(root: HTMLElement): () => void {
  const refresh = () => ScrollTrigger.refresh()
  const raf = requestAnimationFrame(refresh)
  const delayedRefresh = setTimeout(refresh, 900)
  window.addEventListener('load', refresh)
  if (document.fonts?.ready) document.fonts.ready.then(refresh).catch(() => {})
  void root

  return () => {
    cancelAnimationFrame(raf)
    clearTimeout(delayedRefresh)
    window.removeEventListener('load', refresh)
  }
}
