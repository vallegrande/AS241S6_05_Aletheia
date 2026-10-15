<script>
  /**
   * GallerySection — presenta la galería beUI Pro (variante 1: vertical
   * de movimiento continuo) con un título editorial mínimo.
   */
  import ImageGalleryVertical from './ImageGalleryVertical.svelte'
  import { reveal } from '../actions/reveal'
</script>

<section id="galeria" class="gallery-section" use:reveal>
  <div class="wrap head">
    <p class="tag">// el flujo completo</p>
    <h2 class="display-2">De tu silo<br />a tu sello.</h2>
    <p class="muted">
      Todo lo que Aletheia hace con tu evidencia, en una pared viva —
      del encierro actual a un perfil que nadie puede discutirte.
    </p>
  </div>

  <ImageGalleryVertical />
</section>

<style>
  .gallery-section {
    padding-block: var(--s-8) 0;
  }

  .head {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    margin-bottom: var(--s-6);
    text-align: center;
    align-items: center;
  }

  .tag {
    margin: 0 0 var(--s-2);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.28em;
    color: var(--gray-400);
  }

  .tag::before {
    content: '';
    color: var(--purple-300);
  }

  .head .muted {
    max-width: 52ch;
    margin: 0;
  }
</style>
