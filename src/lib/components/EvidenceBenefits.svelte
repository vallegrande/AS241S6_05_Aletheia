<script>
  /**
   * EvidenceBenefits — ESCENA 04 · "Reel de consecuencias".
   *
   * Composición: CARRETÉ VERTICAL DE PALABRAS + ficha abierta.
   *   · Derecha: las seis garantías como palabras monumentales en un
   *     carrete que DESPLAZA con el scroll hasta la línea de foco.
   *     La palabra fuera de foco se apaga; la de foco se enciende.
   *   · Izquierda: editorial breve + la lectura del beneficio activo
   *     (claim · cuerpo · métrica) sin ninguna caja que lo encierre.
   *   · Sin cards: la lista es tipografía pura sobre línea de foco.
   */
  import { onMount } from 'svelte'
  import { sceneMotion, gsap, sceneProgress, stepOf } from '../scroll/scene'

  const benefits = [
    {
      no: '01',
      word: 'PORTABLE',
      claim: 'Una reputación que te acompaña',
      body: 'Tu historial profesional viaja contigo entre plataformas y empresas, sin quedar encerrado en ningún silo ni proveedor privado.',
      metric: 'Independiente de plataformas',
      color: '#22d3ee',
    },
    {
      no: '02',
      word: 'VERIFICABLE',
      claim: 'Prueba matemática, no promesa',
      body: 'Cada logro, proyecto y certificación puede auditarse de forma criptográfica e independiente en cualquier momento.',
      metric: 'Auditable sin intermediarios',
      color: '#a78bfa',
    },
    {
      no: '03',
      word: 'FLUIDO',
      claim: 'Cero fricción ni burocracia',
      body: 'La IA analiza y estructura tu evidencia técnica dispersa: tú dejas de rellenar formularios interminables.',
      metric: 'Automatización inteligente',
      color: '#fbbf24',
    },
    {
      no: '04',
      word: 'SOBERANO',
      claim: 'Control absoluto del usuario',
      body: 'Tú decides con precisión qué credenciales revelas, con quién las compartes y bajo qué términos o vigencia.',
      metric: 'Privacidad por diseño',
      color: '#c4b5fd',
    },
    {
      no: '05',
      word: 'CONFIABLE',
      claim: 'Confianza verificable por diseño',
      body: 'Las empresas acceden a evidencia estructurada y certificada en cadena, erradicando el fraude y los currículums inflados.',
      metric: 'Cero currículums falsos',
      color: '#22d3ee',
    },
    {
      no: '06',
      word: 'ACUMULATIVO',
      claim: 'Un activo vivo que crece contigo',
      body: 'Cada commit, certificación y contribución suma valor acumulativo: tu reputación se convierte en un activo inmutable.',
      metric: 'Historial inmutable continuo',
      color: '#fbbf24',
    },
  ]

  let root = $state(null)
  let current = $state(0)
  let focused = $state(null)
  const active = $derived(focused ?? current)

  onMount(() => {
    if (!root) return
    return sceneMotion(root, ({ scene }) => {
      const head = root.querySelector('.reel-editorial')
      const stage = root.querySelector('.reel-stage')

      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: scene, start: 'top bottom', end: 'top top', scrub: 0.35 },
        })
        .fromTo(head, { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, 0.05)
        .fromTo(stage, { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55 }, 0.14)

      const trigger = sceneProgress(scene, (p) => {
        // El carrete agota sus 6 palabras al 82%: el final deja la lectura.
        const progress = Math.max(0, Math.min(1, (p - 0.05) / 0.8))
        root.style.setProperty('--reel', progress.toFixed(4))
        const next = stepOf(progress, benefits.length)
        if (next !== current) current = next
      })
      return () => trigger.kill()
    })
  })
</script>

<section
  class="reel-scene"
  bind:this={root}
  aria-labelledby="benefit-title"
  style="--acc: {benefits[active].color}; --i: {active};"
>
  <!-- ── IZQUIERDA: editorial + lectura del beneficio activo ── -->
  <div class="reel-editorial">
    <header class="editorial-head">
      <p class="kicker mono">
        <span class="beacon" aria-hidden="true"></span>
        CONSECUENCIAS // IMPACTO REAL
        <span class="sep">/</span>
        <span class="count">06 GARANTÍAS</span>
      </p>

      <h2 id="benefit-title">
        Cuando la evidencia<br />
        <span class="title-gradient">tiene peso real.</span>
      </h2>

      <p class="lead">
        Lo que cambia cuando tu reputación deja de depender de un currículum estático y pasa a
        respaldarse con huellas criptográficas.
      </p>
    </header>

    <div class="reading" aria-live="polite">
      {#key active}
        <div class="reading-swap">
          <span class="reading-claim">{benefits[active].claim}</span>
          <p class="reading-body">{benefits[active].body}</p>

          <div class="reading-foot mono">
            <span class="metric">
              <i aria-hidden="true" style="background: {benefits[active].color}"></i>
              {benefits[active].metric}
            </span>
            <span class="steps" aria-hidden="true">
              {#each benefits as b, idx}
                <span
                  class="step"
                  class:is-on={active === idx}
                  class:is-done={current > idx}
                  style="--sc: {b.color}"
                ></span>
              {/each}
            </span>
          </div>
        </div>
      {/key}
    </div>
  </div>

  <!-- ── DERECHA: carrete vertical de palabras ── -->
  <div class="reel-stage" role="group" aria-label="Seis garantías de la evidencia verificable">
    <span class="reel-focal" aria-hidden="true"></span>
    <span class="reel-index mono" aria-hidden="true">{benefits[active].no}</span>

    <div class="reel-track">
      {#each benefits as b, i (b.no)}
        <button
          type="button"
          class="reel-word"
          class:is-active={active === i}
          class:is-near={Math.abs(i - current) === 1}
          style="--wc: {b.color}; --slot: {i};"
          onclick={() => (focused = focused === i ? null : i)}
          onpointerenter={() => (focused = i)}
          onpointerleave={() => (focused = null)}
          aria-label={`Efecto ${b.no}: ${b.claim}`}
        >
          <span class="word-no mono">{b.no}</span>
          <span class="word-txt">{b.word}</span>
        </button>
      {/each}
    </div>
  </div>
</section>

<style>
  /* ── Escenario ── */
  .reel-scene {
    --reel: 0;
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: clamp(94px, 13vh, 138px) clamp(26px, 6vw, 88px) clamp(44px, 6vh, 68px);
    display: grid;
    grid-template-columns: minmax(300px, 0.82fr) minmax(0, 1.18fr);
    gap: clamp(36px, 6vw, 96px);
    align-items: center;
    overflow: hidden;
    isolation: isolate;
  }

  .mono {
    font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace);
  }

  .reel-scene::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(52% 48% at 16% 34%, color-mix(in srgb, var(--acc) 9%, transparent), transparent 72%),
      radial-gradient(56% 46% at 84% 78%, rgba(167, 139, 250, 0.1), transparent 72%);
    pointer-events: none;
  }

  /* ── Izquierda: editorial + lectura ── */
  .reel-editorial {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: clamp(1.6rem, 4vh, 3rem);
  }

  .kicker {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    font-size: 0.66rem;
    letter-spacing: 0.2em;
    color: var(--acc);
    transition: color 0.35s ease;
  }

  .beacon {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--acc);
    box-shadow: 0 0 10px var(--acc), 0 0 18px var(--acc);
  }

  .kicker .sep {
    color: rgba(148, 163, 184, 0.4);
  }

  .kicker .count {
    letter-spacing: 0.14em;
    color: rgba(148, 163, 184, 0.65);
  }

  .editorial-head h2 {
    margin: 14px 0 14px;
    font-size: clamp(2.1rem, 3.7vw, 3.7rem);
    font-weight: 600;
    line-height: 1.04;
    letter-spacing: -0.045em;
    color: #f8fafc;
  }

  .title-gradient {
    background: linear-gradient(100deg, #fbbf24, #c4b5fd 50%, #22d3ee);
    background-size: 250% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: weight-sheen 8s ease-in-out infinite;
  }

  @keyframes weight-sheen {
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
    color: rgba(203, 213, 225, 0.82);
    font-size: clamp(0.9rem, 1.05vw, 1.02rem);
    line-height: 1.65;
    max-width: 42ch;
  }

  /* Lectura abierta del beneficio activo (sin caja) */
  .reading {
    position: relative;
    padding-left: clamp(16px, 1.6vw, 26px);
    border-left: 1px solid color-mix(in srgb, var(--acc) 45%, transparent);
    min-height: clamp(160px, 24vh, 220px);
  }

  .reading-swap {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    animation: reading-in 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @keyframes reading-in {
    from {
      opacity: 0;
      transform: translateY(12px);
      filter: blur(4px);
    }
    to {
      opacity: 1;
      transform: none;
      filter: blur(0);
    }
  }

  .reading-claim {
    font-family: var(--font-display, 'Geist Sans', sans-serif);
    font-size: clamp(1.2rem, 1.9vw, 1.7rem);
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.2;
    color: #f8fafc;
  }

  .reading-body {
    margin: 0;
    color: rgba(203, 213, 225, 0.85);
    font-size: clamp(0.86rem, 1vw, 0.96rem);
    line-height: 1.6;
    max-width: 46ch;
  }

  .reading-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(148, 163, 184, 0.14);
    font-size: 0.64rem;
    letter-spacing: 0.1em;
    flex-wrap: wrap;
  }

  .metric {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(226, 232, 240, 0.85);
  }

  .metric i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    box-shadow: 0 0 8px currentColor;
  }

  .steps {
    display: flex;
    gap: 4px;
  }

  .step {
    width: 14px;
    height: 3px;
    background: rgba(148, 163, 184, 0.22);
    transition: all 0.3s ease;
  }

  .step.is-done {
    background: color-mix(in srgb, var(--sc) 55%, transparent);
  }

  .step.is-on {
    width: 26px;
    background: var(--sc);
    box-shadow: 0 0 8px var(--sc);
  }

  /* ── Derecha: carrete vertical de palabras ── */
  .reel-stage {
    --slot-h: clamp(54px, 8.6vh, 84px);
    position: relative;
    height: calc(var(--slot-h) * 5.4);
    max-height: 74vh;
    overflow: hidden;
    z-index: 1;
    /* Recortes superior/inferior: el carrete se desvanece hacia el vacío */
    -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 16%, #000 84%, transparent 100%);
    mask-image: linear-gradient(180deg, transparent 0%, #000 16%, #000 84%, transparent 100%);
  }

  /* Línea de foco horizontal: las palabras pasan por ella */
  .reel-focal {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 1px;
    z-index: 2;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--acc) 0%, transparent) 0%,
      color-mix(in srgb, var(--acc) 75%, transparent) 22%,
      rgba(240, 236, 255, 0.9) 50%,
      color-mix(in srgb, var(--acc) 75%, transparent) 78%,
      transparent 100%
    );
    box-shadow: 0 0 16px color-mix(in srgb, var(--acc) 45%, transparent);
    pointer-events: none;
    transition: background 0.4s ease;
  }

  .reel-index {
    position: absolute;
    top: calc(50% - var(--slot-h) * 2.35);
    right: 0;
    z-index: 3;
    font-size: clamp(2.6rem, 5vw, 4.4rem);
    font-weight: 700;
    letter-spacing: -0.04em;
    color: transparent;
    -webkit-text-stroke: 1px color-mix(in srgb, var(--acc) 55%, transparent);
    pointer-events: none;
    /* Parallax: el índice se retira mientras el carrete avanza */
    transform: translateY(calc(var(--reel) * -26px));
  }

  .reel-track {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    display: flex;
    flex-direction: column;
    transform: translateY(calc(-1 * (var(--i) + 0.5) * var(--slot-h)));
    transition: transform 0.62s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }

  .reel-word {
    height: var(--slot-h);
    display: flex;
    align-items: center;
    gap: clamp(12px, 1.4vw, 22px);
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    color: inherit;
    opacity: 0.2;
    transform: scale(0.92);
    transform-origin: left center;
    transition:
      opacity 0.45s ease,
      transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .reel-word.is-near {
    opacity: 0.45;
  }

  .reel-word.is-active {
    opacity: 1;
    transform: scale(1);
  }

  .word-no {
    font-size: 0.66rem;
    letter-spacing: 0.16em;
    color: rgba(148, 163, 184, 0.6);
    width: 2.4em;
    flex-shrink: 0;
    transition: color 0.3s ease;
  }

  .reel-word.is-active .word-no {
    color: var(--wc);
  }

  .word-txt {
    font-family: var(--font-display, 'Geist Sans', sans-serif);
    font-size: clamp(1.7rem, 3.6vw, 3.5rem);
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 1;
    color: rgba(248, 250, 252, 0.72);
    transition: color 0.35s ease, text-shadow 0.35s ease;
    white-space: nowrap;
  }

  .reel-word.is-active .word-txt {
    color: #f8fafc;
    text-shadow: 0 0 38px color-mix(in srgb, var(--wc) 45%, transparent);
  }

  /* ── MODO FLUJO ── */
  @media (max-width: 900px), (hover: none), (prefers-reduced-motion: reduce) {
    .reel-scene {
      height: auto;
      min-height: 100vh;
      padding: 104px 24px 60px;
      grid-template-columns: 1fr;
      gap: 36px;
      align-items: start;
    }

    .reading {
      min-height: 0;
    }

    /* En flujo no hay carrete: la lista se despliega completa */
    .reel-stage {
      height: auto;
      max-height: none;
      overflow: visible;
      -webkit-mask-image: none;
      mask-image: none;
    }

    .reel-focal,
    .reel-index {
      display: none;
    }

    .reel-track {
      position: static;
      transform: none;
      gap: 4px;
    }

    .reel-word {
      height: auto;
      opacity: 1;
      transform: none;
      padding: 10px 0;
      border-bottom: 1px solid rgba(196, 181, 253, 0.12);
    }

    .word-txt {
      font-size: clamp(1.5rem, 7vw, 2.4rem);
      white-space: normal;
    }

    .reel-word.is-active .word-txt {
      color: var(--wc);
    }
  }
</style>
