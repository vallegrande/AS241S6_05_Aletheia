<script>
  /**
   * ObjectiveProtocol — ESCENA 03 · "Índice de intención".
   *
   * Composición: un ÍNDICE EDITORIAL VERTICAL, no un diagrama.
   *   · Izquierda: declaración de intención a gran escala + la estación
   *     activa amplificada (numeral gigante + cuerpo + impacto).
   *   · Derecha: las 5 estaciones como renglones de índice separados por
   *     filetes; el renglón activo se revela con clip-path y crece.
   *   · Un filamento vertical con fotón marcar la posición del scroll.
   *   · Cero tarjetas: la jerarquía la da la escala tipográfica.
   */
  import { onMount } from 'svelte'
  import { sceneMotion, gsap, sceneProgress, stepOf } from '../scroll/scene'
  import Icon from './Icon.svelte'

  const objectives = [
    {
      num: '01',
      title: 'Centralizar evidencia',
      body: 'Reunir diferentes fuentes profesionales dispersas en una sola identidad digital unificada y coherente.',
      tag: 'UNIFICACIÓN',
      impact: 'Elimina la fragmentación de silos privados',
      icon: 'link',
    },
    {
      num: '02',
      title: 'Analizar con IA',
      body: 'Procesar proyectos, commits y certificaciones para estructurar información fidedigna sobre habilidades técnicas.',
      tag: 'EVALUACIÓN',
      impact: 'Taxonomía objetiva sin sesgos subjetivos',
      icon: 'sparkle',
    },
    {
      num: '03',
      title: 'Certificar con Blockchain',
      body: 'Registrar la evidencia seleccionada mediante huellas criptográficas inmutables y permanentes.',
      tag: 'CONSENSO',
      impact: 'Prueba matemática imposible de falsificar',
      icon: 'blocks',
    },
    {
      num: '04',
      title: 'Controlar la identidad',
      body: 'Garantizar que el usuario decida en todo momento qué atributos comparte, con quién y bajo qué condiciones.',
      tag: 'SOBERANÍA',
      impact: 'Auto-custodia y privacidad estricta por diseño',
      icon: 'shield',
    },
    {
      num: '05',
      title: 'Facilitar la contratación',
      body: 'Reducir la fricción y el costo de verificación entre profesionales y empresas que buscan talento auditado.',
      tag: 'EFICIENCIA',
      impact: 'Auditoría pública instantánea en cualquier país',
      icon: 'users',
    },
  ]

  let root = $state(null)
  let active = $state(0)
  let inspect = $state(null)
  const visible = $derived(inspect ?? active)

  onMount(() => {
    if (!root) return

    return sceneMotion(root, ({ scene }) => {
      const head = root.querySelector('.intent-head')
      const focus = root.querySelector('.intent-focus')
      const index = root.querySelector('.intent-index')

      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: scene, start: 'top bottom', end: 'top top', scrub: 0.35 },
        })
        .fromTo(head, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42 }, 0.06)
        .fromTo(focus, { x: -34, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, 0.16)
        .fromTo(index, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, 0.24)

      const trigger = sceneProgress(scene, (p) => {
        // El índice recorre sus 5 renglones hasta el 78% del scroll.
        const progress = Math.max(0, Math.min(1, (p - 0.05) / 0.75))
        root.style.setProperty('--idx', progress.toFixed(4))
        const next = stepOf(progress, objectives.length)
        if (next !== active) active = next
      })

      return () => trigger.kill()
    })
  })
</script>

<section class="intent" bind:this={root} aria-labelledby="protocol-title">
  <!-- ── COLUMNA IZQUIERDA: INTENCIÓN + ESTACIÓN AMPLIFICADA ── -->
  <div class="intent-left">
    <header class="intent-head">
      <p class="kicker mono">
        <span class="beacon" aria-hidden="true"></span>
        PROTOCOLO DE INTENCIÓN
      </p>
      <h2 id="protocol-title">Hacia dónde <em>apunta.</em></h2>
    </header>

    <div class="intent-focus" aria-live="polite">
      {#key visible}
        <div class="focus-swap">
          <div class="focus-numeral mono" aria-hidden="true">
            {objectives[visible].num}
            <span class="numeral-total">/ 05</span>
          </div>

          <p class="focus-body">{objectives[visible].body}</p>

          <div class="focus-impact mono">
            <span class="impact-mark" aria-hidden="true"></span>
            {objectives[visible].impact}
          </div>
        </div>
      {/key}
    </div>
  </div>

  <!-- ── COLUMNA DERECHA: ÍNDICE DE 5 RENGLONES ── -->
  <div class="intent-index" role="group" aria-label="Cinco estaciones de intención">
    <div class="index-filament" aria-hidden="true">
      <span class="filament-fill"></span>
      <span class="filament-photon"></span>
    </div>

    {#each objectives as obj, i (obj.num)}
      <button
        type="button"
        class="index-row"
        class:is-active={visible === i}
        class:is-past={active > i}
        onclick={() => (inspect = inspect === i ? null : i)}
        onpointerenter={() => (inspect = i)}
        onpointerleave={() => (inspect = null)}
        aria-label={`Estación ${obj.num}: ${obj.title}`}
      >
        <span class="row-num mono">{obj.num}</span>

        <span class="row-main">
          <span class="row-title">{obj.title}</span>
          <span class="row-tag mono">{obj.tag}</span>
        </span>

        <span class="row-icon" aria-hidden="true"><Icon name={obj.icon} size={18} /></span>
      </button>
    {/each}
  </div>
</section>

<style>
  /* ── Escenario ── */
  .intent {
    --idx: 0;
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: clamp(94px, 13vh, 138px) clamp(26px, 6vw, 88px) clamp(44px, 6vh, 68px);
    display: grid;
    grid-template-columns: minmax(300px, 0.9fr) minmax(0, 1.1fr);
    gap: clamp(40px, 7vw, 110px);
    align-items: center;
    overflow: hidden;
    isolation: isolate;
  }

  .mono {
    font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace);
  }

  .intent::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(52% 46% at 78% 26%, rgba(251, 191, 36, 0.07), transparent 72%),
      radial-gradient(58% 50% at 14% 78%, rgba(167, 139, 250, 0.1), transparent 72%);
    pointer-events: none;
  }

  /* ── Izquierda ── */
  .intent-left {
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
    font-size: 0.66rem;
    letter-spacing: 0.22em;
    color: #fbbf24;
  }

  .beacon {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fbbf24;
    box-shadow: 0 0 10px #fbbf24, 0 0 20px rgba(251, 191, 36, 0.6);
  }

  .intent-head h2 {
    margin: 14px 0 0;
    font-size: clamp(2.3rem, 4.2vw, 4.4rem);
    font-weight: 600;
    line-height: 1.02;
    letter-spacing: -0.05em;
    color: #f8fafc;
  }

  .intent-head h2 em {
    font-style: normal;
    background: linear-gradient(105deg, #fbbf24, #c4b5fd 55%, #22d3ee);
    background-size: 260% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: intent-sheen 8s ease-in-out infinite;
  }

  @keyframes intent-sheen {
    0%,
    100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }

  .intent-focus {
    min-height: clamp(150px, 24vh, 210px);
  }

  .focus-swap {
    animation: focus-in 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  @keyframes focus-in {
    from {
      opacity: 0;
      transform: translateY(14px);
      filter: blur(4px);
    }
    to {
      opacity: 1;
      transform: none;
      filter: blur(0);
    }
  }

  .focus-numeral {
    font-size: clamp(2.6rem, 5vw, 4.6rem);
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.04em;
    color: #fbbf24;
    text-shadow: 0 0 34px rgba(251, 191, 36, 0.35);
  }

  .numeral-total {
    font-size: 0.32em;
    letter-spacing: 0.14em;
    color: rgba(148, 163, 184, 0.55);
    vertical-align: 0.9em;
    margin-left: 0.4em;
  }

  .focus-body {
    margin: 0;
    color: rgba(203, 213, 225, 0.88);
    font-size: clamp(0.98rem, 1.3vw, 1.2rem);
    line-height: 1.6;
    max-width: 40ch;
  }

  .focus-impact {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(251, 191, 36, 0.9);
  }

  .impact-mark {
    width: 22px;
    height: 1px;
    background: #fbbf24;
    box-shadow: 0 0 8px #fbbf24;
  }

  /* ── Derecha: índice de renglones ── */
  .intent-index {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-left: clamp(26px, 3vw, 44px);
  }

  /* Filamento vertical con fotón de posición */
  .index-filament {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(196, 181, 253, 0.14);
  }

  .filament-fill {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: calc(var(--idx) * 100%);
    background: linear-gradient(180deg, #fbbf24, #c4b5fd 60%, #22d3ee);
    box-shadow: 0 0 12px rgba(251, 191, 36, 0.6);
  }

  .filament-photon {
    position: absolute;
    left: 50%;
    top: calc(var(--idx) * 100%);
    width: 9px;
    height: 9px;
    margin: -4.5px 0 0 -4.5px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 12px #fff, 0 0 22px #fbbf24;
  }

  .index-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: clamp(14px, 1.6vw, 26px);
    width: 100%;
    padding: clamp(14px, 2.2vh, 22px) 0;
    border: none;
    border-bottom: 1px solid rgba(196, 181, 253, 0.12);
    background: transparent;
    cursor: pointer;
    text-align: left;
    color: inherit;
    opacity: 0.45;
    transition: opacity 0.35s ease, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .index-row:first-of-type {
    border-top: 1px solid rgba(196, 181, 253, 0.12);
  }

  .index-row:hover {
    opacity: 0.8;
  }

  .index-row.is-active {
    opacity: 1;
    transform: translateX(14px);
  }

  .row-num {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: rgba(148, 163, 184, 0.6);
    transition: color 0.3s ease, text-shadow 0.3s ease;
    flex-shrink: 0;
    width: 2.2em;
  }

  .index-row.is-active .row-num {
    color: #fbbf24;
    text-shadow: 0 0 16px rgba(251, 191, 36, 0.55);
  }

  .row-main {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    flex: 1;
    min-width: 0;
  }

  .row-title {
    font-family: var(--font-display, 'Geist Sans', sans-serif);
    font-size: clamp(1.15rem, 2vw, 1.9rem);
    font-weight: 600;
    letter-spacing: -0.035em;
    line-height: 1.1;
    color: rgba(248, 250, 252, 0.62);
    transition: color 0.3s ease, letter-spacing 0.4s ease;
  }

  .index-row.is-active .row-title {
    color: #f8fafc;
    letter-spacing: -0.02em;
  }

  .row-tag {
    font-size: 0.58rem;
    letter-spacing: 0.18em;
    color: rgba(148, 163, 184, 0.55);
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease;
  }

  .index-row.is-active .row-tag {
    max-height: 2em;
    opacity: 1;
    color: rgba(251, 191, 36, 0.85);
  }

  .row-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1px solid rgba(196, 181, 253, 0.22);
    color: rgba(148, 163, 184, 0.6);
    flex-shrink: 0;
    transform: scale(0.85);
    transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .index-row.is-active .row-icon {
    border-color: #fbbf24;
    color: #fbbf24;
    transform: scale(1);
    box-shadow: 0 0 22px rgba(251, 191, 36, 0.3), inset 0 0 14px rgba(251, 191, 36, 0.12);
  }

  .index-row.is-past .row-num {
    color: rgba(196, 181, 253, 0.8);
  }

  /* ── MODO FLUJO ── */
  @media (max-width: 900px), (hover: none), (prefers-reduced-motion: reduce) {
    .intent {
      height: auto;
      min-height: 100vh;
      padding: 104px 24px 60px;
      grid-template-columns: 1fr;
      gap: 40px;
      align-items: start;
    }

    .intent-focus {
      min-height: 0;
    }

    .intent-index {
      padding-left: 22px;
    }

    .index-row {
      opacity: 1;
    }

    .row-title {
      color: rgba(248, 250, 252, 0.9);
    }

    .row-tag {
      max-height: 2em;
      opacity: 1;
    }

    .row-icon {
      display: none;
    }
  }
</style>
