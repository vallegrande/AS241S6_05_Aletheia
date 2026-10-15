<script>
  /**
   * ProjectSection — ESCENA 02 · "Pipeline horizontal".
   *
   * Composición: la escena es un INSTRUMENTO HORIZONTAL.
   *   · Cabecera editorial compacta arriba-izquierda (título + un solo
   *     enunciado) y lectura de fase arriba-derecha.
   *   · Centro: la fase activa en tipografía abierta (tag · título ·
   *     detalle · métrica) contra un numeral fantasma gigante.
   *   · Pie: el riel del pipeline a todo el ancho. Un haz de luz lo
   *     recorre con el scroll y enciende la estación que está activa.
   *   · Cero tarjetas: solo filetes, tipos y luz.
   */
  import { onMount } from 'svelte'
  import { sceneMotion, gsap, sceneProgress, stepOf } from '../scroll/scene'

  const layers = [
    {
      num: '01',
      tag: 'INGESTA',
      title: 'Conexión de fuentes',
      desc: 'Enlaza tus repositorios de GitHub, certificaciones y plataformas freelance con un solo clic, sin exponer contraseñas.',
      pill: 'GitHub · Platzi · EVM',
      metric: '∞ Fuentes conectables',
      accent: 'cyan',
      color: '#22d3ee',
    },
    {
      num: '02',
      tag: 'ANÁLISIS',
      title: 'Motor de IA neural',
      desc: 'Modela y valida tu historial técnico extrayendo habilidades reales mediante análisis sintáctico y detección anti-fraude.',
      pill: 'Evaluación sin sesgos',
      metric: '99.4% Precisión técnica',
      accent: 'violet',
      color: '#c4b5fd',
    },
    {
      num: '03',
      tag: 'CONSENSO',
      title: 'Sellado en blockchain',
      desc: 'Empaqueta cada logro en un hash inmutable y lo ancla permanentemente en Syscoin con marca de tiempo pública.',
      pill: 'Syscoin Layer-2',
      metric: '100% Inmutable',
      accent: 'amber',
      color: '#fbbf24',
    },
    {
      num: '04',
      tag: 'PORTABILIDAD',
      title: 'Pasaporte soberano',
      desc: 'Genera tu credencial pública universal (DID). Cualquier empresa o cliente la verifica al instante en cualquier país.',
      pill: 'Zero-Knowledge DID',
      metric: '< 1 seg Verificación',
      accent: 'emerald',
      color: '#34d399',
    },
  ]

  let rootEl = $state(null)
  let current = $state(0)
  let focused = $state(null)
  const active = $derived(focused ?? current)

  onMount(() => {
    if (!rootEl) return

    return sceneMotion(rootEl, ({ scene }) => {
      const head = rootEl.querySelector('.pipe-head')
      const read = rootEl.querySelector('.pipe-read')
      const rail = rootEl.querySelector('.pipe-rail')

      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: scene, start: 'top bottom', end: 'top top', scrub: 0.35 },
        })
        .fromTo(head, { y: -26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, 0.06)
        .fromTo(read, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.18)
        .fromTo(rail, { scaleX: 0.86, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.45 }, 0.34)

      const trigger = sceneProgress(scene, (p) => {
        // El haz completa el riel al 80%: el tramo final deja lectura tranquila.
        const progress = Math.max(0, Math.min(1, (p - 0.05) / 0.75))
        rootEl.style.setProperty('--pipe', progress.toFixed(4))
        const next = stepOf(progress, layers.length)
        if (next !== current) current = next
      })

      return () => trigger.kill()
    })
  })
</script>

<section
  class="pipe"
  bind:this={rootEl}
  aria-labelledby="project-title"
  style="--acc: {layers[active].color};"
>
  <!-- ── CABECERA ── -->
  <header class="pipe-head">
    <p class="kicker mono">
      <span class="beacon" aria-hidden="true"></span>
      ARQUITECTURA DE PROYECTO
    </p>
    <h2 id="project-title">
      De tus silos a un solo <span>sello.</span>
    </h2>
    <p class="lead">
      Cómo Aletheia transforma código disperso, certificaciones y reputación freelance en una sola
      prueba criptográfica inmutable.
    </p>
  </header>

  <!-- ── FASE ACTIVA: lectura abierta + numeral fantasma ── -->
  <div class="pipe-read" aria-live="polite">
    <span class="read-ghost" aria-hidden="true">{layers[active].num}</span>

    {#key active}
      <div class="read-swap">
        <div class="read-top mono">
          <span class="read-tag">FASE {layers[active].num} / 04</span>
          <span class="read-dot" aria-hidden="true"></span>
          <span class="read-accent">{layers[active].tag}</span>
        </div>

        <h3 class="read-title">{layers[active].title}</h3>
        <p class="read-desc">{layers[active].desc}</p>

        <div class="read-meta mono">
          <span class="meta-pill">{layers[active].pill}</span>
          <span class="meta-metric">{layers[active].metric}</span>
        </div>
      </div>
    {/key}
  </div>

  <!-- ── RIEL DEL PIPELINE: 4 estaciones a todo el ancho ── -->
  <div class="pipe-rail" role="group" aria-label="Cuatro capas del protocolo">
    <div class="rail-line" aria-hidden="true">
      <span class="rail-fill"></span>
      <span class="rail-head"></span>
    </div>

    <div class="rail-stations">
      {#each layers as layer, i (layer.num)}
        <button
          type="button"
          class="station"
          class:is-active={active === i}
          class:is-past={current > i}
          style="--st: {layer.color};"
          onpointerenter={() => (focused = i)}
          onpointerleave={() => (focused = null)}
          onclick={() => (current = i)}
          aria-label={`Fase ${layer.num}: ${layer.title}`}
        >
          <span class="st-stem" aria-hidden="true"></span>
          <span class="st-node" aria-hidden="true"></span>
          <span class="st-num mono">{layer.num}</span>
          <span class="st-title">{layer.title}</span>
          <span class="st-tag mono">{layer.tag}</span>
        </button>
      {/each}
    </div>
  </div>
</section>

<style>
  /* ── Escenario ── */
  .pipe {
    --pipe: 0;
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: clamp(94px, 13vh, 138px) clamp(26px, 6vw, 88px) clamp(38px, 5.5vh, 64px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    isolation: isolate;
  }

  .mono {
    font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace);
  }

  .pipe::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(50% 44% at 88% 18%, color-mix(in srgb, var(--acc) 10%, transparent), transparent 72%),
      radial-gradient(60% 50% at 12% 88%, rgba(167, 139, 250, 0.1), transparent 72%);
    pointer-events: none;
  }

  /* ── Cabecera ── */
  .pipe-head {
    position: relative;
    z-index: 1;
    max-width: 46ch;
    flex-shrink: 0;
  }

  .kicker {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.66rem;
    letter-spacing: 0.22em;
    color: var(--acc);
    transition: color 0.35s ease;
  }

  .beacon {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--acc);
    box-shadow: 0 0 10px var(--acc);
  }

  .pipe-head h2 {
    margin: 14px 0 12px;
    font-size: clamp(2rem, 3.4vw, 3.6rem);
    font-weight: 600;
    line-height: 1.04;
    letter-spacing: -0.05em;
    color: #f8fafc;
  }

  .pipe-head h2 span {
    background: linear-gradient(100deg, #22d3ee, #c4b5fd 55%, #fbbf24);
    background-size: 260% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: pipe-sheen 8s ease-in-out infinite;
  }

  @keyframes pipe-sheen {
    0%,
    100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }

  .lead {
    margin: 0;
    color: rgba(203, 213, 225, 0.78);
    font-size: clamp(0.88rem, 1.05vw, 1rem);
    line-height: 1.65;
    max-width: 44ch;
  }

  /* ── Lectura de la fase activa ── */
  .pipe-read {
    position: relative;
    z-index: 1;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-block: clamp(10px, 2vh, 26px);
  }

  .read-ghost {
    position: absolute;
    right: -1vw;
    top: 50%;
    transform: translateY(calc(-52% - var(--pipe) * 6%));
    font-size: clamp(9rem, 22vw, 20rem);
    font-weight: 700;
    line-height: 0.78;
    letter-spacing: -0.07em;
    color: transparent;
    -webkit-text-stroke: 1px color-mix(in srgb, var(--acc) 26%, transparent);
    pointer-events: none;
    user-select: none;
    z-index: -1;
    transition: -webkit-text-stroke-color 0.5s ease;
  }

  .read-swap {
    max-width: 56ch;
    animation: read-in 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @keyframes read-in {
    from {
      opacity: 0;
      transform: translateY(16px);
      filter: blur(5px);
    }
    to {
      opacity: 1;
      transform: none;
      filter: blur(0);
    }
  }

  .read-top {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    font-size: 0.64rem;
    letter-spacing: 0.2em;
  }

  .read-tag {
    color: rgba(148, 163, 184, 0.62);
  }

  .read-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(148, 163, 184, 0.4);
  }

  .read-accent {
    color: var(--acc);
    font-weight: 700;
    transition: color 0.35s ease;
  }

  .read-title {
    margin: 0.3em 0 0.25em;
    font-size: clamp(1.85rem, 3.9vw, 3.7rem);
    font-weight: 600;
    line-height: 1.02;
    letter-spacing: -0.05em;
    color: #f8fafc;
  }

  .read-desc {
    margin: 0;
    color: rgba(203, 213, 225, 0.82);
    font-size: clamp(0.88rem, 1.05vw, 1rem);
    line-height: 1.55;
    max-width: 52ch;
  }

  .read-meta {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    margin-top: clamp(12px, 2vh, 22px);
    font-size: 0.66rem;
    letter-spacing: 0.12em;
    flex-wrap: wrap;
  }

  .meta-pill {
    color: rgba(148, 163, 184, 0.8);
    padding-left: 12px;
    position: relative;
  }

  .meta-pill::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 6px;
    height: 6px;
    margin-top: -3px;
    border: 1px solid var(--acc);
    transform: rotate(45deg);
  }

  .meta-metric {
    color: #f8fafc;
    font-weight: 600;
    padding-left: 12px;
    border-left: 1px solid rgba(148, 163, 184, 0.25);
  }

  /* ── Riel del pipeline ── */
  .pipe-rail {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    padding-top: clamp(26px, 4vh, 44px);
    transform-origin: left center;
  }

  .rail-line {
    position: relative;
    height: 2px;
    background: rgba(196, 181, 253, 0.14);
    margin-bottom: 0;
  }

  .rail-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: calc(var(--pipe) * 100%);
    background: linear-gradient(90deg, #22d3ee, #c4b5fd 55%, #fbbf24);
    box-shadow: 0 0 12px rgba(196, 181, 253, 0.65);
  }

  .rail-head {
    position: absolute;
    top: 50%;
    left: calc(var(--pipe) * 100%);
    width: 9px;
    height: 9px;
    margin: -4.5px 0 0 -4.5px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 12px #fff, 0 0 24px var(--acc);
  }

  .rail-stations {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: clamp(10px, 1.5vw, 24px);
  }

  .station {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
    padding: 0;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    color: inherit;
    opacity: 0.45;
    transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .station:hover {
    opacity: 0.8;
  }

  .station.is-past {
    opacity: 0.7;
  }

  .station.is-active {
    opacity: 1;
    transform: translateY(-3px);
  }

  /* Vástago + nodo sobre el riel */
  .st-stem {
    position: absolute;
    top: calc(-1 * clamp(26px, 4vh, 44px));
    left: 0;
    width: 1px;
    height: clamp(26px, 4vh, 44px);
    background: rgba(196, 181, 253, 0.22);
    transition: background 0.3s ease, box-shadow 0.3s ease;
  }

  .station.is-active .st-stem {
    background: var(--st);
    box-shadow: 0 0 8px var(--st);
  }

  .st-node {
    position: absolute;
    top: calc(-1 * clamp(26px, 4vh, 44px) - 3px);
    left: -3px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(196, 181, 253, 0.45);
    transition: all 0.3s ease;
  }

  .station.is-active .st-node {
    background: var(--st);
    box-shadow: 0 0 12px var(--st);
    transform: scale(1.35);
  }

  .st-num {
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    color: rgba(148, 163, 184, 0.6);
    transition: color 0.3s ease;
  }

  .station.is-active .st-num {
    color: var(--st);
  }

  .st-title {
    font-family: var(--font-display, 'Geist Sans', sans-serif);
    font-size: clamp(0.85rem, 1.05vw, 1.05rem);
    font-weight: 600;
    letter-spacing: -0.02em;
    color: #f8fafc;
    line-height: 1.2;
  }

  .st-tag {
    font-size: 0.58rem;
    letter-spacing: 0.16em;
    color: rgba(148, 163, 184, 0.55);
  }

  /* ── MODO FLUJO ── */
  @media (max-width: 900px), (hover: none), (prefers-reduced-motion: reduce) {
    .pipe {
      height: auto;
      min-height: 100vh;
      padding: 104px 24px 60px;
    }

    .pipe-head {
      max-width: none;
    }

    .pipe-read {
      padding: 32px 0;
      flex: none;
    }

    .read-title {
      font-size: clamp(2rem, 9vw, 3.2rem);
    }

    .read-ghost {
      font-size: clamp(9rem, 40vw, 16rem);
      opacity: 0.6;
    }

    .pipe-rail {
      padding-top: 34px;
    }

    .rail-stations {
      grid-template-columns: repeat(2, 1fr);
      row-gap: 26px;
    }

    .st-stem,
    .st-node {
      display: none;
    }

    .station {
      opacity: 1;
      padding-left: 12px;
      border-left: 1px solid rgba(196, 181, 253, 0.25);
    }

    .station.is-active {
      border-left-color: var(--st);
      transform: none;
    }
  }
</style>
