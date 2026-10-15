<script>
  /**
   * SolutionSection — "La solución" según la spec.
   *
   * Título + texto + diagrama de flujo: evidencias → IA → perfil →
   * blockchain → identidad verificable (conectados por línea vertical).
   */
  import { reveal } from '../actions/reveal'

  const entradas = ['GitHub', 'Certificados', 'Portafolio', 'Proyectos']
  const salida = ['Perfil profesional', 'Blockchain', 'Identidad verificable']
</script>

<section id="solucion" class="solution" use:reveal>
  <div class="wrap sol-grid">
    <div class="sol-copy">
      <h2 class="display-2">Aletheia convierte tu evidencia en una identidad verificable.</h2>
      <p class="muted">
        Conecta las plataformas donde ya tienes experiencia. Aletheia analiza tu
        evidencia con inteligencia artificial, estructura tus habilidades y te
        permite certificar los logros que realmente importan mediante blockchain.
      </p>
    </div>

    <!-- diagrama de flujo -->
    <div class="flow" aria-hidden="true">
      <p class="flow-label">tus evidencias</p>
      <div class="flow-entradas">
        {#each entradas as e, i (e)}
          <span class="flow-chip" style="--i: {i}">{e}</span>
        {/each}
      </div>

      <span class="flow-line" aria-hidden="true"></span>

      <span class="flow-node node-ia">IA</span>

      <span class="flow-line" aria-hidden="true"></span>

      {#each salida as s, i (s)}
        <span class="flow-node" class:node-final={i === salida.length - 1} style="animation-delay: {i * 0.4}s">
          {s}
        </span>
        {#if i < salida.length - 1}
          <span class="flow-line" aria-hidden="true"></span>
        {/if}
      {/each}
    </div>
  </div>
</section>

<style>
  .solution {
    padding-block: var(--s-8);
    scroll-margin-top: 76px;
    border-top: 1px solid rgba(167, 139, 250, 0.08);
  }

  .wrap {
    width: min(1160px, 100% - var(--s-5) * 2);
    margin-inline: auto;
  }

  .sol-grid {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: var(--s-7);
    align-items: center;
  }

  .display-2 {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4.2vw, 3.1rem);
    font-weight: 700;
    letter-spacing: -0.035em;
    line-height: 1.08;
    margin: 0 0 var(--s-4);
    color: var(--white);
  }

  .sol-copy .muted {
    margin: 0;
    max-width: 52ch;
    font-size: 1.02rem;
    line-height: 1.65;
  }

  /* ---- diagrama de flujo vertical ---- */
  .flow {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: var(--s-5) var(--s-4);
    border: 1px solid rgba(167, 139, 250, 0.14);
    border-radius: 20px;
    background: rgba(10, 6, 22, 0.45);
    backdrop-filter: blur(12px);
  }

  .flow-label {
    margin: 0 0 2px;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.26em;
    color: var(--gray-500);
  }

  .flow-entradas {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .flow-chip {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    color: var(--gray-200);
    padding: 6px 13px;
    border: 1px solid rgba(167, 139, 250, 0.24);
    border-radius: 999px;
    background: rgba(124, 58, 237, 0.08);
  }

  .flow-line {
    width: 1px;
    height: 22px;
    background: linear-gradient(180deg, rgba(167, 139, 250, 0.55), rgba(167, 139, 250, 0.15));
  }

  .flow-node {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--gray-100);
    padding: 9px 20px;
    border: 1px solid rgba(167, 139, 250, 0.28);
    border-radius: 12px;
    background: rgba(14, 8, 30, 0.6);
    min-width: min(240px, 100%);
    text-align: center;
  }

  .node-ia {
    color: var(--white);
    border-color: rgba(196, 181, 253, 0.55);
    background: linear-gradient(160deg, rgba(124, 58, 237, 0.35), rgba(76, 29, 149, 0.4));
    box-shadow: 0 0 30px rgba(124, 58, 237, 0.25);
    font-size: 1.15rem;
    letter-spacing: 0.08em;
  }

  .node-final {
    color: #6ee7b7;
    border-color: rgba(110, 231, 183, 0.4);
  }

  @media (max-width: 860px) {
    .sol-grid {
      grid-template-columns: 1fr;
      gap: var(--s-5);
    }
  }
</style>
