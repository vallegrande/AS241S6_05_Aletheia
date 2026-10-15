/**
 * scene.ts — motor de escenas de Aletheia (GSAP + ScrollTrigger).
 *
 * La landing no es una pila de secciones: es una PILA DE ESCENAS.
 * Cada escena vive dentro de un wrapper de altura (1 + length) × 100vh con
 * su escenario (`.scene-stage`) clavado arriba. Eso divide su vida en dos
 * fases exactamente alineadas con la siguiente escena:
 *
 *   fase A — "fijada":  scroll ∈ [inicio, inicio + length·vh]
 *            el escenario está clavado y su CONTENIDO se transforma.
 *   fase B — "cubierta": scroll ∈ [inicio + length·vh, inicio + (1+length)·vh]
 *            la escena siguiente sube desde abajo y la cubre: aquí corre la
 *            TRANSICIÓN (la escena sale a un plano más lejano).
 *
 * `sceneProgress()` devuelve 0→1 de la fase A. `initSceneStack()` (stack.ts)
 * coordina la fase B de TODAS las escenas desde un único sitio.
 *
 * Modo cine (= escenas fijadas): desktop + puntero real + movimiento
 * permitido. En cualquier otro caso no se registra nada y cada escena cae en
 * el modo flujo (apilada, con reveals), definido con las mismas queries en
 * CSS.
 */
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }

/** Misma query que `@media` en base.css: si cambia aquí, cambia allí. */
export const CINEMA_QUERY = '(min-width: 901px) and (hover: hover) and (prefers-reduced-motion: no-preference)'

export function isCinema(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(CINEMA_QUERY).matches
}

/**
 * Ejecuta una coreografía SOLO en modo cine y la limpia al desmontar.
 * Recibe el escenario (donde vive el contenido) y su escena (el wrapper,
 * que es el gatillo natural de scroll).
 */
export function sceneMotion(
  node: Element,
  fn: (o: { stage: HTMLElement; scene: HTMLElement }) => void | (() => void),
): () => void {
  if (typeof window === 'undefined') return () => {}
  const mm = gsap.matchMedia()
  mm.add(CINEMA_QUERY, () => {
    const scene = node.closest('.scene') as HTMLElement | null
    const stage = node.closest('.scene-stage') as HTMLElement | null
    if (!scene || !stage) return
    return fn({ stage, scene })
  })
  return () => mm.revert()
}

/**
 * Progreso 0→1 de la fase A (la escena clavada) de una escena.
 * 0 = acaba de ocupar la pantalla · 1 = empieza a ser cubierta.
 */
export function sceneProgress(scene: HTMLElement, onUpdate: (p: number) => void) {
  return ScrollTrigger.create({
    trigger: scene,
    start: 'top top',
    end: 'bottom bottom',
    invalidateOnRefresh: true,
    onUpdate: (self) => onUpdate(self.progress),
    onRefresh: (self) => onUpdate(self.progress),
  })
}

/** Índice discreto de paso (0…n-1) dentro de un progreso. */
export function stepOf(p: number, n: number): number {
  return Math.max(0, Math.min(n - 1, Math.floor(p * n)))
}
