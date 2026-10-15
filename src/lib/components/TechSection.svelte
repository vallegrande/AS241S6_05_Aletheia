<script>
  /**
   * TechSection — "IA + Blockchain" según la spec.
   *
   * Dos columnas tipográficas: IA (analiza/estructura) y Blockchain
   * (certifica/verifica), unidas por un cierre "CONFIANZA".
   */
  import Icon from './Icon.svelte'
  import { reveal } from '../actions/reveal'

  const iaItems = ['Proyectos', 'Código', 'Certificaciones', 'Portafolios', 'Contribuciones', 'Logros']
  const bcItems = [
    'No depende de una base de datos privada.',
    'Puede verificarse públicamente.',
    'Registra cuándo fue certificada.',
    'Permite comprobar que no fue alterada.',
  ]
</script>

<section id="tecnologia" class="tech" use:reveal>
  <div class="wrap">
    <h2 class="display-2">Dos tecnologías.<br /><span class="grad">Un nuevo estándar de confianza.</span></h2>

    <div class="cols">
      <!-- IA -->
      <article class="col">
        <header class="col-head">
          <span class="col-icon"><Icon name="sparkle" size={20} /></span>
          <div>
            <p class="col-kicker">inteligencia artificial</p>
            <h3>Entiende tu evidencia.</h3>
          </div>
        </header>
        <p class="col-lead">La IA analiza y transforma información dispersa en evidencia estructurada:</p>
        <ul class="col-list">
          {#each iaItems as item (item)}
            <li>{item}</li>
          {/each}
        </ul>
      </article>

      <!-- Blockchain -->
      <article class="col">
        <header class="col-head">
          <span class="col-icon"><Icon name="blocks" size={20} /></span>
          <div>
            <p class="col-kicker">blockchain</p>
            <h3>Hace verificable esa evidencia.</h3>
          </div>
        </header>
        <p class="col-lead">La huella criptográfica registrada:</p>
        <ul class="col-list">
          {#each bcItems as item (item)}
            <li><Icon name="check" size={13} /> {item}</li>
          {/each}
        </ul>
      </article>
    </div>

    <!-- cierre: confianza -->
    <div class="trust" aria-hidden="true">
      <span class="trust-line"></span>
      <span class="trust-node"><Icon name="shield" size={16} /> CONFIANZA</span>
      <span class="trust-line"></span>
    </div>
  </div>
</section>

<style>
  .tech {
    padding-block: var(--s-9);
    scroll-margin-top: 76px;
    border-top: 1px solid rgba(167, 139, 250, 0.08);
  }

  .wrap {
    width: min(1160px, 100% - var(--s-5) * 2);
    margin-inline: auto;
  }

  .display-2 {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4.4vw, 3.2rem);
    font-weight: 700;
    letter-spacing: -0.035em;
    line-height: 1.08;
    margin: 0 0 var(--s-6);
    color: var(--white);
  }

  .grad {
    color: var(--purple-300);
  }

  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-6);
  }

  .col {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    padding: var(--s-5);
    border: 1px solid rgba(167, 139, 250, 0.14);
    border-radius: 20px;
    background: rgba(10, 6, 22, 0.4);
    backdrop-filter: blur(12px);
  }

  .col-head {
    display: flex;
    align-items: center;
    gap: var(--s-3);
  }

  .col-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 13px;
    border: 1px solid rgba(167, 139, 250, 0.28);
    background: rgba(124, 58, 237, 0.12);
    color: var(--purple-300);
    flex: none;
  }

  .col-kicker {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.24em;
    color: var(--gray-500);
  }

  .col h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--white);
  }

  .col-lead {
    margin: 0;
    font-size: 0.95rem;
    color: var(--gray-300);
  }

  .col-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .col-list li {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 0.92rem;
    color: var(--gray-200);
    padding-bottom: 9px;
    border-bottom: 1px solid rgba(167, 139, 250, 0.08);
  }

  .col-list li:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  /* IA: lista simple con guiones tipográficos */
  .col:first-child .col-list li::before {
    content: '—';
    color: var(--purple-400);
    flex: none;
  }

  .col-list :global(svg) {
    color: #6ee7b7;
    flex: none;
  }

  /* ---- cierre: CONFIANZA ---- */
  .trust {
    margin-top: var(--s-6);
    display: flex;
    align-items: center;
    gap: var(--s-4);
  }

  .trust-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(110, 231, 183, 0.35), transparent);
  }

  .trust-node {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    letter-spacing: 0.3em;
    color: #6ee7b7;
    padding: 10px 22px;
    border: 1px solid rgba(110, 231, 183, 0.35);
    border-radius: 999px;
    background: rgba(110, 231, 183, 0.06);
  }

  @media (max-width: 820px) {
    .cols {
      grid-template-columns: 1fr;
    }
  }
</style>
