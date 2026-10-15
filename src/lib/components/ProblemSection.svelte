<script>
  /**
   * ProblemSection — "El problema" según la spec de Aletheia.
   *
   * Estructura: título + texto, 4 problemas como columnas tipográficas
   * (sin cards decorativas) y el diagrama de silos que confluyen en
   * la pregunta "¿Quién eres profesionalmente?".
   */
  import Icon from './Icon.svelte'
  import { reveal } from '../actions/reveal'

  const fuentes = ['GitHub', 'LinkedIn', 'Certificados', 'Portafolio', 'Gaming']

  const problemas = [
    {
      icon: 'blocks',
      title: 'Identidad fragmentada',
      body: 'Tu experiencia está distribuida entre múltiples plataformas.',
    },
    {
      icon: 'search',
      title: 'Difícil de verificar',
      body: 'Un CV puede afirmar cualquier cosa. Verificar evidencia requiere tiempo.',
    },
    {
      icon: 'building',
      title: 'Dependencia de plataformas',
      body: 'Tu reputación queda vinculada a empresas y plataformas externas.',
    },
    {
      icon: 'share',
      title: 'Sin portabilidad',
      body: 'Cambiar de plataforma significa empezar a reconstruir tu reputación.',
    },
  ]
</script>

<section id="problema" class="problem">
  <div class="wrap" use:reveal>
    <h2 class="display-2">Tu talento está en todas partes.<br />Tu reputación también.</h2>
    <p class="prob-text">
      Tus proyectos están en GitHub. Tus certificados en diferentes plataformas.
      Tu portafolio en otra. Tus logros en videojuegos en otra. Tu experiencia
      freelance en otra.
    </p>
    <p class="prob-strong">Ninguna de ellas construye una identidad profesional que realmente te pertenezca.</p>
  </div>

  <!-- diagrama: fuentes que confluyen -->
  <div class="wrap diagram" use:reveal aria-hidden="true">
    <div class="d-fuentes">
      {#each fuentes as f, i (f)}
        <span class="d-fuente" style="--i: {i}">{f}</span>
      {/each}
    </div>
    <div class="d-lines" aria-hidden="true">
      {#each fuentes as _, i (i)}
        <span class="d-line" style="--i: {i}"></span>
      {/each}
    </div>
    <p class="d-q">¿Quién eres<br />profesionalmente?</p>
  </div>

  <!-- 4 problemas -->
  <div class="wrap grid" use:reveal>
    {#each problemas as p, i (p.title)}
      <article class="prob" style="--i: {i}">
        <span class="prob-icon"><Icon name={p.icon} size={20} /></span>
        <h3>{p.title}</h3>
        <p class="muted">{p.body}</p>
      </article>
    {/each}
  </div>
</section>

<style>
  .problem {
    padding-block: var(--s-9) var(--s-8);
    scroll-margin-top: 76px;
  }

  .wrap {
    width: min(1160px, 100% - var(--s-5) * 2);
    margin-inline: auto;
  }

  .display-2 {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4.6vw, 3.4rem);
    font-weight: 700;
    letter-spacing: -0.035em;
    line-height: 1.06;
    margin: 0 0 var(--s-4);
    color: var(--white);
  }

  .prob-text {
    margin: 0 0 var(--s-2);
    max-width: 60ch;
    font-size: 1.05rem;
    line-height: 1.65;
    color: var(--gray-300);
  }

  .prob-strong {
    margin: 0;
    max-width: 56ch;
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--purple-200, #ddd6fe);
  }

  /* ---- diagrama: fuentes → pregunta ---- */
  .diagram {
    margin-block: var(--s-7);
    display: grid;
    grid-template-columns: 1fr minmax(180px, 240px);
    align-items: center;
    gap: 0;
  }

  .d-fuentes {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    align-items: flex-start;
  }

  .d-fuente {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--gray-300);
    padding: 8px 16px;
    border: 1px solid rgba(167, 139, 250, 0.2);
    border-radius: 999px;
    background: rgba(14, 8, 30, 0.5);
  }

  .d-lines {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
  }

  .d-line {
    height: 1px;
    background: linear-gradient(90deg, rgba(167, 139, 250, 0.4), rgba(167, 139, 250, 0.08));
    margin-block: calc(var(--s-2) + 14px);
    transform-origin: right center;
  }

  .d-q {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(1.3rem, 2.6vw, 1.9rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.15;
    color: var(--white);
  }

  /* ---- grid de problemas ---- */
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--s-5);
    margin-top: var(--s-7);
  }

  .prob {
    border-top: 1px solid rgba(167, 139, 250, 0.2);
    padding-top: var(--s-3);
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }

  .prob-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    border: 1px solid rgba(167, 139, 250, 0.25);
    background: rgba(124, 58, 237, 0.1);
    color: var(--purple-300);
  }

  .prob h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--white);
  }

  .prob .muted {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.55;
  }

  @media (max-width: 900px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .diagram {
      grid-template-columns: 1fr;
      gap: var(--s-4);
    }

    .d-lines {
      display: none;
    }

    .d-fuente {
      margin-right: auto;
    }
  }

  @media (max-width: 560px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
