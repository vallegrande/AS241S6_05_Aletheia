/**
 * cover.ts — TRANSICIONES MULTI-DIRECCIONALES DE LA PILA DE ESCENAS:
 *
 * Cada transición entre escenas j−1 → j tiene su propia dirección de
 * entrada (DERECHA, IZQUIERDA, ABAJO, etc.) definida por el atributo
 * `data-from` de la escena o por la secuencia alterna predeterminada.
 *
 * La escena ANTERIOR queda fijada (sticky) y la lámina de la escena
 * SIGUIENTE entra cubriéndola desde su lado correspondiente con física
 * de muelle suave y filo de luz dinámico.
 */
import { isCinema } from './scene'

const SPRING = {
  stiffness: 118, // 1/s² — rigidez del muelle
  damping: 20, // 1/s — fricción subcrítica suave
  mass: 1,
  snap: 0.5, // px: cierre directo
  cutoffV: 60, // px/s: velocidad umbral
}

const DEFAULT_DIRECTIONS = ['right', 'left', 'bottom', 'right', 'left', 'bottom', 'right']

export function initCovers(): () => void {
  if (!isCinema()) return () => {}

  type Spring = { p: number; v: number; own: string }
  let springs: Spring[] = []
  let raf = 0
  let last = 0

  function paint(
    sp: Spring,
    stage: HTMLElement,
    edge: HTMLElement | null,
    stageTop: number,
    target: number,
    vh: number,
    direction: string,
  ) {
    const progress = Math.max(0, Math.min(1, sp.p / vh))
    const isSettled = Math.abs(vh - sp.p) < 1.5 && stageTop <= 0

    if (isSettled) {
      stage.style.clipPath = ''
      stage.style.transform = ''
      sp.own = ''
      if (edge) edge.style.opacity = '0'
      return
    }

    if (sp.p < 0.5 || stageTop >= vh - 2) {
      stage.style.clipPath = 'inset(100% 0 0 0)'
      stage.style.transform = ''
      sp.own = ''
      if (edge) edge.style.opacity = '0'
      return
    }

    let nextTransform = ''
    let nextClip = ''

    // Mantener el stage fijado en el viewport (compensando stageTop) mientras se revela
    const yCounter = (-Math.max(0, stageTop)).toFixed(2)

    if (direction === 'right') {
      // Entra como cortina desde la DERECHA hacia la izquierda
      const clipLeft = ((1 - progress) * 100).toFixed(2)
      nextClip = `inset(0 0 0 ${clipLeft}%)`
      nextTransform = `translate3d(0, ${yCounter}px, 0)`

      if (edge) {
        edge.style.top = '0'
        edge.style.bottom = '0'
        edge.style.left = `${clipLeft}%`
        edge.style.right = 'auto'
        edge.style.width = '2px'
        edge.style.height = '100%'
        edge.style.background =
          'linear-gradient(180deg, rgba(196,181,253,0) 0%, rgba(196,181,253,0.9) 15%, rgba(240,236,255,0.98) 50%, rgba(196,181,253,0.9) 85%, rgba(196,181,253,0) 100%)'
        edge.style.boxShadow =
          '0 0 16px 2px rgba(167,139,250,0.6), -4px 0 24px 2px rgba(139,92,246,0.35)'
      }
    } else if (direction === 'left') {
      // Entra como cortina desde la IZQUIERDA hacia la derecha
      const clipRight = ((1 - progress) * 100).toFixed(2)
      nextClip = `inset(0 ${clipRight}% 0 0)`
      nextTransform = `translate3d(0, ${yCounter}px, 0)`

      if (edge) {
        edge.style.top = '0'
        edge.style.bottom = '0'
        edge.style.left = `${(progress * 100).toFixed(2)}%`
        edge.style.right = 'auto'
        edge.style.width = '2px'
        edge.style.height = '100%'
        edge.style.background =
          'linear-gradient(180deg, rgba(196,181,253,0) 0%, rgba(196,181,253,0.9) 15%, rgba(240,236,255,0.98) 50%, rgba(196,181,253,0.9) 85%, rgba(196,181,253,0) 100%)'
        edge.style.boxShadow =
          '0 0 16px 2px rgba(167,139,250,0.6), 4px 0 24px 2px rgba(139,92,246,0.35)'
      }
    } else {
      // Entra desde ABAJO (bottom) con física de muelle elástica
      const visible = Math.max(0, stageTop)
      const N = Math.max(0, vh - sp.p - visible)
      nextClip = N > 0.25 ? `inset(${N.toFixed(2)}px 0 0 0)` : ''

      const over = Math.max(0, sp.p - target)
      nextTransform = over > 0.25 ? `translate3d(0, ${(-over).toFixed(2)}px, 0)` : ''

      if (edge) {
        edge.style.top = '0'
        edge.style.bottom = 'auto'
        edge.style.left = '0'
        edge.style.right = '0'
        edge.style.width = '100%'
        edge.style.height = '2px'
        edge.style.background =
          'linear-gradient(90deg, rgba(196, 181, 253, 0) 0%, rgba(196, 181, 253, 0.85) 14%, rgba(240, 236, 255, 0.95) 50%, rgba(196, 181, 253, 0.85) 86%, rgba(196, 181, 253, 0) 100%)'
        edge.style.boxShadow =
          '0 0 12px 1px rgba(167, 139, 250, 0.4), 0 4px 26px 2px rgba(139, 92, 246, 0.24)'
      }
    }

    stage.style.clipPath = nextClip
    if (nextTransform) {
      stage.style.transform = nextTransform
    } else if (sp.own && stage.style.transform === sp.own) {
      stage.style.transform = ''
    }
    sp.own = nextTransform

    if (edge) {
      const edgeP = Math.max(0, Math.min(1, (sp.v - 80) / 440))
      const activePulse = progress > 0.05 && progress < 0.95 ? 0.65 : 0
      edge.style.opacity = Math.max(activePulse, edgeP * 0.9).toFixed(3)
    }
  }

  function step(now: number) {
    raf = 0
    if (!last) last = now
    const dt = Math.min((now - last) / 1000, 0.032)
    last = now

    const vh = window.innerHeight
    const scenes = document.querySelectorAll<HTMLElement>('main > .scene')
    const n = scenes.length - 1
    if (n <= 0) return
    if (springs.length !== n) {
      springs = Array.from({ length: n }, () => ({ p: 0, v: 0, own: '' }))
    }

    let moving = false
    for (let k = 0; k < n; k++) {
      const incoming = scenes[k + 1]
      const stage = incoming.querySelector<HTMLElement>(':scope > .scene-stage')
      if (!stage) continue
      const edge = incoming.querySelector<HTMLElement>(':scope > .scene-stage > .scene-edge')
      const sp = springs[k]

      // Usar la posición del wrapper .scene (en flujo normal, sin transform)
      // para evitar que el transform del stage altere la medición.
      const incomingTop = incoming.getBoundingClientRect().top
      const target = Math.max(0, Math.min(vh - incomingTop, vh))

      const isLargeJump = Math.abs(target - sp.p) > vh * 0.35
      const isOffscreenBelow = incomingTop >= vh - 2
      const isFullyCovered = incomingTop <= 0

      if (isLargeJump || isOffscreenBelow || isFullyCovered) {
        sp.p = target
        sp.v = 0
      } else {
        const a = (SPRING.stiffness * (target - sp.p) - SPRING.damping * sp.v) / SPRING.mass
        sp.v += a * dt
        sp.p += sp.v * dt

        if (!Number.isFinite(sp.p) || !Number.isFinite(sp.v)) {
          sp.p = target
          sp.v = 0
        }
      }

      const atRest = Math.abs(target - sp.p) < SPRING.snap && Math.abs(sp.v) < SPRING.cutoffV
      if (atRest) {
        sp.p = target
        sp.v = 0
      } else {
        moving = true
      }

      const dir =
        incoming.dataset.from || DEFAULT_DIRECTIONS[k % DEFAULT_DIRECTIONS.length] || 'bottom'

      paint(sp, stage, edge, incomingTop, target, vh, dir)
    }

    if (moving) {
      raf = requestAnimationFrame(step)
    } else {
      last = 0
    }
  }

  function wake() {
    if (!raf) {
      last = 0
      raf = requestAnimationFrame(step)
    }
  }

  window.addEventListener('scroll', wake, { passive: true })
  window.addEventListener('resize', wake)
  window.addEventListener('hashchange', wake)

  return () => {
    window.removeEventListener('scroll', wake)
    window.removeEventListener('resize', wake)
    window.removeEventListener('hashchange', wake)
    if (raf) cancelAnimationFrame(raf)

    for (const stage of document.querySelectorAll<HTMLElement>('main > .scene > .scene-stage')) {
      stage.style.clipPath = ''
      stage.style.transform = ''
      const edge = stage.querySelector<HTMLElement>(':scope > .scene-edge')
      if (edge) edge.style.opacity = ''
    }
    springs = []
    raf = 0
    last = 0
  }
}
