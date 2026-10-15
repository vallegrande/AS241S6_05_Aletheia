<script>
  /**
   * GlobalBackground — MESH DE 4 COLORES con deriva ALEATORIA.
   *
 * Colores (4, concentrados en la zona alta junto al navbar) — SOLO MORADOS:
 *   1. LAVANDA CLARO   #c4b5fd (ilumina sin lavar)
 *   2. MORADO MEDIO    #8b5cf6 (cuerpo de la luz)
 *   3. MORADO VIVO     #7c3aed (profundidad)
 *   4. MORADO PROFUNDO #1e0c50 (ancla que rellena todo)
   *
   * Movimiento: SIN giro circular. Cada mancha sigue una TRAYECTORIA
   * IRREGULAR de múltiples puntos (zig-zag con paradas, retrocesos y
   * cambios de escala) — deriva aleatoria, nunca un círculo. Las duraciones
   * (13s, 17s, 19s, 23s) son primos entre sí: la combinación total casi
   * no se repite, así el "aleatorio" se mantiene genuino.
   *
   * Todo en GPU (transform/opacity). Pausable con reduced-motion.
   */
</script>

<div class="global-bg" aria-hidden="true">
  <div class="blob blob-blanco"></div>
  <div class="blob blob-blanco-morado"></div>
  <div class="blob blob-morado"></div>
  <div class="blob blob-morado-oscuro"></div>
  <!-- SUELO OSCURO: franja fija en la base del viewport (encima del mesh,
       detrás de todo el contenido). El hero "emerge" de ella y cada sección
       pasa a través al hacer scroll: la oscuridad del hero NUNCA se corta,
       continúa como fondo permanente de la parte baja de la página. -->
  <div class="bg-floor"></div>
  <div class="vignette"></div>
  <div class="grain"></div>
</div>

<style>
  .global-bg {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    /* Base única de la experiencia: el mismo negro-violeta que sostiene
       el HERO. Nunca cambia al cruzar de un capítulo a otro. */
    background: #090418;
    pointer-events: none;
  }

  .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    will-change: transform, opacity;
  }

  /* FALLOFF GAUSSIANO: los degradados anteriores caían de golpe
     (fuerte → 0 en 60%), dejando un BORDE visible que se desplazaba con
     la animación (el "corte"). Ahora cada mancha se apaga en 5 paradas
     progresivas hasta 100% del elemento: cero borde, cero rim. */

  /* 1. LAVANDA CLARO — sobre el navbar, lado izquierdo */
  .blob-blanco {
    width: 58vmax;
    height: 58vmax;
    top: -24vmax;
    left: -8vmax;
    /* el color muere al 62% del radio del elemento → jamás alcanza un
       borde: imposible que el recorte dibuje un arco */
    background: radial-gradient(
      circle,
      rgba(196, 181, 253, 0.68) 0%,
      rgba(196, 181, 253, 0.38) 16%,
      rgba(196, 181, 253, 0.17) 32%,
      rgba(196, 181, 253, 0.06) 48%,
      rgba(196, 181, 253, 0) 62%
    );
    /* ease-in-out por tramo: la deriva acelera y frena en cada punto —
       sin cambios de dirección secos */
    animation: deriva-blanco 13s cubic-bezier(0.42, 0, 0.58, 1) infinite alternate;
  }

  /* 2. MORADO MEDIO — derecha: sube y baja por el borde donde vive la
        scrollbar, dando color y movimiento a la franja del track */
  .blob-blanco-morado {
    width: 46vmax;
    height: 62vmax;
    top: 6vmax;
    right: -14vmax;
    background: radial-gradient(
      circle,
      rgba(139, 92, 246, 0.5) 0%,
      rgba(139, 92, 246, 0.28) 16%,
      rgba(139, 92, 246, 0.12) 32%,
      rgba(139, 92, 246, 0.04) 48%,
      rgba(139, 92, 246, 0) 62%
    );
    animation: deriva-blanco-morado 17s cubic-bezier(0.42, 0, 0.58, 1) infinite alternate;
  }

  /* 3. MORADO VIVO — a la altura del navbar, izquierda-centro */
  .blob-morado {
    width: 66vmax;
    height: 66vmax;
    top: 4vmax;
    left: -22vmax;
    background: radial-gradient(
      circle,
      rgba(124, 58, 237, 0.72) 0%,
      rgba(124, 58, 237, 0.42) 16%,
      rgba(124, 58, 237, 0.18) 32%,
      rgba(124, 58, 237, 0.06) 48%,
      rgba(124, 58, 237, 0) 62%
    );
    animation: deriva-morado 19s cubic-bezier(0.42, 0, 0.58, 1) infinite alternate;
  }

  /* 4. MORADO PROFUNDO — a la altura del navbar, derecha, y ancla abajo */
  .blob-morado-oscuro {
    width: 72vmax;
    height: 72vmax;
    top: 10vmax;
    right: -20vmax;
    background: radial-gradient(
      circle,
      rgba(30, 12, 80, 0.92) 0%,
      rgba(30, 12, 80, 0.56) 18%,
      rgba(30, 12, 80, 0.26) 34%,
      rgba(30, 12, 80, 0.08) 50%,
      rgba(30, 12, 80, 0) 64%
    );
    animation: deriva-morado-oscuro 23s cubic-bezier(0.42, 0, 0.58, 1) infinite alternate;
  }

  /*
   * Trayectorias IRREGULARES (aleatorias): zig-zag de múltiples puntos con
   * direcciones distintas en cada tramo — nada de rotaciones ni órbitas.
   */
  @keyframes deriva-blanco {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
      opacity: 0.9;
    }
    17% {
      transform: translate3d(8vmax, 6vmax, 0) scale(0.82);
      opacity: 0.5;
    }
    39% {
      transform: translate3d(-6vmax, 16vmax, 0) scale(1.18);
      opacity: 1;
    }
    58% {
      transform: translate3d(14vmax, 4vmax, 0) scale(0.9);
      opacity: 0.45;
    }
    79% {
      transform: translate3d(-10vmax, -8vmax, 0) scale(1.1);
      opacity: 0.85;
    }
    100% {
      transform: translate3d(6vmax, -14vmax, 0) scale(0.95);
      opacity: 0.6;
    }
  }

  @keyframes deriva-blanco-morado {
    0% {
      transform: translate3d(0, 0, 0) scale(0.85);
      opacity: 0.6;
    }
    23% {
      transform: translate3d(-12vmax, 8vmax, 0) scale(1.15);
      opacity: 1;
    }
    41% {
      transform: translate3d(4vmax, 20vmax, 0) scale(0.8);
      opacity: 0.4;
    }
    66% {
      transform: translate3d(16vmax, -2vmax, 0) scale(1.05);
      opacity: 0.9;
    }
    100% {
      transform: translate3d(-4vmax, -16vmax, 0) scale(0.88);
      opacity: 0.65;
    }
  }

  @keyframes deriva-morado {
    0% {
      transform: translate3d(0, 0, 0) scale(1.12);
      opacity: 0.95;
    }
    21% {
      transform: translate3d(10vmax, -6vmax, 0) scale(0.85);
      opacity: 0.5;
    }
    47% {
      transform: translate3d(-8vmax, -14vmax, 0) scale(1.22);
      opacity: 1;
    }
    63% {
      transform: translate3d(6vmax, 10vmax, 0) scale(0.9);
      opacity: 0.55;
    }
    84% {
      transform: translate3d(16vmax, 2vmax, 0) scale(1.05);
      opacity: 0.8;
    }
    100% {
      transform: translate3d(-4vmax, 12vmax, 0) scale(0.95);
      opacity: 0.7;
    }
  }

  @keyframes deriva-morado-oscuro {
    0% {
      transform: translate3d(0, 0, 0) scale(0.9);
      opacity: 1;
    }
    19% {
      transform: translate3d(-10vmax, 12vmax, 0) scale(1.15);
      opacity: 0.6;
    }
    44% {
      transform: translate3d(8vmax, -4vmax, 0) scale(0.85);
      opacity: 0.95;
    }
    71% {
      transform: translate3d(-14vmax, -10vmax, 0) scale(1.2);
      opacity: 0.5;
    }
    100% {
      transform: translate3d(4vmax, 6vmax, 0) scale(0.95);
      opacity: 1;
    }
  }

  /* ---- ATMÓSFERA CONTINUA: un único velo fijo cubre TODO el viewport.
       Al compartir la misma curva oscura que la base del HERO desaparece
       cualquier borde cuando una escena cruza a la siguiente. ---- */
  .bg-floor {
    position: absolute;
    inset: 0;
    /* Opacidad constante: conserva la deriva de los blobs por debajo, pero
       evita que el color dependa de la altura del viewport. */
    background: rgba(9, 4, 24, 0.82);
  }

  /* ---- Viñeta mínima en esquinas: fuerte abajo/izquierda, pero CERO en el
       borde derecho — la franja de la scrollbar queda transparente sobre el
       mesh animado para que la barra "se mueva" con el fondo. ---- */
  .vignette {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        120% 100% at 28% 42%,
        transparent 58%,
        rgba(12, 2, 28, 0.5) 100%
      );
    -webkit-mask-image: linear-gradient(
      90deg,
      #000 0%,
      #000 88%,
      transparent 97%
    );
    mask-image: linear-gradient(90deg, #000 0%, #000 88%, transparent 97%);
  }

  /* ---- Grano anti-banding: algo más presente para disimular cualquier
       escalón de cuantización en los degradados oscuros ---- */
  .grain {
    position: absolute;
    inset: 0;
    opacity: 0.07;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
  }

  @media (prefers-reduced-motion: reduce) {
    .blob {
      animation: none;
    }
  }
</style>
