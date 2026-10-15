<script>
  /**
   * OwnershipSection — "Tu identidad te pertenece" (Beneficios) según spec.
   */
  import Icon from './Icon.svelte'
  import { reveal } from '../actions/reveal'

  const beneficios = [
    { icon: 'lock', title: 'Control', body: 'Tú decides qué información compartir.' },
    { icon: 'globe', title: 'Portabilidad', body: 'Lleva tu identidad contigo.' },
    { icon: 'eye', title: 'Verificabilidad', body: 'Terceros pueden comprobar la evidencia sin depender únicamente de tu palabra.' },
  ]
</script>

<section id="beneficios" class="own" use:reveal>
  <div class="wrap">
    <h2 class="display-2">Tu reputación no debería<br />pertenecer a una plataforma.</h2>
    <p class="muted own-text">
      Aletheia está diseñada para que puedas construir, controlar y compartir tu
      identidad profesional sin quedar atado a una única plataforma.
    </p>

    <div class="grid">
      {#each beneficios as b, i (b.title)}
        <article class="ben" style="--i: {i}">
          <span class="ben-icon"><Icon name={b.icon} size={20} /></span>
          <h3>{b.title}</h3>
          <p class="muted">{b.body}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .own {
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
    margin: 0 0 var(--s-4);
    color: var(--white);
  }

  .own-text {
    margin: 0;
    max-width: 54ch;
    font-size: 1.02rem;
    line-height: 1.65;
  }

  .grid {
    margin-top: var(--s-6);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--s-4);
  }

  .ben {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    padding: var(--s-4);
    border-top: 2px solid var(--purple-700);
    background: linear-gradient(180deg, rgba(124, 58, 237, 0.06), transparent 70%);
  }

  .ben-icon {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: 1px solid rgba(167, 139, 250, 0.26);
    background: rgba(124, 58, 237, 0.1);
    color: var(--purple-300);
  }

  .ben h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--white);
  }

  .ben .muted {
    margin: 0;
    font-size: 0.94rem;
    line-height: 1.55;
  }

  @media (max-width: 780px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
