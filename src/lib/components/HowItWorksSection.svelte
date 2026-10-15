<script>
  /**
   * HowItWorksSection — "Cómo funciona" según la spec: 5 pasos.
   *
   * Estructura editorial: número gigante a la izquierda, texto a la
   * derecha, alternando dirección; cada paso con su mini-visual.
   * El paso 3 lleva el quote "La IA propone. Tú decides."
   */
  import Icon from './Icon.svelte'
  import { reveal } from '../actions/reveal'

  const pasos = [
    {
      num: '01',
      title: 'Conecta',
      body: 'Conecta GitHub, portafolios, certificaciones y otras fuentes de evidencia.',
      chips: ['GitHub', 'Portafolio', 'Certificados', 'Proyectos'],
    },
    {
      num: '02',
      title: 'Analiza',
      body: 'Nuestra IA analiza tu evidencia y genera un perfil estructurado de tus habilidades y experiencia.',
      skills: ['Java', 'React', 'Spring Boot', 'APIs'],
    },
    {
      num: '03',
      title: 'Tú decides',
      body: 'Revisa los resultados y decide qué información quieres certificar y compartir.',
      quote: 'La IA propone. Tú decides.',
    },
    {
      num: '04',
      title: 'Certifica',
      body: 'Los registros seleccionados se convierten en huellas criptográficas verificables mediante blockchain.',
      chain: ['Proyecto', 'Hash', 'Blockchain', 'Verificado'],
    },
    {
      num: '05',
      title: 'Comparte',
      body: 'Comparte una identidad profesional que cualquier persona puede verificar.',
    },
  ]
</script>

<section id="como-funciona" class="hiw">
  <div class="wrap" use:reveal>
    <h2 class="display-2">De evidencia dispersa<br />a reputación verificable.</h2>
  </div>

  <div class="steps">
    {#each pasos as p, i (p.num)}
      <article class="step" class:flip={i % 2 === 1} use:reveal>
        <span class="step-num" aria-hidden="true">{p.num}</span>

        <div class="step-body">
          <h3>{p.title}</h3>
          <p class="muted">{p.body}</p>

          {#if p.chips}
            <div class="v-chips" aria-hidden="true">
              {#each p.chips as c (c)}<span class="chip">{c}</span>{/each}
              <Icon name="arrow" size={13} />
              <span class="chip chip-dest">Aletheia</span>
            </div>
          {:else if p.skills}
            <div class="v-skills" aria-hidden="true">
              {#each p.skills as s (s)}
                <span class="skill"><Icon name="check" size={12} /> {s}</span>
              {/each}
            </div>
          {:else if p.quote}
            <blockquote class="v-quote">“{p.quote}”</blockquote>
          {:else if p.chain}
            <div class="v-chain" aria-hidden="true">
              {#each p.chain as c, ci (c)}
                <span class="chain-node" class:chain-ok={ci === p.chain.length - 1}>{c}</span>
                {#if ci < p.chain.length - 1}<Icon name="arrow" size={12} />{/if}
              {/each}
            </div>
          {/if}
        </div>
      </article>
    {/each}
  </div>
</section>

<style>
  .hiw {
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
    line-height: 1.06;
    margin: 0 0 var(--s-6);
    color: var(--white);
  }

  /* ---- pasos ---- */
  .steps {
    width: min(1160px, 100% - var(--s-5) * 2);
    margin-inline: auto;
    display: flex;
    flex-direction: column;
  }

  .step {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: var(--s-5);
    padding-block: var(--s-5);
    border-top: 1px solid rgba(167, 139, 250, 0.1);
    align-items: start;
  }

  /* alterna la dirección: número a la derecha en pasos pares */
  .step.flip {
    grid-template-columns: 1fr 140px;
  }

  .step.flip .step-num {
    order: 2;
    text-align: right;
  }

  .step.flip .step-body {
    order: 1;
  }

  .step-num {
    font-family: var(--font-display);
    font-size: clamp(2.6rem, 6vw, 4.2rem);
    font-weight: 700;
    letter-spacing: -0.05em;
    line-height: 0.9;
    color: transparent;
    -webkit-text-stroke: 1.5px rgba(167, 139, 250, 0.45);
  }

  .step-body h3 {
    margin: 0 0 var(--s-2);
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--white);
  }

  .step-body .muted {
    margin: 0;
    max-width: 54ch;
  }

  /* ---- visuales por paso ---- */
  .v-chips {
    margin-top: var(--s-3);
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    color: var(--purple-300);
  }

  .chip {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    color: var(--gray-200);
    padding: 6px 13px;
    border: 1px solid rgba(167, 139, 250, 0.24);
    border-radius: 999px;
    background: rgba(124, 58, 237, 0.08);
  }

  .chip-dest {
    color: var(--white);
    border-color: rgba(196, 181, 253, 0.5);
    background: rgba(124, 58, 237, 0.2);
  }

  .v-skills {
    margin-top: var(--s-3);
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .skill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: #6ee7b7;
    padding: 6px 13px;
    border: 1px solid rgba(110, 231, 183, 0.25);
    border-radius: 999px;
    background: rgba(110, 231, 183, 0.06);
  }

  .v-quote {
    margin: var(--s-3) 0 0;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--purple-200, #ddd6fe);
  }

  .v-chain {
    margin-top: var(--s-3);
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    color: var(--purple-300);
  }

  .chain-node {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--gray-200);
    padding: 6px 13px;
    border: 1px solid rgba(167, 139, 250, 0.24);
    border-radius: 10px;
    background: rgba(14, 8, 30, 0.55);
  }

  .chain-ok {
    color: #6ee7b7;
    border-color: rgba(110, 231, 183, 0.4);
  }

  @media (max-width: 720px) {
    .step,
    .step.flip {
      grid-template-columns: 1fr;
      gap: var(--s-2);
    }

    .step.flip .step-num {
      order: 0;
      text-align: left;
    }

    .step.flip .step-body {
      order: 1;
    }
  }
</style>
