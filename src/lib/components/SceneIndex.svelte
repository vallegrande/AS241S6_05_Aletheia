<script>
  /**
   * SceneIndex — índice lateral de escenas (izquierda).
   *
   * Chrome fijo, no contenido: una línea vertical con las seis escenas del
   * recorrido. La parte recorrida de la línea queda encendida, el punto
   * activo se abre y muestra su número, y cada punto es un enlace a su
   * escena. Desaparece en pantallas estrechas (allí manda la nav superior).
   */
  import { onMount } from 'svelte'
  import { CHAPTERS } from '../scroll/chapters'

  let active = $state(0)
  let fillEl = $state(null)
  let railEl = $state(null)
  let rootEl = $state(null)

  onMount(() => {
    let raf = 0

    function update() {
      raf = 0
      const y = window.scrollY
      const vh = window.innerHeight
      const probe = y + vh * 0.4
      const scenes = document.querySelectorAll('.scene')

      let idx = 0
      scenes.forEach((sc, i) => {
        const top = sc.getBoundingClientRect().top + y
        if (top <= probe) idx = i
      })
      if (idx !== active) active = Math.min(idx, CHAPTERS.length - 1)

      const doc = document.documentElement
      const max = doc.scrollHeight - vh
      const ratio = max > 0 ? Math.max(0, Math.min(1, y / max)) : 0
      if (fillEl) fillEl.style.height = `${(ratio * 100).toFixed(2)}%`

      if (rootEl) rootEl.classList.toggle('is-on', y > vh * 0.55)
    }

    function schedule() {
      if (!raf) raf = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    update()

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (raf) cancelAnimationFrame(raf)
    }
  })
</script>

<nav class="sidx" bind:this={rootEl} aria-label="Escenas del recorrido">
  <div class="sidx-rail" bind:this={railEl}>
    <span class="sidx-line" aria-hidden="true"></span>
    <span class="sidx-line sidx-line-fill" bind:this={fillEl} aria-hidden="true"></span>

    {#each CHAPTERS as c, i (c.id)}
      <a class="sidx-dot" class:is-active={i === active} href={'#' + c.id} aria-label={c.label}>
        <span class="sidx-core" aria-hidden="true"></span>
        <span class="sidx-tag" aria-hidden="true">{c.num}</span>
      </a>
    {/each}
  </div>
</nav>

<style>
  .sidx {
    position: fixed;
    left: 26px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 60;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  :global(.sidx.is-on) {
    opacity: 1;
    pointer-events: auto;
  }

  .sidx-rail {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 168px;
    padding: 3px 0;
  }

  .sidx-line {
    position: absolute;
    left: 5px;
    top: 0;
    width: 1px;
    height: 100%;
    background: rgba(196, 181, 253, 0.16);
  }

  .sidx-line-fill {
    height: 0%;
    background: linear-gradient(180deg, var(--purple-400), var(--amber-400));
    box-shadow: 0 0 10px rgba(167, 139, 250, 0.55);
    transition: height 0.18s linear;
  }

  .sidx-dot {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 22px;
    padding-left: 0;
    text-decoration: none;
  }

  .sidx-core {
    position: relative;
    z-index: 1;
    display: block;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 1px solid rgba(196, 181, 253, 0.3);
    background: var(--black-950);
    transition:
      transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
      border-color 0.4s ease,
      background 0.4s ease,
      box-shadow 0.4s ease;
  }

  .sidx-dot:hover .sidx-core {
    border-color: rgba(196, 181, 253, 0.7);
  }

  .sidx-dot.is-active .sidx-core {
    transform: scale(1.35);
    border-color: var(--amber-300);
    background: var(--amber-400);
    box-shadow: 0 0 14px rgba(251, 191, 36, 0.55);
  }

  .sidx-tag {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    color: var(--gray-500);
    opacity: 0;
    transform: translateX(-6px);
    transition:
      opacity 0.4s ease,
      transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
      color 0.4s ease;
  }

  .sidx-dot.is-active .sidx-tag,
  .sidx-dot:hover .sidx-tag {
    opacity: 1;
    transform: translateX(0);
  }

  .sidx-dot.is-active .sidx-tag {
    color: var(--amber-200);
  }

  @media (max-width: 1359px), (prefers-reduced-motion: reduce) {
    .sidx {
      display: none;
    }
  }
</style>
