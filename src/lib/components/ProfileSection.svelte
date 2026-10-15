<script>
  /**
   * ProfileSection — "Perfil verificable" según la spec:
   * muestra cómo se ve una identidad de Aletheia (datos de demostración).
   */
  import ProfileCard from './ProfileCard.svelte'
  import { reveal } from '../actions/reveal'
</script>

<section id="perfil" class="prof" use:reveal>
  <div class="wrap prof-grid">
    <div class="prof-copy">
      <h2 class="display-2">Una identidad profesional<br />respaldada por evidencia.</h2>
      <p class="muted">
        Así se ve un perfil de Aletheia: habilidades con su nivel de respaldo,
        certificaciones y proyectos verificados — cada uno con su huella
        on-chain. Este es un ejemplo de demostración.
      </p>
    </div>

    <div class="prof-card-slot">
      <ProfileCard variant="full" />
    </div>
  </div>
</section>

<style>
  .prof {
    padding-block: var(--s-9);
    scroll-margin-top: 76px;
    border-top: 1px solid rgba(167, 139, 250, 0.08);
  }

  .wrap {
    width: min(1160px, 100% - var(--s-5) * 2);
    margin-inline: auto;
  }

  .prof-grid {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: var(--s-7);
    align-items: center;
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

  .prof-copy .muted {
    margin: 0;
    max-width: 48ch;
    font-size: 1.02rem;
    line-height: 1.65;
  }

  .prof-card-slot {
    display: flex;
    justify-content: center;
  }

  @media (max-width: 860px) {
    .prof-grid {
      grid-template-columns: 1fr;
      gap: var(--s-5);
    }

    .prof-card-slot {
      justify-content: flex-start;
    }
  }
</style>
