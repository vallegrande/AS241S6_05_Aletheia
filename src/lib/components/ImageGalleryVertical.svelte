<script>
  /**
   * ImageGalleryVertical — muro editorial en movimiento continuo.
   *
   * Honesto por diseño: la DApp está en desarrollo, así que no hay
   * capturas falsas. El muro mezcla:
   *  - Las dos imágenes reales del proyecto (escudo + builder).
   *  - Los conceptos del flujo Aletheia como tiles tipográficos:
   *    SILO → EVIDENCIA → IA → SELLO → HASH → PERFIL.
   *
   * Comportamiento: columnas verticales alternadas (pares suben,
   * impares bajan), pausa global al hover, máscara de desvanecido,
   * responsive 3→2 columnas, respeta prefers-reduced-motion.
   */

  const conceptos = {
    SILO: 'donde tu trabajo vive hoy, encerrado',
    EVIDENCIA: 'lo que prueba lo que hiciste',
    IA: 'lee tu historia, no tu promesa',
    SELLO: 'un hash con fecha, inmutable',
    HASH: 'la huella que nadie puede falsificar',
    PERFIL: 'tuyo, portable, verificable',
  }

  /** Cada tile: imagen real o concepto tipográfico. */
  const tiles = [
    { tipo: 'concepto', palabra: 'SILO', sub: conceptos.SILO },
    { tipo: 'imagen', src: '/aletheia-logo.png', alt: 'Escudo de Aletheia — red de nodos', cap: 'identidad' },
    { tipo: 'concepto', palabra: 'EVIDENCIA', sub: conceptos.EVIDENCIA },
    { tipo: 'imagen', src: '/perfil.png', alt: 'Carlos Alejandro Caycho Casas — builder de Aletheia', cap: 'el builder' },
    { tipo: 'concepto', palabra: 'IA', sub: conceptos.IA },
    { tipo: 'concepto', palabra: 'SELLO', sub: conceptos.SELLO },
    { tipo: 'imagen', src: '/aletheia-logo.png', alt: 'Escudo de Aletheia sobre fondo morado', cap: 'aletheia' },
    { tipo: 'concepto', palabra: 'HASH', sub: conceptos.HASH },
    { tipo: 'concepto', palabra: 'PERFIL', sub: conceptos.PERFIL },
  ]

  // 3 columnas × contenido duplicado para el loop infinito
  const columns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
  ]
  const loopColumns = columns.map((col) => [...col, ...col])

  const heights = ['17rem', '13.5rem', '15rem', '12.5rem', '16rem', '13rem']

  function tileHeight(index) {
    return heights[index % heights.length]
  }
</script>

<div class="gallery" role="group" aria-label="Conceptos del flujo Aletheia — muro en movimiento">
  <div class="wall">
    {#each loopColumns as col, ci (ci)}
      <div class="col" class:reverse={ci % 2 === 1}>
        {#each col as t, i (`${ci}-${i}`)}
          {@const tile = tiles[t]}
          <figure class="tile" style="height: {tileHeight(t)}">
            {#if tile.tipo === 'imagen'}
              <img src={tile.src} alt={tile.alt} loading="lazy" draggable="false" />
              <figcaption class="cap"><span>{tile.cap}</span></figcaption>
            {:else}
              <div class="concepto t{t % 6}">
                <span class="palabra">{tile.palabra}</span>
                <span class="sub">{tile.sub}</span>
              </div>
            {/if}
          </figure>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .gallery {
    position: relative;
    overflow: hidden;
    border-block: 1px solid rgba(167, 139, 250, 0.12);
    mask-image: linear-gradient(to bottom, transparent, black 12%, black 88%, transparent);
    -webkit-mask-image: linear-gradient(to bottom, transparent, black 12%, black 88%, transparent);
  }

  .wall {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    height: 560px;
    padding-block: 10px;
  }

  .col {
    display: flex;
    flex-direction: column;
    gap: 14px;
    animation: drift-y 46s linear infinite;
    will-change: transform;
  }

  .col.reverse {
    animation-direction: reverse;
  }

  .gallery:hover .col {
    animation-play-state: paused;
  }

  @keyframes drift-y {
    to {
      transform: translateY(calc(-50% - 7px));
    }
  }

  .tile {
    position: relative;
    margin: 0;
    border-radius: var(--radius);
    overflow: hidden;
    background: rgba(10, 6, 22, 0.6);
    border: 1px solid rgba(167, 139, 250, 0.12);
    flex: none;
    transition: border-color 0.3s ease;
  }

  .tile:hover {
    border-color: rgba(167, 139, 250, 0.45);
  }

  /* ---- imagen real ---- */
  .tile img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    user-select: none;
  }

  .cap {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    padding: 22px 14px 10px;
    background: linear-gradient(transparent, rgba(5, 3, 8, 0.92));
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.35s ease, transform 0.35s ease;
  }

  .tile:hover .cap {
    opacity: 1;
    transform: translateY(0);
  }

  .cap span {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--purple-300);
  }

  /* ---- tile tipográfico: concepto del flujo ---- */
  .concepto {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 6px;
    padding: 18px;
    background: linear-gradient(160deg, rgba(124, 58, 237, 0.16), rgba(38, 8, 74, 0.55));
  }

  /* variación de tono por tile para que la pared respire */
  .concepto.t1 { background: linear-gradient(160deg, rgba(167, 139, 250, 0.1), rgba(58, 16, 106, 0.5)); }
  .concepto.t2 { background: linear-gradient(160deg, rgba(124, 58, 237, 0.22), rgba(20, 6, 40, 0.6)); }
  .concepto.t3 { background: linear-gradient(200deg, rgba(196, 181, 253, 0.12), rgba(38, 8, 74, 0.55)); }
  .concepto.t4 { background: linear-gradient(200deg, rgba(124, 58, 237, 0.18), rgba(14, 4, 30, 0.6)); }
  .concepto.t5 { background: linear-gradient(140deg, rgba(167, 139, 250, 0.14), rgba(48, 12, 88, 0.5)); }

  .palabra {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 3.4vw, 2.8rem);
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 0.95;
    text-transform: uppercase;
    color: var(--white);
  }

  .sub {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    line-height: 1.5;
    color: var(--gray-400);
  }

  @media (max-width: 760px) {
    .wall {
      grid-template-columns: repeat(2, 1fr);
      height: 460px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .col {
      animation: none;
    }
  }
</style>
