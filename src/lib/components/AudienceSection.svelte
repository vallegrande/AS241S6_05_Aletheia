<script>
  /**
   * AudienceSection — "Para profesionales" + "Para empresas" según la spec.
   *
   * Dos mitades contrastadas: la del profesional en tono morado, la de
   * empresas en tono neutro; cada una con sus beneficios y CTA propio.
   */
  import Icon from './Icon.svelte'
  import { reveal } from '../actions/reveal'

  const pros = [
    { title: 'Construye reputación desde cero', body: 'No necesitas una larga trayectoria corporativa para demostrar lo que sabes hacer.' },
    { title: 'Centraliza tu experiencia', body: 'Una identidad para tus proyectos, certificaciones y logros.' },
    { title: 'Demuestra, no declares', body: 'Presenta evidencia verificable en lugar de depender únicamente de un CV.' },
    { title: 'Comparte fácilmente', body: 'Un solo enlace para mostrar tu identidad profesional.' },
    { title: 'Lleva tu reputación contigo', body: 'Tu identidad no debería desaparecer porque cambias de plataforma.' },
  ]

  const empresas = [
    { icon: 'search', title: 'Descubre', body: 'Encuentra profesionales según sus habilidades.' },
    { icon: 'check', title: 'Verifica', body: 'Comprueba credenciales y evidencia.' },
    { icon: 'zap', title: 'Reduce fricción', body: 'Obtén información estructurada antes de iniciar una evaluación.' },
    { icon: 'link', title: 'Integra', body: 'Utiliza APIs de verificación dentro de tus propios procesos.' },
  ]

  function goToPanel() {
    location.hash = '#/panel'
  }
</script>

<section id="profesionales" class="aud">
  <!-- ====== PARA PROFESIONALES ====== -->
  <div class="side pro" use:reveal>
    <div class="wrap">
      <p class="side-kicker">para profesionales</p>
      <h2 class="display-2">Haz que tu trabajo<br />hable por ti.</h2>

      <ul class="ben-list">
        {#each pros as b (b.title)}
          <li>
            <Icon name="check" size={15} />
            <div>
              <h3>{b.title}</h3>
              <p class="muted">{b.body}</p>
            </div>
          </li>
        {/each}
      </ul>

      <button class="side-cta cta-pro" onclick={goToPanel}>
        Construir mi identidad <Icon name="arrow" size={15} />
      </button>
    </div>
  </div>

  <!-- ====== PARA EMPRESAS ====== -->
  <div class="side emp" id="empresas" use:reveal>
    <div class="wrap">
      <p class="side-kicker">para empresas</p>
      <h2 class="display-2">Encuentra talento.<br />Verifica sus habilidades.</h2>
      <p class="side-text muted">
        Aletheia permite a empresas y reclutadores consultar evidencia
        profesional verificable y reducir el tiempo necesario para validar candidatos.
      </p>

      <div class="emp-grid">
        {#each empresas as e (e.title)}
          <article class="emp-card">
            <span class="emp-icon"><Icon name={e.icon} size={18} /></span>
            <h3>{e.title}</h3>
            <p class="muted">{e.body}</p>
          </article>
        {/each}
      </div>

      <button class="side-cta cta-emp" onclick={goToPanel}>
        Ver soluciones para empresas <Icon name="arrow" size={15} />
      </button>
    </div>
  </div>
</section>

<style>
  .aud {
    border-top: 1px solid rgba(167, 139, 250, 0.08);
  }

  .side {
    padding-block: var(--s-8);
    scroll-margin-top: 76px;
  }

  .wrap {
    width: min(1160px, 100% - var(--s-5) * 2);
    margin-inline: auto;
  }

  .side-kicker {
    margin: 0 0 var(--s-3);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.28em;
    color: var(--gray-500);
  }

  .display-2 {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4.4vw, 3.2rem);
    font-weight: 700;
    letter-spacing: -0.035em;
    line-height: 1.06;
    margin: 0 0 var(--s-4);
    color: var(--white);
  }

  /* ====== profesionales: bloque morado con lista ====== */
  .pro {
    background:
      radial-gradient(900px 480px at 12% 20%, rgba(124, 58, 237, 0.14), transparent 65%);
  }

  .ben-list {
    list-style: none;
    margin: var(--s-5) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    max-width: 640px;
  }

  .ben-list li {
    display: flex;
    gap: var(--s-3);
    padding-block: var(--s-3);
    border-bottom: 1px solid rgba(167, 139, 250, 0.1);
  }

  .ben-list li :global(svg) {
    color: var(--purple-300);
    margin-top: 4px;
    flex: none;
  }

  .ben-list h3 {
    margin: 0 0 3px;
    font-family: var(--font-display);
    font-size: 1.08rem;
    font-weight: 600;
    color: var(--white);
  }

  .ben-list .muted {
    margin: 0;
    font-size: 0.92rem;
    line-height: 1.55;
  }

  /* ====== empresas: grid de tarjetas ====== */
  .side-text {
    margin: 0;
    max-width: 56ch;
    font-size: 1rem;
    line-height: 1.6;
  }

  .emp-grid {
    margin-top: var(--s-5);
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--s-3);
  }

  .emp-card {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    padding: var(--s-4);
    border: 1px solid rgba(167, 139, 250, 0.14);
    border-radius: 16px;
    background: rgba(10, 6, 22, 0.4);
    backdrop-filter: blur(10px);
  }

  .emp-icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 11px;
    border: 1px solid rgba(167, 139, 250, 0.26);
    background: rgba(124, 58, 237, 0.1);
    color: var(--purple-300);
  }

  .emp-card h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    color: var(--white);
  }

  .emp-card .muted {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  /* ====== CTAs ====== */
  .side-cta {
    margin-top: var(--s-5);
    display: inline-flex;
    align-items: center;
    gap: 9px;
    min-height: 46px;
    padding: 0 24px;
    border-radius: 999px;
    font-family: var(--font-display);
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .cta-pro {
    border: 1px solid transparent;
    background: linear-gradient(180deg, #a78bfa, #7c3aed);
    color: var(--white);
    box-shadow: 0 8px 28px rgba(124, 58, 237, 0.35);
  }

  .cta-pro:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 36px rgba(124, 58, 237, 0.45);
  }

  .cta-emp {
    border: 1px solid rgba(167, 139, 250, 0.4);
    background: transparent;
    color: var(--purple-200, #ddd6fe);
  }

  .cta-emp:hover {
    border-color: rgba(196, 181, 253, 0.7);
  }

  @media (max-width: 900px) {
    .emp-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 540px) {
    .emp-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
