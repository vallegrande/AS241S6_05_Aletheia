<script>
  /**
   * ScrollScene — contenedor de una ESCENA (no de una sección).
   *
   * Estructura:
   *   .scene        wrapper de (1 + length) × 100vh (altura de scroll)
   *   .scene-stage  escenario clavado de 100vh donde vive el contenido
   *
   * `length` = viewports de contenido fijado (0 = solo transición).
   * `isHero` = marca la escena hero (transparente: muestra el mesh global).
   * `pull`   = viewports solapados con la escena anterior (margin-top
   *            negativo): habilita la banda de CUBIERTA — la lámina de
   *            esta escena sube 1 vh tapando la anterior, que queda
   *            clavada por su sticky (física del muelle en cover.ts).
   * En modo flujo (móvil / sin puntero / reduced-motion) el wrapper pasa a
   * auto y el escenario a flujo normal: mismos estilos, otra geometría.
   *
   * El FILO de luz (.scene-edge) lo enciende cover.ts con la velocidad
   * real del muelle de la lámina que sube.
   */
  let { children, id = '', length = 0, accent = '#a78bfa', scrim = 0, isHero = false, pull = 0, from = '' } = $props()
</script>

<section
  {id}
  class="scene"
  class:is-hero={isHero}
  data-from={from}
  style="--len: {length}; --accent: {accent}; --scrim: {scrim}; --pull: {pull}"
>
  <div class="scene-stage">
    <div class="scene-scrim" aria-hidden="true"></div>
    <div class="scene-edge" aria-hidden="true"></div>
    {@render children()}
  </div>
</section>

<style>
  .scene {
    position: relative;
    /* Cada escena ocupa su espacio completo para el scroll */
    height: calc((1 + var(--len, 0)) * 100vh);
    /* Solape con la escena anterior (banda de cubierta). */
    margin-top: calc(var(--pull, 0) * -100vh);
  }

  /* HERO CLAVADO (parallax de cubierta): el wrapper del hero crece 1 vh
     extra para que su stage sticky tenga recorrido y se ANCLE en top:0
     mientras la escena 01 lo tapa con su lámina. */
  .scene.is-hero {
    height: calc((2 + var(--len, 0)) * 100vh);
  }

  .scene-stage {
    /* TODAS las secciones usan sticky para quedarse fijas cuando llegan arriba */
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
    /* El filo de luz se anima con opacity (cover.ts): capa propia. */
    isolation: isolate;
    /* OPACO: la lámina entrante debe tapar POR COMPLETO la escena
       anterior. Cualquier translucidez deja entrever el texto anterior
       durante la transición de cubierta. */
    background: rgb(10, 6, 24);
  }

  /* La escena hero sin fondo (pero también sticky para el apilamiento) */
  .scene.is-hero .scene-stage {
    background: transparent;
  }

  /* Z-index progresivo para que cada sección tape la anterior */
  .scene:nth-child(1) .scene-stage { z-index: 1; }
  .scene:nth-child(2) .scene-stage { z-index: 2; }
  .scene:nth-child(3) .scene-stage { z-index: 3; }
  .scene:nth-child(4) .scene-stage { z-index: 4; }
  .scene:nth-child(5) .scene-stage { z-index: 5; }
  .scene:nth-child(6) .scene-stage { z-index: 6; }
  .scene:nth-child(7) .scene-stage { z-index: 7; }
  .scene:nth-child(8) .scene-stage { z-index: 8; }

  /* No hay suelos por capítulo: el fondo del HERO es el fondo único. */
  .scene-scrim {
    position: absolute;
    inset: 0;
    z-index: 0;
    opacity: 0;
    pointer-events: none;
    background: transparent;
  }

  /* Filo de luz del plano ENTRANTE: 1px en su borde superior que cover.ts
     enciende mientras la lámina sube (según la velocidad del muelle) y
     apaga al asentarse. La pluma de glow es el propio box-shadow del
     elemento (se transforma con él, sin coste de layout). */
  .scene-edge {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    z-index: 3;
    opacity: 0;
    pointer-events: none;
    background: linear-gradient(
      90deg,
      rgba(196, 181, 253, 0) 0%,
      rgba(196, 181, 253, 0.85) 14%,
      rgba(240, 236, 255, 0.95) 50%,
      rgba(196, 181, 253, 0.85) 86%,
      rgba(196, 181, 253, 0) 100%
    );
    box-shadow:
      0 0 12px 1px rgba(167, 139, 250, 0.4),
      0 4px 26px 2px rgba(139, 92, 246, 0.24);
    will-change: opacity;
  }

  /* El hero no es un plano con borde: su filo permanece neutro. */
  .scene.is-hero .scene-edge {
    background: none;
    box-shadow: none;
  }

  /* ===== MODO FLUJO (móvil / sin puntero / reduced-motion) =====
     Sin escenas fijadas: contenido apilado, revelado al entrar en pantalla. */
  @media (max-width: 900px), (hover: none), (prefers-reduced-motion: reduce) {
    .scene {
      height: auto;
      /* Sin solapes en flujo: apilado documental puro. */
      margin-top: 0;
    }

    .scene.is-hero {
      height: auto;
    }

    /* En flujo el apilado lo resuelve el orden del documento: el último
       bloque pinta encima del anterior sin helpers. */
    .scene:nth-child(1) .scene-stage,
    .scene:nth-child(2) .scene-stage,
    .scene:nth-child(3) .scene-stage,
    .scene:nth-child(4) .scene-stage,
    .scene:nth-child(5) .scene-stage,
    .scene:nth-child(6) .scene-stage,
    .scene:nth-child(7) .scene-stage,
    .scene:nth-child(8) .scene-stage {
      z-index: auto;
    }
  }
</style>
