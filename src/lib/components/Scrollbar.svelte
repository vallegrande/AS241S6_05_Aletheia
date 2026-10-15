<script>
  /**
   * Scrollbar — indicador de scroll propio, SIN track nativo.
   *
   * La barra del sistema se oculta (base.css). Este thumb flota sobre el
   * GlobalBackground: sin fondo propio, detrás se ve siempre el mesh animado.
   *
   * Diseño: mínimo. Una barra fina con degradado ámbar, puntas redondeadas
   * y un halo suave. Se ensancha levemente al acercar el puntero (hover en
   * la franja) y vuelve al instante.
   */
  import { onMount } from 'svelte'

  let thumbY = $state(6)
  let thumbH = $state(24)
  let hover = $state(false)

  function update() {
    const doc = document.documentElement
    const max = doc.scrollHeight - window.innerHeight
    const total = doc.scrollHeight
    if (total <= 0) return
    const ratio = max > 0 ? window.scrollY / max : 0
    const usable = window.innerHeight - 72
    const height = Math.max(48, (window.innerHeight / total) * usable)
    const y = ratio * (usable - height)
    thumbH = height
    thumbY = y + 36
  }

  onMount(() => {
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  })
</script>

<div
  class="scro"
  aria-hidden="true"
  onpointerenter={() => (hover = true)}
  onpointerleave={() => (hover = false)}
>
  <div
    class="scro-thumb {hover ? 'is-hover' : ''}"
    style="height: {thumbH}px; transform: translateY({thumbY}px)"
  ></div>
</div>

<style>
  .scro {
    position: fixed;
    top: 0;
    right: 0;
    height: 100%;
    width: 16px;
    z-index: 900;
  }

  .scro-thumb {
    position: absolute;
    top: 0;
    right: 6px;
    width: 4px;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--amber-300), var(--amber-500));
    box-shadow: 0 0 14px rgba(251, 191, 36, 0.35);
    opacity: 0.75;
    will-change: transform, height;
    transition:
      width 0.2s ease,
      opacity 0.2s ease,
      box-shadow 0.2s ease;
  }

  .scro-thumb.is-hover {
    width: 6px;
    opacity: 1;
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
  }

  @media (max-width: 640px) {
    .scro {
      width: 10px;
    }

    .scro-thumb {
      right: 4px;
      width: 3px;
    }

    .scro-thumb.is-hover {
      width: 5px;
    }
  }
</style>