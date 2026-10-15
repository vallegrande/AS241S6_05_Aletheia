<script>
  /**
   * ManifestSection — ESCENA 01 · "Triada monumental".
   *
   * Composición: UN protagonista, escala extrema, cero cards.
   *   · El titular es una sola palabra gigante que muta con el scroll
   *     (demostrable / verificable / portable) tras una máscara de clip.
   *   · Un numeral fantasma (outline) índiza el pilar detrás del titular.
   *   · Al pie, una tira abierta de los tres pilares separada por filetes:
   *     el activo se enciende, el resto queda en reposo legible.
   *   · Un hilo de progreso de 1px cierra el borde inferior.
   */
  import { onMount } from 'svelte'
  import { sceneMotion, gsap, sceneProgress, stepOf } from '../scroll/scene'

  const pillars = [
    {
      num: '01',
      word: 'demostrable.',
      code: 'IA NEURAL',
      tag: 'ANÁLISIS DE EVIDENCIA',
      name: 'Inteligencia Artificial',
      summary:
        'Analiza tu código, repositorios y certificaciones dispersas para estructurar una verdad técnica objetiva y sin sesgos.',
      tone: 'cyan',
      accent: '#22d3ee',
    },
    {
      num: '02',
      word: 'verificable.',
      code: 'BLOCKCHAIN',
      tag: 'CONSENSO INMUTABLE',
      name: 'Red Syscoin Layer-2',
      summary:
        'Ancla cada logro mediante hashes criptográficos inmutables en una blockchain pública que nadie puede borrar ni falsificar.',
      tone: 'violet',
      accent: '#c4b5fd',
    },
    {
      num: '03',
      word: 'portable.',
      code: 'SOBERANÍA',
      tag: 'AUTO-CUSTODIA TOTAL',
      name: 'Identidad Digital (DID)',
      summary:
        'El usuario custodia y porta sus propias credenciales, demostrando su valor en cualquier país sin intermediarios.',
      tone: 'amber',
      accent: '#fbbf24',
    },
  ]

  let root = $state(null)
  let current = $state(0)
  let hovered = $state(null)
  const shown = $derived(hovered ?? current)

  onMount(() => {
    if (!root) return

    return sceneMotion(root, ({ scene }) => {
      const monument = root.querySelector('.monument')
      const strip = root.querySelector('.triad')

      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: scene, start: 'top bottom', end: 'top top', scrub: 0.35 },
        })
        .fromTo(monument, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.1)
        .fromTo(strip, { y: 46, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42 }, 0.32)

      const trigger = sceneProgress(scene, (progress) => {
        // La triada completa su ciclo al 78%: el tramo final queda para leer.
        const p = Math.max(0, Math.min(1, (progress - 0.05) / 0.74))
        root.style.setProperty('--p', p.toFixed(4))
        const next = stepOf(p, pillars.length)
        if (next !== current) current = next
      })

      return () => trigger.kill()
    })
  })
</script>

<section
  class="triada"
  bind:this={root}
  aria-labelledby="manifest-title"
  style="--acc: {pillars[shown].accent};"
>
  <!-- Fila superior: identidad de escena -->
  <div class="triada-top mono">
    <span class="beacon" aria-hidden="true"></span>
    <span class="kicker">MANIFIESTO · 2026</span>
    <span class="sep">/</span>
    <span class="phase">PILAR {pillars[shown].num} DE 03</span>
  </div>

  <!-- ── PROTAGONISTA: titulmonumental que muta ── -->
  <div class="monument">
    <span class="ghost" aria-hidden="true">{pillars[shown].num}</span>

    <h1 id="manifest-title" class="monument-title">
      <span class="monument-lead">Tu reputación</span>
      {#key shown}
        <span class="monument-word">{pillars[shown].word}</span>
      {/key}
    </h1>

    <p class="monument-code mono">
      <span class="code-dot" aria-hidden="true"></span>
      {pillars[shown].code} — {pillars[shown].tag}
    </p>
  </div>

  <!-- ── BASE: tira abierta de los tres pilares ── -->
  <div class="triad" role="group" aria-label="Tres pilares tecnológicos">
    {#each pillars as p, i (p.num)}
      <button
        type="button"
        class="triad-item tone-{p.tone}"
        class:is-active={shown === i}
        onpointerenter={() => (hovered = i)}
        onpointerleave={() => (hovered = null)}
        onclick={() => (current = i)}
      >
        <span class="triad-rule" aria-hidden="true"><i></i></span>
        <span class="triad-meta mono"><b>{p.num}</b> {p.code}</span>
        <span class="triad-name">{p.name}</span>
        <span class="triad-summary">{p.summary}</span>
      </button>
    {/each}
  </div>

  <!-- Hilo de progreso de la escena -->
  <span class="triada-line" aria-hidden="true"><i></i></span>
</section>

<style>
  /* ── Escenario (fijo a 100vh del ScrollScene) ── */
  .triada {
    --p: 0;
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: clamp(94px, 13vh, 138px) clamp(26px, 6vw, 88px) clamp(34px, 5vh, 58px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    isolation: isolate;
  }

  .mono {
    font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace);
  }

  /* Ambiente: halo del pilar activo + contraluz inferior */
  .triada::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(58% 46% at 50% 8%, color-mix(in srgb, var(--acc) 11%, transparent), transparent 72%),
      radial-gradient(52% 44% at 8% 96%, rgba(167, 139, 250, 0.1), transparent 70%);
    pointer-events: none;
  }

  /* ── Fila superior ── */
  .triada-top {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    font-size: 0.66rem;
    letter-spacing: 0.22em;
    flex-shrink: 0;
  }

  .beacon {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--acc);
    box-shadow: 0 0 10px var(--acc), 0 0 20px color-mix(in srgb, var(--acc) 55%, transparent);
    transition: background 0.35s ease, box-shadow 0.35s ease;
  }

  .kicker {
    color: var(--acc);
    transition: color 0.35s ease;
  }

  .sep {
    color: rgba(148, 163, 184, 0.4);
  }

  .phase {
    letter-spacing: 0.14em;
    color: rgba(148, 163, 184, 0.65);
  }

  /* ── Protagonista ── */
  .monument {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .ghost {
    position: absolute;
    top: 50%;
    right: -1.5vw;
    transform: translateY(calc(-50% - var(--p) * 7%));
    font-family: var(--font-display, 'Geist Sans', sans-serif);
    font-size: clamp(13rem, 32vw, 27rem);
    font-weight: 700;
    line-height: 0.78;
    letter-spacing: -0.06em;
    color: transparent;
    -webkit-text-stroke: 1px rgba(196, 181, 253, 0.13);
    pointer-events: none;
    user-select: none;
    z-index: 0;
  }

  .monument-title {
    position: relative;
    z-index: 1;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1em;
  }

  .monument-lead {
    font-size: clamp(1.35rem, 2.7vw, 2.6rem);
    font-weight: 500;
    letter-spacing: -0.035em;
    color: rgba(248, 250, 252, 0.72);
    line-height: 1;
  }

  .monument-word {
    display: block;
    padding-bottom: 0.14em;
    margin-bottom: -0.14em;
    font-size: clamp(3rem, 10.5vw, 9.5rem);
    font-weight: 600;
    letter-spacing: -0.055em;
    line-height: 0.96;
    background: linear-gradient(100deg, #22d3ee, #c4b5fd 45%, #fbbf24 82%, #22d3ee);
    background-size: 280% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation:
      word-mask 0.62s cubic-bezier(0.22, 1, 0.36, 1) both,
      word-sheen 8s ease-in-out 0.6s infinite;
  }

  @keyframes word-mask {
    from {
      clip-path: inset(0 0 100% 0);
      transform: translateY(0.16em);
    }
    to {
      clip-path: inset(0 0 0 0);
      transform: translateY(0);
    }
  }

  @keyframes word-sheen {
    0%,
    100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }

  .monument-code {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: clamp(14px, 2.4vh, 26px);
    font-size: 0.66rem;
    letter-spacing: 0.2em;
    color: rgba(148, 163, 184, 0.72);
  }

  .code-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--acc);
    box-shadow: 0 0 8px var(--acc);
  }

  /* ── Base: tira abierta de tres pilares (sin cajas) ── */
  .triad {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: clamp(18px, 3vw, 48px);
    margin-top: clamp(16px, 3vh, 34px);
    flex-shrink: 0;
  }

  .triad-item {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: clamp(12px, 1.8vh, 18px) 0 0;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    color: inherit;
    opacity: 0.5;
    transition: opacity 0.35s ease;
  }

  .triad-item:hover {
    opacity: 0.8;
  }

  .triad-item.is-active {
    opacity: 1;
  }

  /* Filete base + filete de luz que se extiende con el estado activo */
  .triad-rule {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(196, 181, 253, 0.16);
  }

  .triad-rule i {
    position: absolute;
    inset: 0 auto 0 0;
    width: 0;
    background: var(--acc);
    box-shadow: 0 0 10px var(--acc);
    transition: width 0.55s cubic-bezier(0.22, 1, 0.36, 1), background 0.35s ease;
  }

  .triad-item.is-active .triad-rule i {
    width: 100%;
  }

  .triad-meta {
    font-size: 0.62rem;
    letter-spacing: 0.18em;
    color: rgba(148, 163, 184, 0.7);
  }

  .triad-meta b {
    font-weight: 700;
    color: rgba(248, 250, 252, 0.55);
    transition: color 0.3s ease;
  }

  .triad-item.is-active .triad-meta b {
    color: var(--acc);
  }

  .triad-name {
    font-family: var(--font-display, 'Geist Sans', sans-serif);
    font-size: clamp(1rem, 1.35vw, 1.3rem);
    font-weight: 600;
    letter-spacing: -0.025em;
    line-height: 1.2;
    color: #f8fafc;
  }

  .triad-summary {
    font-size: clamp(0.78rem, 0.9vw, 0.88rem);
    line-height: 1.55;
    color: rgba(203, 213, 225, 0.72);
    max-width: 42ch;
    transition: color 0.3s ease;
  }

  .triad-item.is-active .triad-summary {
    color: rgba(232, 236, 245, 0.94);
  }

  /* ── Hilo de progreso ── */
  .triada-line {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    background: rgba(196, 181, 253, 0.1);
    z-index: 2;
  }

  .triada-line i {
    display: block;
    height: 100%;
    width: calc(var(--p) * 100%);
    background: linear-gradient(90deg, #22d3ee, #c4b5fd 55%, #fbbf24);
    box-shadow: 0 0 10px rgba(196, 181, 253, 0.55);
  }

  /* ── MODO FLUJO (móvil / sin puntero / reduced-motion) ── */
  @media (max-width: 900px), (hover: none), (prefers-reduced-motion: reduce) {
    .triada {
      height: auto;
      min-height: 100vh;
      padding: 104px 24px 56px;
    }

    .monument {
      align-items: flex-start;
      text-align: left;
      padding: 40px 0;
      flex: none;
    }

    .monument-title {
      align-items: flex-start;
    }

    .monument-word {
      font-size: clamp(2.9rem, 15vw, 5.5rem);
    }

    .ghost {
      right: -6vw;
      font-size: clamp(9rem, 46vw, 16rem);
      opacity: 0.7;
    }

    .triad {
      grid-template-columns: 1fr;
      gap: 0;
    }

    .triad-item {
      opacity: 1;
      padding: 16px 0;
      border-bottom: 1px solid rgba(196, 181, 253, 0.12);
    }

    .triad-rule {
      display: none;
    }

    .triad-summary {
      max-width: none;
    }

    .triada-line {
      display: none;
    }
  }
</style>
