<script>
  /**
   * GooButton — botón con efecto "goo" (liquid-gooey, libraries.dev).
   *
   * Reproduce el comportamiento del paquete React `Liquid`/`Liquid.Item`:
   * un blob de silicón líquido derrite dos formas al acercarse, mientras el
   * contenido (texto) permanece nítido FUERA del filtro.
   *
   * Variantes:
   *   (default)  → el blob reposa BAJO el botón y sube al fundirse en hover/press
   *   contained  → el blob vive DENTRO de la píldora (overflow hidden); reposa
   *                fuera por debajo y la liquidez sube al pasar el cursor.
   *
   * Estados: idle → hover (fuse) → pressed (stretch)
   *
   * Todo con un filtro SVG blur+contraste real, sin libs externas.
   */
  import GooSVG from './GooSVG.svelte'

  let {
    children,
    onclick = null,
    disabled = false,
    variant = 'primary', // 'primary' | 'ghost'
    type = 'button',
    title = '',
    ariaLabel = '',
    contained = false, // el goo queda recortado dentro del propio botón
  } = $props()

  const uid = `goo-${Math.random().toString(36).slice(2, 9)}`

  // objetivos del spring por estado: [y px, escala X, escala Y]
  // rest   (contained): blob fuera del borde inferior → la píldora queda sólida
  // hover  (contained): la liquidez sube y llena ~3/4 de la píldora
  // press  (contained): se estira y completa el relleno
  function targets() {
    if (contained) {
      if (pressed) return { y: 0, sx: 1.34, sy: 0.72 }
      if (hovering) return { y: 15, sx: 1.26, sy: 0.64 }
      return { y: 58, sx: 1.2, sy: 0.6 }
    }
    if (pressed) return { y: -2, sx: 1.28, sy: 1.28 * 0.72 }
    if (hovering) return { y: -6, sx: 1.08, sy: 1.08 * 0.72 }
    return { y: 14, sx: 0.6, sy: 0.6 * 0.72 }
  }

  let hovering = false
  let pressed = false

  // estado spring del blob ($state: cada frame de rAF repinta el transform)
  const rest = targets()
  let blobY = $state(rest.y)
  let blobSx = $state(rest.sx)
  let blobSy = $state(rest.sy)

  // física spring (interpolación bouncy tipo Liquid.Item transition="bouncy")
  let velY = 0
  let raf = null

  function tick() {
    const t = targets()

    const stiffness = pressed || hovering ? 320 : 170
    const damping = pressed || hovering ? 16 : 13

    const dy = blobY - t.y
    const accY = -stiffness * dy * 0.01 - damping * velY * 0.02
    velY += accY
    blobY += velY * 0.9
    blobSx += (t.sx - blobSx) * 0.18
    blobSy += (t.sy - blobSy) * 0.18

    // settling: cortar rAF cuando ya casi no se mueve
    if (
      Math.abs(velY) < 0.01 &&
      Math.abs(blobY - t.y) < 0.05 &&
      Math.abs(blobSx - t.sx) < 0.002 &&
      Math.abs(blobSy - t.sy) < 0.002
    ) {
      blobY = t.y
      blobSx = t.sx
      blobSy = t.sy
      velY = 0
      raf = null
      return
    }
    raf = requestAnimationFrame(tick)
  }

  function ensureRaf() {
    if (raf == null) raf = requestAnimationFrame(tick)
  }

  function enter() {
    hovering = true
    ensureRaf()
  }
  function leave() {
    hovering = false
    pressed = false
    ensureRaf()
  }
  function down() {
    pressed = true
    ensureRaf()
  }
  function up() {
    pressed = false
    ensureRaf()
  }

  $effect(() => {
    return () => {
      if (raf != null) cancelAnimationFrame(raf)
    }
  })

  // contained: el 0 del eje Y es el centro del botón (compensa top:50% del blob)
  const blobTransform = $derived(
    contained
      ? `translate(-50%, calc(-50% + ${blobY}px)) scale(${blobSx}, ${blobSy})`
      : `translate(-50%, ${blobY}px) scale(${blobSx}, ${blobSy})`,
  )
  const blobAltTransform = $derived(`translate(-160%, ${blobY * 1.6}px) scale(${blobSx * 0.42})`)
</script>

<button
  {type}
  {disabled}
  {title}
  aria-label={ariaLabel || title}
  class="goo-btn {variant}"
  class:contained
  onpointerenter={enter}
  onpointerleave={leave}
  onpointerdown={down}
  onpointerup={up}
  onpointercancel={up}
  {onclick}
>
  <span class="goo-layer" aria-hidden="true" style="filter: url(#{uid})">
    <!-- blob principal: se funde con el botón al hacer hover/press -->
    <span class="blob" style="transform: {blobTransform}"></span>
    <span class="blob blob-alt" style="transform: {blobAltTransform}"></span>
  </span>
  <span class="content">{@render children?.()}</span>
</button>

<GooSVG id={uid} blur={5} contrast={19} fill="currentColor" />

<style>
  .goo-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 30px;
    border: 1px solid rgba(167, 139, 250, 0.35);
    border-radius: 999px;
    background: transparent;
    color: var(--purple-300);
    font-family: var(--font-display);
    font-size: 0.98rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    overflow: visible;
    -webkit-tap-highlight-color: transparent;
    transition: color 0.25s ease, border-color 0.25s ease;
  }

  .goo-btn:disabled {
    background: rgba(167, 139, 253, 0.1);
    border-color: rgba(167, 139, 253, 0.32);
    color: rgba(148, 163, 184, 0.72);
    cursor: not-allowed;
  }

  .goo-btn:disabled .goo-layer {
    display: none;
  }

  /* capa goo: encima del fondo, debajo del contenido */
  .goo-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    color: var(--purple-600);
  }

  .goo-btn.primary {
    color: var(--white);
    border-color: transparent;
  }

  .goo-btn.primary:hover:not(:disabled) {
    border-color: rgba(196, 181, 253, 0.3);
  }

  .goo-btn.primary .goo-layer {
    color: var(--purple-600);
  }

  .goo-btn.ghost {
    border: 1px solid rgba(167, 139, 250, 0.28);
  }

  .goo-btn.ghost .goo-layer {
    color: rgba(124, 58, 237, 0.35);
  }

  .blob {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 86%;
    height: 190%;
    border-radius: 999px;
    background: currentColor;
    z-index: 0;
  }

  .blob-alt {
    width: 40%;
    height: 120%;
  }

  .content {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  /* variante contained: la píldora es sólida y el goo nunca se sale de ella */
  .goo-btn.contained {
    overflow: hidden;
  }

  .goo-btn.contained .blob-alt {
    display: none;
  }

  .goo-btn.contained .goo-layer {
    color: var(--purple-500);
  }

  .goo-btn.contained:not(:disabled) {
    background: var(--purple-600);
  }

  .goo-btn.contained:hover:not(:disabled) {
    border-color: transparent;
  }
</style>
