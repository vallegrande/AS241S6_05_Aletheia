<script>
  /**
   * ProfileCard — la tarjeta de identidad verificada de la spec.
   *
   *   compact  → para el Hero (identidad + habilidades con puntos + checks)
   *   full     → sección "Perfil verificable" (barras, certificaciones, proyectos)
   *
   * Todo el contenido es de DEMOSTRACIÓN (datos ficticios de ejemplo),
   * presentado como mock del producto, no como usuario real.
   */
  import Icon from './Icon.svelte'

  let { variant = 'compact' } = $props()

  const compactSkills = [
    { name: 'Python', level: 4 },
    { name: 'Java', level: 5 },
    { name: 'React', level: 4 },
    { name: 'Spring Boot', level: 5 },
  ]

  const fullSkills = [
    { name: 'Java', bars: 9, tag: 'Verificado' },
    { name: 'Spring Boot', bars: 10, tag: 'Verificado' },
    { name: 'React', bars: 8, tag: 'Evidencia' },
    { name: 'Docker', bars: 8, tag: 'Evidencia' },
  ]

  const certifications = ['Kubernetes', 'Cloud']
  const projects = ['EduNova', 'Project X']
</script>

{#if variant === 'compact'}
  <!-- ============ variante HERO ============ -->
  <article class="pcard" aria-label="Ejemplo de identidad verificada en Aletheia">
    <p class="pcard-status"><Icon name="shield" size={13} /> Identidad verificada</p>

    <header class="pcard-head">
      <h3 class="pcard-name">Carlos Caycho</h3>
      <p class="pcard-role">Software Developer</p>
    </header>

    <div class="pcard-sep" aria-hidden="true"></div>

    <ul class="pcard-skills">
      {#each compactSkills as s (s.name)}
        <li>
          <span class="sk-name">{s.name}</span>
          <span class="sk-dots" aria-label="{s.level} de 5">
            {#each Array(5) as _, i (i)}
              <span class="dot" class:on={i < s.level} aria-hidden="true"></span>
            {/each}
          </span>
        </li>
      {/each}
    </ul>

    <ul class="pcard-proof">
      <li><Icon name="check" size={13} /> 12 proyectos verificados</li>
      <li><Icon name="check" size={13} /> 4 certificaciones</li>
      <li><Icon name="check" size={13} /> GitHub conectado</li>
    </ul>

    <button class="pcard-btn" type="button">Ver identidad</button>
  </article>
{:else}
  <!-- ============ variante COMPLETA ============ -->
  <article class="pcard pcard-full" aria-label="Ejemplo de perfil verificable en Aletheia">
    <p class="pcard-status"><Icon name="shield" size={13} /> Identidad verificada</p>

    <header class="pcard-head">
      <h3 class="pcard-name pcard-name-lg">Carlos Caycho</h3>
      <p class="pcard-role">Software Developer</p>
    </header>

    <div class="pcard-sep" aria-hidden="true"></div>

    <p class="pcard-label">Habilidades</p>
    <ul class="pcard-bars">
      {#each fullSkills as s (s.name)}
        <li>
          <span class="sk-name">{s.name}</span>
          <span class="bar" aria-hidden="true">
            {#each Array(10) as _, i (i)}
              <span class="seg" class:on={i < s.bars}></span>
            {/each}
          </span>
          <span class="sk-tag" class:verified={s.tag === 'Verificado'}>{s.tag}</span>
        </li>
      {/each}
    </ul>

    <div class="pcard-cols">
      <div>
        <p class="pcard-label">Certificaciones</p>
        <ul class="pcard-proof">
          {#each certifications as c (c)}
            <li><Icon name="check" size={13} /> {c}</li>
          {/each}
        </ul>
      </div>
      <div>
        <p class="pcard-label">Proyectos</p>
        <ul class="pcard-proof">
          {#each projects as p (p)}
            <li><Icon name="check" size={13} /> {p}</li>
          {/each}
        </ul>
      </div>
    </div>

    <button class="pcard-btn" type="button">Verificar identidad</button>
  </article>
{/if}

<style>
  .pcard {
    width: min(360px, 100%);
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    padding: var(--s-4);
    border-radius: 18px;
    border: 1px solid rgba(167, 139, 250, 0.3);
    background: rgba(14, 8, 30, 0.68);
    backdrop-filter: blur(20px);
    box-shadow:
      0 24px 70px rgba(5, 2, 12, 0.55),
      0 0 44px rgba(124, 58, 237, 0.14);
    text-align: left;
  }

  .pcard-status {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #6ee7b7;
  }

  .pcard-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .pcard-name {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--white);
  }

  .pcard-name-lg {
    font-size: 1.6rem;
  }

  .pcard-role {
    margin: 0;
    font-size: 0.9rem;
    color: var(--gray-400);
  }

  .pcard-sep {
    height: 1px;
    background: rgba(167, 139, 250, 0.16);
  }

  .pcard-label {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--gray-500);
  }

  /* ---- habilidades compactas: puntos ---- */
  .pcard-skills {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .pcard-skills li,
  .pcard-bars li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
  }

  .sk-name {
    font-size: 0.88rem;
    color: var(--gray-100);
    min-width: 88px;
  }

  .sk-dots {
    display: inline-flex;
    gap: 5px;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(167, 139, 250, 0.18);
  }

  .dot.on {
    background: var(--purple-400);
    box-shadow: 0 0 8px rgba(167, 139, 250, 0.55);
  }

  /* ---- habilidades completas: barras segmentadas ---- */
  .pcard-bars {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .bar {
    display: inline-flex;
    gap: 3px;
    flex: 1;
  }

  .seg {
    height: 8px;
    flex: 1;
    border-radius: 3px;
    background: rgba(167, 139, 250, 0.12);
  }

  .seg.on {
    background: linear-gradient(90deg, var(--purple-500), var(--purple-300));
  }

  .sk-tag {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gray-500);
    min-width: 76px;
    text-align: right;
  }

  .sk-tag.verified {
    color: #6ee7b7;
  }

  /* ---- proof lists ---- */
  .pcard-proof {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .pcard-proof li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.84rem;
    color: var(--gray-200);
  }

  .pcard-proof :global(svg) {
    color: #6ee7b7;
  }

  .pcard-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-4);
  }

  .pcard-cols > div {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }

  /* ---- botón ---- */
  .pcard-btn {
    margin-top: var(--s-1);
    min-height: 40px;
    border-radius: 999px;
    border: 1px solid rgba(167, 139, 250, 0.4);
    background: rgba(124, 58, 237, 0.12);
    color: var(--purple-200, #ddd6fe);
    font-family: var(--font-display);
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease;
  }

  .pcard-btn:hover {
    border-color: rgba(196, 181, 253, 0.7);
    background: rgba(124, 58, 237, 0.22);
  }
</style>
