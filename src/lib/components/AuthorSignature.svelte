<script>
  /**
   * AuthorSignature — ESCENA 06 · "Colofón editorial".
   *
   * Composición: cierre tipo COLOFÓN de libro, no dashboard HUD.
   *   · Nombre gigante de fondo ( watermark ) que el retrato atraviesa.
   *   · Retrato integrado en la composición con clip-path + parallax de
   *     puntero; sin marco rectangular pesado.
   *   · Métricas como LEDGER tipográfico con puntos guía (sin cajas).
   *   · Skills como filetes finos con relleno animado por scroll.
   *   · Pestañas como enlaces subrayados (sin contenedores).
   *   · Firma: hash + estado, en una sola línea mono al pie.
   */
  import { onMount } from 'svelte'
  import { sceneMotion, gsap, sceneProgress } from '../scroll/scene'
  import Icon from './Icon.svelte'

  const tabs = [
    {
      id: 'vision',
      label: 'Visión & Propósito',
      content:
        'Aletheia nace como una respuesta a la fragmentación de la identidad profesional. A través de Inteligencia Artificial y la inmutabilidad de Blockchain, construimos un pasaporte de reputación técnica descentralizado y matemáticamente verificable.',
    },
    {
      id: 'stack',
      label: 'Arquitectura Tech',
      content:
        'Especializado en arquitecturas full-stack modernas: Svelte/SvelteKit, Smart Contracts (Solidity/Syscoin EVM), desarrollo de modelos IA orientados a taxonomía de código y diseño de sistemas distribuidos.',
    },
    {
      id: 'credentials',
      label: 'Validación & Red',
      content:
        'Desarrollo originado en Lima, Perú (UTP). Integración con firmas criptográficas W3C DID, verificación P2P de habilidades y pasaporte soberano no permisionado.',
    },
  ]

  const metrics = [
    { label: 'PROYECTO', val: 'ALETHEIA v1.0' },
    { label: 'AUTOR', val: 'C. A. CAYCHO C.' },
    { label: 'ROL', val: 'LEAD DEVELOPER' },
    { label: 'UBICACIÓN', val: 'LIMA, PERÚ' },
    { label: 'INSTITUCIÓN', val: 'UTP 2026' },
  ]

  const skills = [
    { name: 'Svelte / SvelteKit', level: '95%', tag: 'CORE' },
    { name: 'Blockchain & EVM', level: '90%', tag: 'WEB3' },
    { name: 'IA & LLM Agents', level: '88%', tag: 'AI' },
    { name: 'TypeScript & Node', level: '92%', tag: 'DEV' },
  ]

  let root = $state(null)
  let activeTab = $state('vision')

  /* Track suave del puntero para el retrato */
  let mx = $state(0.5)
  let my = $state(0.5)

  function onMove(e) {
    if (!root) return
    const r = root.getBoundingClientRect()
    mx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    my = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))
  }

  function onLeave() {
    mx = 0.5
    my = 0.5
  }

  onMount(() => {
    if (!root) return
    return sceneMotion(root, ({ scene }) => {
      const plate = root.querySelector('.colophon-plate')
      const ledger = root.querySelector('.colophon-ledger')
      const portrait = root.querySelector('.portrait-figure')

      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: scene, start: 'top bottom', end: 'top top', scrub: 0.35 },
        })
        .fromTo(portrait, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.05)
        .fromTo(plate, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, 0.18)
        .fromTo(ledger, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, 0.3)

      const trigger = sceneProgress(scene, (p) => {
        root.style.setProperty('--sig', p.toFixed(4))
      })
      return () => trigger.kill()
    })
  })
</script>

<section
  class="colophon"
  bind:this={root}
  aria-labelledby="dev-title"
  onpointermove={onMove}
  onpointerleave={onLeave}
  style="--mx: {mx.toFixed(3)}; --my: {my.toFixed(3)};"
>
  <!-- Marca de agua: el apellido, enorme, detrás de todo -->
  <span class="watermark" aria-hidden="true">CAYCHO</span>

  <!-- Filete de luz que barre la escena con el scroll -->
  <span class="sweep-line" aria-hidden="true"></span>

  <!-- ── CABECERA EDITORIAL ── -->
  <header class="colophon-head">
    <p class="kicker mono">
      <span class="beacon" aria-hidden="true"></span>
      SYS.INSPECTOR // EXPEDIENTE TÉCNICO
      <span class="sep">/</span>
      <span class="accent">AUTOR & LIDERAZGO</span>
    </p>
    <h2 id="dev-title">Firma del <span class="title-glow">Desarrollador</span></h2>
  </header>

  <!-- ── CUERPO: retrato + placa + ledger ── -->
  <div class="colophon-body">
    <!-- Retrato integrado en la composición -->
    <figure class="portrait-figure">
      <div class="portrait-clip">
        <img
          src="/perfil.png"
          alt="Carlos Alejandro Caycho Casas"
          width="360"
          height="360"
          loading="lazy"
        />
      </div>
      <figcaption class="portrait-caption mono">
        <Icon name="shield" size={13} />
        FIRMADO CRIPTOGRÁFICAMENTE
      </figcaption>
    </figure>

    <!-- Placa: identidad + pestañas + panel -->
    <div class="colophon-plate">
      <div class="identity">
        <h3 class="author-name">Carlos Alejandro Caycho Casas</h3>
        <p class="author-role mono">Full-Stack Architect &amp; AI System Designer</p>
      </div>

      <nav class="plate-tabs" aria-label="Secciones del perfil">
        {#each tabs as t (t.id)}
          <button
            type="button"
            class="tab"
            class:is-active={activeTab === t.id}
            onclick={() => (activeTab = t.id)}
          >
            {t.label}
          </button>
        {/each}
      </nav>

      <div class="tab-panel" aria-live="polite">
        {#key activeTab}
          <p class="panel-body">
            {tabs.find((t) => t.id === activeTab)?.content}
          </p>
        {/key}
      </div>
    </div>

    <!-- Ledger: métricas con puntos guía + skills en filete -->
    <div class="colophon-ledger">
      <div class="meta-list mono">
        {#each metrics as m (m.label)}
          <div class="meta-item">
            <span class="meta-label">{m.label}</span>
            <span class="meta-dots" aria-hidden="true"></span>
            <span class="meta-val">{m.val}</span>
          </div>
        {/each}
      </div>

      <div class="skills">
        <p class="skills-title mono">HABILIDADES CLAVE</p>
        {#each skills as s (s.name)}
          <div class="skill-row">
            <div class="skill-info mono">
              <span>{s.name}</span>
              <span class="skill-tag">{s.tag}</span>
            </div>
            <div class="skill-track">
              <div class="skill-fill" style="width: {s.level}"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- ── PIE DE FIRMA ── -->
  <footer class="colophon-foot mono">
    <span class="hash">
      <b>HASH DE FIRMA:</b>
      0x8a92...f73e
    </span>
    <span class="foot-sep" aria-hidden="true"></span>
    <span class="status">
      <i aria-hidden="true"></i>
      VERIFICADO
    </span>
  </footer>
</section>

<style>
  /* ── Escenario ── */
  .colophon {
    --sig: 0;
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: clamp(94px, 12vh, 128px) clamp(26px, 6vw, 88px) clamp(34px, 5vh, 56px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    isolation: isolate;
    color: #f8fafc;
  }

  .mono {
    font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace);
  }

  .colophon::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(56% 48% at 22% 62%, rgba(34, 211, 238, 0.08), transparent 72%),
      radial-gradient(54% 46% at 82% 30%, rgba(167, 139, 250, 0.1), transparent 72%);
    pointer-events: none;
  }

  /* Marca de agua gigante */
  .watermark {
    position: absolute;
    left: 50%;
    bottom: -4%;
    transform: translateX(-50%) translateY(calc(var(--sig) * -4%));
    font-size: clamp(8rem, 22vw, 20rem);
    font-weight: 700;
    letter-spacing: -0.05em;
    line-height: 0.8;
    color: transparent;
    -webkit-text-stroke: 1px rgba(196, 181, 253, 0.09);
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
    z-index: -1;
  }

  /* Filete de luz horizontal que asciende con el scroll */
  .sweep-line {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(16% + var(--sig) * 66%);
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.55) 50%, transparent);
    box-shadow: 0 0 14px rgba(34, 211, 238, 0.6);
    pointer-events: none;
    z-index: 0;
  }

  /* ── Cabecera ── */
  .colophon-head {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }

  .kicker {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    flex-wrap: wrap;
    font-size: 0.62rem;
    letter-spacing: 0.18em;
    color: rgba(148, 163, 184, 0.7);
  }

  .beacon {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22d3ee;
    box-shadow: 0 0 8px #22d3ee;
  }

  .kicker .sep {
    color: rgba(148, 163, 184, 0.3);
  }

  .kicker .accent {
    color: #22d3ee;
  }

  .colophon-head h2 {
    margin: 12px 0 0;
    font-size: clamp(1.9rem, 3.4vw, 3.2rem);
    font-weight: 600;
    letter-spacing: -0.04em;
    line-height: 1.05;
  }

  .title-glow {
    background: linear-gradient(120deg, #22d3ee, #c4b5fd 60%, #fbbf24);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  /* ── Cuerpo: 3 bloques abiertos ── */
  .colophon-body {
    position: relative;
    z-index: 1;
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(190px, 0.62fr) minmax(0, 1.35fr) minmax(230px, 0.83fr);
    gap: clamp(24px, 3.5vw, 56px);
    align-items: center;
    padding-block: clamp(16px, 3vh, 34px);
  }

  /* Retrato integrado */
  .portrait-figure {
    position: relative;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.8rem;
    transform: translate(
      calc((var(--mx) - 0.5) * -14px),
      calc((var(--my) - 0.5) * -14px)
    );
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .portrait-clip {
    position: relative;
    width: 100%;
    max-width: 300px;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    /* Recorte diagonal: el retrato forma parte de la composición */
    clip-path: polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%);
    background: rgba(15, 23, 42, 0.6);
  }

  .portrait-clip::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 55%, rgba(10, 7, 16, 0.55) 100%);
    pointer-events: none;
  }

  .portrait-clip img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 18%;
    display: block;
    filter: grayscale(0.25) contrast(1.05);
    transform: scale(1.04);
    transition: filter 0.5s ease, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .portrait-figure:hover .portrait-clip img {
    filter: grayscale(0) contrast(1.08);
    transform: scale(1.08);
  }

  .portrait-caption {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.6rem;
    letter-spacing: 0.16em;
    color: rgba(34, 211, 238, 0.9);
  }

  /* ── Placa central: identidad + pestañas + panel ── */
  .colophon-plate {
    display: flex;
    flex-direction: column;
    gap: clamp(0.9rem, 2vh, 1.5rem);
    min-width: 0;
  }

  .author-name {
    margin: 0;
    font-size: clamp(1.5rem, 2.6vw, 2.5rem);
    font-weight: 600;
    letter-spacing: -0.04em;
    line-height: 1.08;
    color: #f8fafc;
  }

  .author-role {
    margin: 0.4rem 0 0;
    font-size: 0.66rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #c4b5fd;
  }

  /* Pestañas: enlaces subrayados, sin contenedores */
  .plate-tabs {
    display: flex;
    gap: clamp(14px, 2vw, 28px);
    border-bottom: 1px solid rgba(148, 163, 184, 0.16);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .plate-tabs::-webkit-scrollbar {
    display: none;
  }

  .tab {
    position: relative;
    padding: 0 0 0.7rem;
    border: none;
    background: none;
    cursor: pointer;
    white-space: nowrap;
    font-family: var(--font-body, 'Geist Sans', sans-serif);
    font-size: clamp(0.8rem, 0.95vw, 0.92rem);
    font-weight: 500;
    letter-spacing: -0.01em;
    color: rgba(148, 163, 184, 0.75);
    transition: color 0.25s ease;
  }

  .tab::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    background: linear-gradient(90deg, #22d3ee, #c4b5fd);
    box-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .tab:hover {
    color: rgba(226, 232, 240, 0.95);
  }

  .tab.is-active {
    color: #f8fafc;
  }

  .tab.is-active::after {
    transform: scaleX(1);
  }

  .tab-panel {
    min-height: clamp(88px, 14vh, 130px);
  }

  .panel-body {
    margin: 0;
    color: rgba(203, 213, 225, 0.85);
    font-size: clamp(0.88rem, 1.05vw, 1rem);
    line-height: 1.65;
    max-width: 56ch;
    animation: panel-in 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @keyframes panel-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  /* ── Ledger derecho: puntos guía + filetes de skill ── */
  .colophon-ledger {
    display: flex;
    flex-direction: column;
    gap: clamp(1.2rem, 3vh, 2rem);
    min-width: 0;
  }

  .meta-list {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .meta-item {
    display: flex;
    align-items: baseline;
    font-size: 0.63rem;
    letter-spacing: 0.08em;
  }

  .meta-label {
    color: rgba(148, 163, 184, 0.6);
    white-space: nowrap;
  }

  .meta-dots {
    flex: 1;
    border-bottom: 1px dashed rgba(148, 163, 184, 0.28);
    margin: 0 0.5rem;
    transform: translateY(-2px);
  }

  .meta-val {
    color: #f8fafc;
    font-weight: 500;
    white-space: nowrap;
  }

  .skills {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(148, 163, 184, 0.14);
  }

  .skills-title {
    font-size: 0.6rem;
    letter-spacing: 0.16em;
    color: rgba(148, 163, 184, 0.55);
    margin: 0;
  }

  .skill-row {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .skill-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.61rem;
    color: rgba(226, 232, 240, 0.85);
  }

  .skill-tag {
    color: #22d3ee;
    font-weight: 600;
    letter-spacing: 0.1em;
  }

  .skill-track {
    height: 2px;
    background: rgba(148, 163, 184, 0.16);
    overflow: hidden;
  }

  .skill-fill {
    height: 100%;
    background: linear-gradient(90deg, #22d3ee, #c4b5fd);
    box-shadow: 0 0 8px rgba(34, 211, 238, 0.6);
    transform-origin: left center;
    animation: skill-grow 1.1s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes skill-grow {
    from {
      transform: scaleX(0);
    }
    to {
      transform: scaleX(1);
    }
  }

  /* ── Pie de firma ── */
  .colophon-foot {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: clamp(12px, 2vw, 22px);
    flex-shrink: 0;
    padding-top: clamp(12px, 2vh, 20px);
    border-top: 1px solid rgba(148, 163, 184, 0.14);
    font-size: 0.62rem;
    letter-spacing: 0.14em;
    color: rgba(148, 163, 184, 0.7);
  }

  .hash b {
    color: rgba(148, 163, 184, 0.55);
    font-weight: 500;
    margin-right: 0.5rem;
  }

  .foot-sep {
    flex: 1;
    height: 1px;
    background: rgba(148, 163, 184, 0.14);
  }

  .status {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    color: #6ee7b7;
  }

  .status i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #6ee7b7;
    box-shadow: 0 0 8px #6ee7b7;
    animation: status-pulse 2s ease-in-out infinite;
  }

  @keyframes status-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  /* ── MODO FLUJO ── */
  @media (max-width: 900px), (hover: none), (prefers-reduced-motion: reduce) {
    .colophon {
      height: auto;
      min-height: 100vh;
      padding: 104px 24px 56px;
    }

    .colophon-body {
      grid-template-columns: 1fr;
      gap: 30px;
      align-items: start;
      padding-block: 24px;
    }

    .portrait-clip {
      max-width: 240px;
    }

    .tab-panel {
      min-height: 0;
    }

    .watermark {
      font-size: clamp(5rem, 30vw, 10rem);
      bottom: auto;
      top: 42%;
      opacity: 0.7;
    }

    .sweep-line {
      display: none;
    }
  }
</style>
