<script>
  /**
   * ClosingSection — Integraciones + FAQ + CTA final según la spec.
   *
   *   1. Integraciones: fuentes existentes/futuras (honestidad: solo
   *      presentamos como activo lo implementado).
   *   2. FAQ: acordeón accesible con las 6 preguntas de la spec.
   *   3. Roadmap de 4 fases sin fechas.
   *   4. CTA final.
   */
  import { slide } from 'svelte/transition'
  import Icon from './Icon.svelte'
  import { reveal } from '../actions/reveal'

  const activas = ['GitHub']
  const futuras = ['Figma', 'LinkedIn', 'Coursera', 'Udemy', 'Workana', 'Gaming', 'Certificadores educativos']

  const faqs = [
    {
      q: '¿Necesito saber de criptomonedas?',
      a: 'No. Aletheia abstrae la complejidad de blockchain para que puedas utilizar la plataforma sin conocimientos técnicos.',
    },
    {
      q: '¿Tengo que pagar para crear mi identidad?',
      a: 'Aletheia puede ofrecer un nivel gratuito para construir el perfil y planes premium con funciones avanzadas.',
    },
    {
      q: '¿Dónde se almacena mi información?',
      a: 'La información privada se mantiene fuera de blockchain. La cadena almacena únicamente los registros necesarios para verificar la certificación.',
    },
    {
      q: '¿Puedo decidir qué información compartir?',
      a: 'Sí. La privacidad y el control del usuario forman parte central de Aletheia.',
    },
    {
      q: '¿Qué pasa si Aletheia deja de existir?',
      a: 'Los registros almacenados en una blockchain pública pueden continuar siendo verificables independientemente de la plataforma, siempre que el diseño de los contratos y los mecanismos de acceso lo permitan.',
    },
    {
      q: '¿La IA certifica que soy bueno?',
      a: 'No. La IA analiza y estructura evidencia. La certificación representa qué evidencia fue registrada y bajo qué condiciones; no constituye por sí sola una garantía absoluta de competencia.',
    },
  ]

  const roadmap = [
    { fase: '01', nombre: 'MVP', items: ['Perfil IA', 'GitHub', 'Verificación'] },
    { fase: '02', nombre: 'Identidad verificable', items: ['Credenciales', 'Blockchain', 'Wallet'] },
    { fase: '03', nombre: 'Marketplace', items: ['Freelance', 'Empresas', 'Matching'] },
    { fase: '04', nombre: 'Ecosistema', items: ['APIs', 'Instituciones', 'Integraciones'] },
  ]

  let open = $state(-1)

  function toggle(i) {
    open = open === i ? -1 : i
  }

  function goToPanel() {
    location.hash = '#/panel'
  }
</script>

<!-- ====== INTEGRACIONES ====== -->
<section id="integraciones" class="integ" use:reveal>
  <div class="wrap">
    <h2 class="display-2">Tu experiencia ya existe.<br /><span class="grad">Aletheia la conecta.</span></h2>

    <div class="src-row">
      {#each activas as f (f)}
        <span class="src src-activa"><Icon name="check" size={13} /> {f}</span>
      {/each}
      {#each futuras as f (f)}
        <span class="src src-futura">{f}</span>
      {/each}
    </div>
    <p class="src-note muted small">GitHub ya está integrado. Las demás fuentes llegan en las próximas fases.</p>
  </div>
</section>

<!-- ====== FAQ ====== -->
<section id="faq" class="faq">
  <div class="wrap wrap-narrow" use:reveal>
    <h2 class="display-2">Preguntas frecuentes</h2>

    <div class="faq-list">
      {#each faqs as f, i (f.q)}
        <div class="faq-item" class:open={open === i}>
          <button
            class="faq-q"
            onclick={() => toggle(i)}
            aria-expanded={open === i}
            aria-controls={'faq-a' + i}
          >
            <span>{f.q}</span>
            <span class="faq-x" aria-hidden="true"><Icon name={open === i ? 'x' : 'arrow'} size={16} /></span>
          </button>
          {#if open === i}
            <p class="faq-a" id={'faq-a' + i} transition:slide={{ duration: 220 }}>{f.a}</p>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ====== ROADMAP ====== -->
<section class="road" use:reveal>
  <div class="wrap">
    <h2 class="display-2">Construyendo la próxima capa<br />de identidad profesional.</h2>

    <ol class="road-line">
      {#each roadmap as r, i (r.fase)}
        <li class="road-step" style="--i: {i}">
          <span class="road-dot" aria-hidden="true"></span>
          <span class="road-fase">{r.fase}</span>
          <span class="road-nombre">{r.nombre}</span>
          <span class="road-items">{r.items.join(' · ')}</span>
        </li>
      {/each}
    </ol>
  </div>
</section>

<!-- ====== CTA FINAL ====== -->
<section class="final" use:reveal>
  <div class="wrap final-inner">
    <h2 class="display-1">Tu trabajo ya tiene valor.<br /><span class="grad">Ahora hazlo verificable.</span></h2>
    <p class="muted">
      Construye una identidad profesional que reúna tu experiencia, tus logros
      y tus habilidades en un solo lugar.
    </p>
    <div class="final-ctas">
      <button class="cta-primary" onclick={goToPanel}>
        Crear mi identidad <Icon name="arrow" size={15} />
      </button>
      <a class="cta-ghost" href="#inicio">Explorar Aletheia</a>
    </div>
  </div>
</section>

<style>
  .integ,
  .faq,
  .road,
  .final {
    padding-block: var(--s-8);
    scroll-margin-top: 76px;
  }

  .integ,
  .road,
  .final {
    border-top: 1px solid rgba(167, 139, 250, 0.08);
  }

  .wrap {
    width: min(1160px, 100% - var(--s-5) * 2);
    margin-inline: auto;
  }

  .wrap-narrow {
    width: min(780px, 100% - var(--s-5) * 2);
  }

  .display-1,
  .display-2 {
    font-family: var(--font-display);
    font-weight: 700;
    letter-spacing: -0.035em;
    line-height: 1.08;
    margin: 0 0 var(--s-4);
    color: var(--white);
  }

  .display-1 {
    font-size: clamp(2.2rem, 5vw, 3.6rem);
  }

  .display-2 {
    font-size: clamp(1.8rem, 3.8vw, 2.7rem);
  }

  .grad {
    color: var(--purple-300);
  }

  /* ====== integraciones ====== */
  .src-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: var(--s-4);
  }

  .src {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    padding: 9px 16px;
    border-radius: 999px;
    border: 1px solid rgba(167, 139, 250, 0.22);
    background: rgba(14, 8, 30, 0.5);
    color: var(--gray-300);
  }

  .src-activa {
    color: var(--white);
    border-color: rgba(110, 231, 183, 0.45);
    background: rgba(110, 231, 183, 0.07);
  }

  .src-activa :global(svg) {
    color: #6ee7b7;
  }

  .src-futura {
    opacity: 0.55;
    border-style: dashed;
  }

  .src-note {
    margin: var(--s-2) 0 0;
  }

  /* ====== FAQ ====== */
  .faq-list {
    margin-top: var(--s-4);
    display: flex;
    flex-direction: column;
    border-top: 1px solid rgba(167, 139, 250, 0.12);
  }

  .faq-item {
    border-bottom: 1px solid rgba(167, 139, 250, 0.12);
  }

  .faq-q {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    padding: var(--s-3) 0;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: var(--font-display);
    font-size: 1.02rem;
    font-weight: 600;
    color: var(--gray-100);
    transition: color 0.2s ease;
  }

  .faq-q:hover {
    color: var(--white);
  }

  .faq-q:focus-visible {
    outline: 2px solid var(--purple-400);
    outline-offset: 2px;
  }

  .faq-x {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 999px;
    border: 1px solid rgba(167, 139, 250, 0.25);
    color: var(--purple-300);
    flex: none;
    transition: transform 0.2s ease;
  }

  .faq-item.open .faq-x {
    transform: rotate(90deg);
  }

  .faq-a {
    margin: 0 0 var(--s-3);
    max-width: 62ch;
    color: var(--gray-300);
    line-height: 1.6;
  }

  /* ====== roadmap ====== */
  .road-line {
    list-style: none;
    margin: var(--s-5) 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--s-4);
    counter-reset: step;
  }

  .road-step {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: var(--s-4);
  }

  .road-step::before {
    content: '';
    position: absolute;
    top: 5px;
    left: 14px;
    right: 0;
    height: 1px;
    background: rgba(167, 139, 250, 0.2);
  }

  .road-step:last-child::before {
    background: linear-gradient(90deg, rgba(167, 139, 250, 0.2), transparent);
  }

  .road-dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 2px solid var(--purple-400);
    background: var(--ink-900, #0d0518);
    box-shadow: 0 0 12px rgba(124, 58, 237, 0.5);
    margin-bottom: 4px;
  }

  .road-fase {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.2em;
    color: var(--purple-300);
  }

  .road-nombre {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--white);
  }

  .road-items {
    font-size: 0.82rem;
    color: var(--gray-400);
    line-height: 1.5;
  }

  /* ====== CTA final ====== */
  .final {
    padding-block: var(--s-9);
  }

  .final-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--s-4);
  }

  .final .muted {
    margin: 0;
    max-width: 52ch;
  }

  .final-ctas {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    flex-wrap: wrap;
    justify-content: center;
    margin-top: var(--s-2);
  }

  .cta-primary {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    min-height: 48px;
    padding: 0 26px;
    border-radius: 999px;
    border: 1px solid transparent;
    background: linear-gradient(180deg, #a78bfa, #7c3aed);
    color: var(--white);
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 8px 28px rgba(124, 58, 237, 0.35);
    transition: transform 0.15s ease, box-shadow 0.2s ease;
  }

  .cta-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 36px rgba(124, 58, 237, 0.45);
  }

  .cta-ghost {
    display: inline-flex;
    align-items: center;
    min-height: 48px;
    padding: 0 24px;
    border-radius: 999px;
    border: 1px solid rgba(167, 139, 250, 0.35);
    color: var(--purple-200, #ddd6fe);
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 600;
    text-decoration: none;
    transition: border-color 0.2s ease;
  }

  .cta-ghost:hover {
    border-color: rgba(196, 181, 253, 0.65);
  }

  @media (max-width: 860px) {
    .road-line {
      grid-template-columns: 1fr;
      gap: var(--s-5);
    }

    .road-step::before {
      display: none;
    }
  }
</style>
