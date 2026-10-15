<script>
  /**
   * SystemOrbit — ESCENA 05 · "Núcleo radial".
   *
   * Composición: UN SOLO OBJETO PROTAGONISTA — la rueda orbital.
   *   · Derecha: rueda de 8 satélites con núcleo, barrido de radar y haz
   *     que apunta siempre al módulo activo. Es el único elemento visual
   *     fuerte de la escena; todo lo demás es tipografía en reposo.
   *   · Izquierda: editorial breve + lectura abierta del módulo activo
   *     (código · título · spec · cuerpo) SIN caja ni tarjeta.
   *   · Los controles (← →) viven junto al código, como un instrumento.
   *   · Móvil: la rueda se sustituye por un listado en filetes.
   */
  import { onMount } from 'svelte'
  import { sceneMotion, gsap, sceneProgress, stepOf } from '../scroll/scene'
  import Icon from './Icon.svelte'

  const features = [
    {
      code: 'F-01',
      title: 'Conexión de fuentes',
      body: 'Conecta repositorios, commits de Git, plataformas de certificación y fuentes profesionales dispersas en un único canal seguro.',
      spec: 'Pipelines OAuth + Webhooks',
      icon: 'link',
      deg: 0,
      x: 50,
      y: 8,
    },
    {
      code: 'F-02',
      title: 'Análisis mediante IA',
      body: 'Procesa y cataloga el código real y las contribuciones para derivar un mapa de competencias estructurado sin sesgos.',
      spec: 'Taxonomía Semántica LLM',
      icon: 'sparkle',
      deg: 45,
      x: 79.7,
      y: 20.3,
    },
    {
      code: 'F-03',
      title: 'Certificación Blockchain',
      body: 'Genera huellas criptográficas inmutables que acreditan la autoría de proyectos y logros sin intermediarios.',
      spec: 'Pruebas Matemáticas en Cadena',
      icon: 'blocks',
      deg: 90,
      x: 92,
      y: 50,
    },
    {
      code: 'F-04',
      title: 'Identidad digital soberana',
      body: 'Construye un pasaporte profesional criptográfico unificado que pertenece al desarrollador y no a una plataforma privada.',
      spec: 'Estándar DID W3C Soberano',
      icon: 'shield',
      deg: 135,
      x: 79.7,
      y: 79.7,
    },
    {
      code: 'F-05',
      title: 'Verificación instantánea',
      body: 'Cualquier reclutador o institución puede auditar en milisegundos la legitimidad matemática de cada credencial.',
      spec: 'Validación P2P Instantánea',
      icon: 'check',
      deg: 180,
      x: 50,
      y: 92,
    },
    {
      code: 'F-06',
      title: 'Privacidad selectiva',
      body: 'Tú decides mediante divulgación criptográfica qué métricas revelas, con quién las compartes y durante cuánto tiempo.',
      spec: 'Divulgación Criptográfica Selectiva',
      icon: 'lock',
      deg: 225,
      x: 20.3,
      y: 79.7,
    },
    {
      code: 'F-07',
      title: 'Billetera de reputación',
      body: 'Custodia no permisionada de tus credenciales y llaves públicas compatibles con redes Ethereum, Syscoin y EVM.',
      spec: 'Custodia Soberana Non-Custodial',
      icon: 'send',
      deg: 270,
      x: 8,
      y: 50,
    },
    {
      code: 'F-08',
      title: 'Marketplace de talento',
      body: 'Conecta de forma directa a organizaciones con talento auditado en base a evidencia técnica comprobada, no en autodeclaraciones.',
      spec: 'Match Descentralizado por Habilidades',
      icon: 'users',
      deg: 315,
      x: 20.3,
      y: 20.3,
    },
  ]

  let root = $state(null)
  let active = $state(0)
  let selected = $state(null)
  const focus = $derived(selected ?? active)

  let wheelRotation = $state(0)

  function prevFeature() {
    selected = (focus - 1 + features.length) % features.length
  }

  function nextFeature() {
    selected = (focus + 1) % features.length
  }

  onMount(() => {
    if (!root) return
    return sceneMotion(root, ({ scene }) => {
      const copy = root.querySelector('.orbit-editorial')
      const wheel = root.querySelector('.orbit-stage')

      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: scene, start: 'top bottom', end: 'top top', scrub: 0.35 },
        })
        .fromTo(copy, { x: -34, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45 }, 0.08)
        .fromTo(wheel, { scale: 0.86, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55 }, 0.12)

      const trigger = sceneProgress(scene, (p) => {
        // El barrido completa al 80%: el tramo final queda para leer el octavo módulo.
        const progress = Math.max(0, Math.min(1, (p - 0.05) / 0.75))
        root.style.setProperty('--orbit', progress.toFixed(4))
        wheelRotation = progress * 360
        const next = stepOf(progress, features.length)
        if (next !== active) active = next
      })

      return () => trigger.kill()
    })
  })
</script>

<section class="orbit" bind:this={root} aria-labelledby="orbit-title">
  <!-- ── IZQUIERDA: editorial + lectura abierta del módulo ── -->
  <div class="orbit-editorial">
    <header class="editorial-head">
      <p class="kicker mono">
        <span class="beacon" aria-hidden="true"></span>
        ARQUITECTURA VIVA // NÚCLEO MODULAR
        <span class="sep">/</span>
        <span class="count">08 MÓDULOS</span>
      </p>

      <h2 id="orbit-title">
        Capacidades<br />
        <span class="title-gradient">en relación.</span>
      </h2>

      <p class="lead">
        Ocho módulos coordinan la extracción, la validación criptográfica y la custodia de tu
        reputación técnica.
      </p>
    </header>

    <div class="module-read" aria-live="polite">
      {#key focus}
        <div class="module-swap">
          <div class="module-top mono">
            <span class="module-code">
              <i class="pulse" aria-hidden="true"></i>
              {features[focus].code}
            </span>
            <span class="module-sep">/</span>
            <span class="module-spec">{features[focus].spec}</span>

            <span class="orbit-nav">
              <button type="button" class="arrow" onclick={prevFeature} aria-label="Módulo anterior">
                <Icon name="arrow" size={13} />
              </button>
              <button
                type="button"
                class="arrow flip"
                onclick={nextFeature}
                aria-label="Siguiente módulo"
              >
                <Icon name="arrow" size={13} />
              </button>
            </span>
          </div>

          <h3 class="module-title">{features[focus].title}</h3>
          <p class="module-body">{features[focus].body}</p>

          <div class="segments" aria-hidden="true">
            {#each features as _, i (i)}
              <span class="seg" class:is-active={i === focus} class:is-done={i <= focus}></span>
            {/each}
          </div>
        </div>
      {/key}
    </div>
  </div>

  <!-- ── DERECHA: la rueda orbital ── -->
  <div class="orbit-stage">
    <div
      class="orbit-wheel"
      style="--wheel-rot: {wheelRotation}deg;"
      aria-label="Ruleta orbital de capacidades"
    >
      <div class="wheel-ring ring-outer" aria-hidden="true"></div>
      <div class="wheel-ring ring-mid" aria-hidden="true"></div>
      <div class="wheel-ring ring-inner" aria-hidden="true"></div>
      <div class="wheel-crosshair" aria-hidden="true"></div>
      <div class="wheel-radar-sweep" aria-hidden="true"></div>

      <div class="wheel-core" aria-hidden="true">
        <div class="core-aura"></div>
        <div class="core-orbit-dashes"></div>
        <div class="core-icon-container">
          {#key focus}
            <div class="core-icon-swap"><Icon name={features[focus].icon} size={30} /></div>
          {/key}
        </div>
        <span class="core-code mono">{features[focus].code}</span>
      </div>

      <div
        class="wheel-laser-beam"
        style="transform: rotate({features[focus].deg}deg);"
        aria-hidden="true"
      >
        <div class="laser-beam-line"></div>
      </div>

      {#each features as f, i (f.code)}
        <button
          type="button"
          class="orbit-node"
          class:is-active={focus === i}
          class:is-past={active > i}
          style="--x: {f.x}%; --y: {f.y}%;"
          onclick={() => (selected = selected === i ? null : i)}
          onpointerenter={() => (selected = i)}
          onpointerleave={() => (selected = null)}
          aria-label={`${f.code}: ${f.title}`}
        >
          <span class="node-disc"><Icon name={f.icon} size={20} /></span>
          <span class="node-tag mono">{f.code}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Listado en filetes (fallback móvil / flujo) -->
  <ol class="orbit-list">
    {#each features as f (f.code)}
      <li>
        <span class="li-icon" aria-hidden="true"><Icon name={f.icon} size={17} /></span>
        <span class="li-text">
          <span class="li-head mono">
            <b>{f.code}</b>
            <span>{f.spec}</span>
          </span>
          <strong class="li-title">{f.title}</strong>
          <p class="li-body">{f.body}</p>
        </span>
      </li>
    {/each}
  </ol>
</section>

<style>
  /* ── Escenario ── */
  .orbit {
    --orbit: 0;
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: clamp(94px, 13vh, 138px) clamp(26px, 6vw, 88px) clamp(44px, 6vh, 68px);
    display: grid;
    grid-template-columns: minmax(300px, 0.86fr) minmax(0, 1.14fr);
    gap: clamp(28px, 4vw, 64px);
    align-items: center;
    overflow: hidden;
    isolation: isolate;
  }

  .mono {
    font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace);
  }

  .orbit::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(58% 55% at 74% 50%, rgba(34, 211, 238, 0.09), transparent 70%),
      radial-gradient(52% 48% at 16% 42%, rgba(167, 139, 250, 0.09), transparent 72%);
    pointer-events: none;
  }

  /* ── Izquierda ── */
  .orbit-editorial {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: clamp(1.5rem, 4vh, 2.8rem);
  }

  .kicker {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    font-size: 0.66rem;
    letter-spacing: 0.2em;
    color: #22d3ee;
  }

  .beacon {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #22d3ee;
    box-shadow: 0 0 10px #22d3ee, 0 0 18px #22d3ee;
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
    background: linear-gradient(100deg, #22d3ee, #c4b5fd 55%, #fbbf24);
    background-size: 250% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: orbit-sheen 8s ease-in-out infinite;
  }

  @keyframes orbit-sheen {
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

  /* Lectura abierta del módulo (sin caja) */
  .module-read {
    position: relative;
    padding-left: clamp(16px, 1.6vw, 26px);
    border-left: 1px solid rgba(34, 211, 238, 0.35);
    min-height: clamp(170px, 25vh, 230px);
  }

  .module-swap {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    animation: module-in 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @keyframes module-in {
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

  .module-top {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    flex-wrap: wrap;
    font-size: 0.64rem;
    letter-spacing: 0.14em;
  }

  .module-code {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    color: #22d3ee;
    font-weight: 700;
  }

  .pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22d3ee;
    box-shadow: 0 0 8px #22d3ee;
    animation: pulse-blink 1.8s ease-in-out infinite;
  }

  @keyframes pulse-blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  .module-sep {
    color: rgba(148, 163, 184, 0.4);
  }

  .module-spec {
    color: rgba(196, 181, 253, 0.85);
  }

  .orbit-nav {
    display: flex;
    gap: 6px;
    margin-left: auto;
  }

  .arrow {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba(148, 163, 184, 0.3);
    color: rgba(226, 232, 240, 0.8);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .arrow:hover {
    border-color: #22d3ee;
    color: #22d3ee;
    box-shadow: 0 0 14px rgba(34, 211, 238, 0.3);
  }

  .flip {
    transform: rotate(180deg);
  }

  .module-title {
    margin: 0.15rem 0 0;
    font-size: clamp(1.5rem, 2.5vw, 2.3rem);
    font-weight: 600;
    letter-spacing: -0.035em;
    line-height: 1.1;
    color: #f8fafc;
  }

  .module-body {
    margin: 0;
    color: rgba(203, 213, 225, 0.85);
    font-size: clamp(0.86rem, 1vw, 0.97rem);
    line-height: 1.6;
    max-width: 46ch;
  }

  .segments {
    display: flex;
    gap: 5px;
    margin-top: 0.5rem;
  }

  .seg {
    width: 18px;
    height: 3px;
    background: rgba(148, 163, 184, 0.22);
    transition: all 0.3s ease;
  }

  .seg.is-done {
    background: rgba(34, 211, 238, 0.55);
  }

  .seg.is-active {
    width: 34px;
    background: #22d3ee;
    box-shadow: 0 0 10px #22d3ee;
  }

  /* ── Derecha: la rueda orbital ── */
  .orbit-stage {
    position: relative;
    display: grid;
    place-items: center;
    /* Cuadrado estricto: los anillos y la rueda dependen de un aspect 1:1 */
    width: min(100%, 74vh, 700px);
    aspect-ratio: 1;
    justify-self: center;
    z-index: 1;
  }

  .orbit-wheel {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .wheel-ring {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  .ring-outer {
    inset: 8%;
    border: 1px solid rgba(196, 181, 253, 0.2);
  }

  .ring-mid {
    inset: 24%;
    border: 1px dashed rgba(34, 211, 238, 0.28);
    animation: ring-turn 60s linear infinite;
  }

  .ring-inner {
    inset: 38%;
    border: 1px solid rgba(167, 139, 250, 0.25);
  }

  @keyframes ring-turn {
    to {
      transform: rotate(-360deg);
    }
  }

  .wheel-crosshair {
    position: absolute;
    inset: 8%;
    border-radius: 50%;
    background:
      linear-gradient(90deg, transparent 49.8%, rgba(196, 181, 253, 0.1) 50%, transparent 50.2%),
      linear-gradient(transparent 49.8%, rgba(196, 181, 253, 0.1) 50%, transparent 50.2%);
    pointer-events: none;
  }

  .wheel-radar-sweep {
    position: absolute;
    inset: 8%;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      transparent 0deg,
      rgba(34, 211, 238, 0.16) 60deg,
      transparent 65deg
    );
    animation: radar-sweep 12s linear infinite;
    pointer-events: none;
    mask: radial-gradient(circle, transparent 38%, black 40%);
    -webkit-mask: radial-gradient(circle, transparent 38%, black 40%);
  }

  @keyframes radar-sweep {
    to {
      transform: rotate(360deg);
    }
  }

  .wheel-laser-beam {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 42%;
    height: 1px;
    transform-origin: 0% 50%;
    pointer-events: none;
    transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    z-index: 1;
  }

  .laser-beam-line {
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, rgba(34, 211, 238, 0.75), transparent);
    box-shadow: 0 0 10px rgba(34, 211, 238, 0.8);
  }

  .wheel-core {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 28%;
    aspect-ratio: 1;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    /* El núcleo crece con el scroll: sensación de acercamiento */
    transform: translate(-50%, -50%) scale(calc(1 + var(--orbit) * 0.07));
    background: radial-gradient(circle at 40% 35%, rgba(255, 255, 255, 0.14), rgba(15, 23, 42, 0.95) 75%);
    border: 1px solid rgba(34, 211, 238, 0.5);
    box-shadow:
      0 0 50px rgba(34, 211, 238, 0.3),
      inset 0 0 26px rgba(124, 58, 237, 0.35);
    z-index: 3;
  }

  .core-aura {
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1px solid rgba(34, 211, 238, 0.3);
    animation: core-aura 3s ease-out infinite;
  }

  @keyframes core-aura {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }
    70%,
    100% {
      transform: scale(1.4);
      opacity: 0;
    }
  }

  .core-orbit-dashes {
    position: absolute;
    inset: 6px;
    border-radius: 50%;
    border: 1px dashed rgba(196, 181, 253, 0.4);
    animation: core-spin 20s linear infinite;
  }

  @keyframes core-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .core-icon-container {
    position: relative;
    z-index: 2;
    color: #22d3ee;
  }

  .core-icon-swap {
    animation: core-icon-in 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  @keyframes core-icon-in {
    from {
      opacity: 0;
      transform: scale(0.7);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .core-code {
    position: relative;
    z-index: 2;
    font-size: 0.66rem;
    letter-spacing: 0.16em;
    color: rgba(226, 232, 240, 0.95);
    font-weight: 700;
  }

  /* ── 8 nodos satélite ── */
  .orbit-node {
    position: absolute;
    left: var(--x);
    top: var(--y);
    transform: translate(-50%, -50%);
    width: clamp(54px, 5.2vw, 68px);
    height: clamp(54px, 5.2vw, 68px);
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    z-index: 4;
    transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .node-disc {
    width: clamp(48px, 4.6vw, 58px);
    height: clamp(48px, 4.6vw, 58px);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(148, 163, 184, 0.22);
    color: rgba(148, 163, 184, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .node-tag {
    font-size: 0.6rem;
    letter-spacing: 0.12em;
    color: rgba(148, 163, 184, 0.6);
    transition: color 0.25s ease;
  }

  .orbit-node:hover {
    transform: translate(-50%, -50%) scale(1.15);
  }

  .orbit-node:hover .node-disc {
    border-color: rgba(34, 211, 238, 0.55);
    color: #22d3ee;
    background: rgba(34, 211, 238, 0.15);
    box-shadow: 0 0 16px rgba(34, 211, 238, 0.3);
  }

  .orbit-node:hover .node-tag {
    color: #22d3ee;
  }

  .orbit-node.is-active {
    transform: translate(-50%, -50%) scale(1.22);
  }

  .orbit-node.is-active .node-disc {
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.3), rgba(124, 58, 237, 0.4));
    border-color: #22d3ee;
    color: #ffffff;
    box-shadow:
      0 0 24px rgba(34, 211, 238, 0.7),
      0 0 40px rgba(124, 58, 237, 0.35);
  }

  .orbit-node.is-active .node-tag {
    color: #22d3ee;
    font-weight: 700;
  }

  .orbit-node.is-past .node-disc {
    border-color: rgba(196, 181, 253, 0.35);
    color: rgba(196, 181, 253, 0.85);
  }

  /* ── Listado en filetes (solo en modo flujo) ── */
  .orbit-list {
    display: none;
    list-style: none;
    margin: 0;
    padding: 0;
    width: 100%;
  }

  /* ── MODO FLUJO ── */
  @media (max-width: 900px), (hover: none), (prefers-reduced-motion: reduce) {
    .orbit {
      height: auto;
      min-height: 100vh;
      padding: 104px 24px 60px;
      grid-template-columns: 1fr;
      gap: 34px;
      align-items: start;
    }

    .orbit-stage {
      display: none;
    }

    .module-read {
      min-height: 0;
    }

    .lead,
    .module-body {
      max-width: none;
    }

    .orbit-list {
      display: flex;
      flex-direction: column;
    }

    .orbit-list li {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 16px 0;
      border-bottom: 1px solid rgba(196, 181, 253, 0.12);
    }

    .orbit-list li:first-child {
      border-top: 1px solid rgba(196, 181, 253, 0.12);
    }

    .li-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 1px solid rgba(34, 211, 238, 0.35);
      color: #22d3ee;
      flex-shrink: 0;
    }

    .li-text {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .li-head {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.6rem;
      letter-spacing: 0.14em;
      flex-wrap: wrap;
    }

    .li-head b {
      color: #22d3ee;
    }

    .li-head span {
      color: rgba(196, 181, 253, 0.75);
    }

    .li-title {
      font-size: 1rem;
      color: #f8fafc;
      letter-spacing: -0.02em;
    }

    .li-body {
      margin: 0;
      font-size: 0.82rem;
      color: rgba(203, 213, 225, 0.8);
      line-height: 1.5;
    }
  }
</style>
