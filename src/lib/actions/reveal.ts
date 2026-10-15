/**
 * reveal.ts — acción de Svelte: reveal-on-scroll elegante y con variantes.
 *
 * Fade + translateY con IntersectionObserver. Respeta prefers-reduced-motion.
 * La clase .is-visible activa la transición; el CSS de cada variante vive en
 * base.css (reveal-target, reveal-mask, reveal-word…).
 *
 * Opciones:
 *   use:reveal()                        → dirección aleatoria (up/down/left/right)
 *   use:reveal({ variant: 'up' })       → sube desde abajo
 *   use:reveal({ variant: 'down' })     → baja desde arriba
 *   use:reveal({ variant: 'left' })     → desliza desde la izquierda
 *   use:reveal({ variant: 'right' })    → desliza desde la derecha
 *   use:reveal({ variant: 'mask' })     → máscara editorial: el texto sube
 *                                          recortado dentro de su caja
 *   use:reveal({ variant: 'blur' })     → aparece desenfocado y se enfoca
 *   use:reveal({ variant: 'scale' })    → des-escala desde 0.94
 *   use:reveal({ variant: 'none' })     → solo fade puro
 *   delay: ms antes de disparar · once: si se revela una sola vez
 *
 * NOTA sobre variant='mask': el nodo debe tener overflow oculto por CSS
 * (.reveal-mask ya lo aplica). El elemento interior sube desde abajo.
 *
 * Cuando no se especifica variant, se elige aleatoriamente entre
 * 'up', 'down', 'left' y 'right' para que cada sección entre de un lado distinto.
 */
import { isCinema } from '../scroll/scene'

type RevealVariant = 'up' | 'down' | 'left' | 'right' | 'mask' | 'blur' | 'scale' | 'none'

/** Variantes direccionales que se asignan aleatoriamente cuando no se especifica ninguna. */
const RANDOM_VARIANTS: RevealVariant[] = ['up', 'down', 'left', 'right']

type RevealOptions = {
  threshold?: number
  once?: boolean
  delay?: number
  variant?: RevealVariant
}

export function reveal(node: HTMLElement, options: RevealOptions = {}) {
  const {
    threshold = 0.15,
    once = true,
    delay = 0,
    // Si no se pasa variant, elegir aleatoriamente entre las 4 direcciones.
    variant = RANDOM_VARIANTS[Math.floor(Math.random() * RANDOM_VARIANTS.length)],
  } = options

  if (typeof window === 'undefined') return

  /* MODO CINE: la escena está fijada y su coreografía la mueve GSAP.
     El reveal por tiempo/intersección entraría en conflicto (o dejaría el
     contenido invisible hasta que el usuario llegara), así que aquí no se
     registra NADA: el contenido nace visible y GSAP es el dueño. */
  if (isCinema()) return

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReduced || !('IntersectionObserver' in window)) {
    node.classList.add('is-visible')
    return
  }

  if (variant === 'mask') {
    node.classList.add('reveal-mask')
  } else if (variant !== 'none') {
    node.classList.add('reveal-target')
  }
  if (variant === 'left') node.classList.add('rv-left')
  if (variant === 'right') node.classList.add('rv-right')
  if (variant === 'down') node.classList.add('rv-down')
  if (variant === 'blur') node.classList.add('rv-blur')
  if (variant === 'scale') node.classList.add('rv-scale')
  if (delay) node.style.transitionDelay = `${delay}ms`

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          node.classList.add('is-visible')
          if (once) observer.unobserve(node)
        } else if (!once) {
          node.classList.remove('is-visible')
        }
      }
    },
    { threshold },
  )

  observer.observe(node)

  return {
    destroy() {
      observer.disconnect()
    },
  }
}
