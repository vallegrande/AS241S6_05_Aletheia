/**
 * scrollfx.ts — motor de efectos ligados al scroll (parallax, deriva, escala).
 *
 * Una sola acción para toda la landing. Cada elemento opta in con
 * data-atributos:
 *
 *   use:scrollfx={{ scroll: 0.18 }}          → deriva vertical con el scroll
 *   use:scrollfx={{ scrollX: 0.1 }}          → deriva horizontal
 *   use:scrollfx={{ scale: 0.08 }}           → escala sutil (zoom de fondo)
 *   use:scrollfx={{ rotate: 2.5 }}           → inclinación en grados
 *   use:scrollfx={{ parallax: 3 }}           → factor global de profundidad
 *
 * La transformación es progresiva: -1 (el elemento entra por abajo) →
 * 0 (centrado) → 1 (sale por arriba), normalizado sobre el viewport, así el
 * efecto es idéntico en cualquier altura de sección. Todo va en rAF con
 * IntersectionObserver (fuera de pantalla = cero trabajo) y respeta
 * prefers-reduced-motion (no-op total).
 */
export type ScrollFxOptions = {
  scroll?: number
  scrollX?: number
  scale?: number
  rotate?: number
  blur?: number
  parallax?: number
}

export function scrollfx(node: HTMLElement, options: ScrollFxOptions = {}) {
  if (typeof window === 'undefined') return

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) return

  let opts: ScrollFxOptions = { ...options }
  let raf = 0
  let visible = true
  let sy = 0

  const depth = (opts.parallax ?? 1) || 1

  function update() {
    raf = 0
    const vh = window.innerHeight
    const rect = node.getBoundingClientRect()
    // progreso del elemento respecto al viewport: 0 centrado, ±1 bordes
    const mid = rect.top + rect.height / 2
    const p = Math.max(-1.4, Math.min(1.4, (mid - vh / 2) / vh))
    const s = (opts.scroll ?? 0) * depth
    const sx = (opts.scrollX ?? 0) * depth
    const sc = (opts.scale ?? 0) * depth
    const rot = (opts.rotate ?? 0) * depth
    const bl = (opts.blur ?? 0) * depth

    const tx = sx * p * -100 // scrollX 0.1 ≈ ±10vw a los bordes
    const ty = s * p * -100 // scroll 0.18 ≈ ±18vh de deriva
    const scale = 1 + sc * Math.abs(p)
    const rotate = rot * p
    const filter = bl > 0 ? ` blur(${(Math.abs(p) * bl).toFixed(2)}px)` : ''

    node.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)${
      scale !== 1 ? ` scale(${scale.toFixed(4)})` : ''
    }${rotate ? ` rotate(${rotate.toFixed(2)}deg)` : ''}`
    if (filter) node.style.filter = filter
  }

  function schedule() {
    if (!visible || raf) return
    raf = requestAnimationFrame(update)
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting
      if (visible) schedule()
    },
    { rootMargin: '35% 0px' },
  )
  io.observe(node)

  const onScroll = () => {
    sy = window.scrollY
    schedule()
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })

  // primera pasada tras pintar (los layout aún pueden moverse al montar)
  requestAnimationFrame(schedule)

  return {
    update(next: ScrollFxOptions) {
      opts = { ...next }
      schedule()
    },
    destroy() {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    },
  }
}
