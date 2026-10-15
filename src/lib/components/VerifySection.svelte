<script>
  /**
   * VerifySection — "¿Qué puedes verificar?" según la spec.
   *
   * Título + 6 categorías en grid 3×2 con icono SVG (NUNCA emoji).
   */
  import Icon from './Icon.svelte'
  import { reveal } from '../actions/reveal'

  const categorias = [
    { icon: 'code', title: 'Proyectos', body: 'Demuestra tu experiencia desarrollando proyectos reales.' },
    { icon: 'award', title: 'Certificaciones', body: 'Verifica cursos, certificaciones y formación profesional.' },
    { icon: 'image', title: 'Portafolio', body: 'Convierte tus trabajos creativos en evidencia estructurada.' },
    { icon: 'gamepad', title: 'Logros', body: 'Demuestra resultados y logros competitivos.' },
    { icon: 'rocket', title: 'Freelance', body: 'Construye un historial profesional portable.' },
    { icon: 'book', title: 'Contribuciones', body: 'Haz visible tu participación en proyectos y comunidades.' },
  ]
</script>

<section id="verificar" class="verify" use:reveal>
  <div class="wrap">
    <h2 class="display-2">
      No importa dónde construiste tu experiencia.<br />
      <span class="grad">Podemos convertirla en evidencia.</span>
    </h2>

    <div class="grid">
      {#each categorias as c, i (c.title)}
        <article class="cat" style="--i: {i}">
          <span class="cat-icon"><Icon name={c.icon} size={22} /></span>
          <h3>{c.title}</h3>
          <p class="muted">{c.body}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .verify {
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
    font-size: clamp(1.9rem, 4vw, 3rem);
    font-weight: 700;
    letter-spacing: -0.035em;
    line-height: 1.1;
    margin: 0 0 var(--s-6);
    color: var(--white);
  }

  .grad {
    color: var(--purple-300);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--s-4);
  }

  .cat {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    padding: var(--s-4);
    border: 1px solid rgba(167, 139, 250, 0.14);
    border-radius: 18px;
    background: rgba(10, 6, 22, 0.4);
    backdrop-filter: blur(10px);
    transition: border-color 0.25s ease, transform 0.25s ease;
  }

  .cat:hover {
    border-color: rgba(167, 139, 250, 0.4);
    transform: translateY(-3px);
  }

  .cat-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 13px;
    border: 1px solid rgba(167, 139, 250, 0.28);
    background: rgba(124, 58, 237, 0.12);
    color: var(--purple-300);
  }

  .cat h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--white);
  }

  .cat .muted {
    margin: 0;
    font-size: 0.92rem;
    line-height: 1.55;
  }

  @media (max-width: 900px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 580px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
