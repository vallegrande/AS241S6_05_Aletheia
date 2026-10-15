<script>
  /**
   * Hero — ESCENARIO EDITORIAL (ref. portafolio de impacto):
   *
   *   · Robot grande al centro, pies apoyados en el borde inferior.
   *   · TIPOGRAFÍA GIGANTE sólida que cruza la CARA del robot (marquee
   *     infinito) y queda POR DETRÁS de la silueta: las letras se cortan
   *     contra el cuerpo y asoman por los bordes de la ventana.
   *   · Chrome editorial: párrafo intro arriba-izquierda, frases del lema
   *     arriba-derecha y barra inferior con separadores "+".
   *   · Salida por capas con el scroll (robot se clava y se apaga, la cinta
   *     acelera hacia arriba, el chrome se desvanece).
   *
   * El robot sale de `static/hero-robot.png` (recorte con alfa). El fondo es
   * el mesh global (GlobalBackground) + halo morado detrás de la silueta.
   * GEIST en toda la sección. Video desactivado (HERO_VIDEO=false).
   */
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  /**
   * CINTA INFINITA: frases del lema que corren de derecha a izquierda
   * cruzando la cara del robot. Dos mitades idénticas y el track a -50%:
   * el bucle cierra sin costura.
   */
  const RIBBON = [
    'VERIFICABLE EN BLOCKCHAIN',
    'LA IA PROPONE, TÚ DECIDES',
    'TU IDENTIDAD, PORTABLE',
    'SIN INTERMEDIARIOS',
  ]
  const RIBBON_HALVES = [0, 1]

  /* Jitter determinista por palabra (segundos): rompe la uniformidad de la
     cascada de entrada — las frases no llegan todas exactamente iguales. */
  const RIBBON_JITTER = [-0.06, 0.04, -0.02, 0.09, -0.04, 0.02, 0.06, -0.03]

  /**
   * Loop de video del hero (doble <video> ping-pong + watchdog).
   * `false`: el hero muestra el mesh global + robot + cinta y no descarga los
   * mp4. `true`: vuelve el video (requiere los mp4 en static/).
   */
  const HERO_VIDEO = false

  /**
   * LOOP INFINITO con DOS videos reales (adelante + reversa) — técnica de
   * doble <video> con crossfade. Solo se usa con HERO_VIDEO=true.
   */
  let videoA = $state()
  let videoB = $state()
  let activeIsA = true
  let mode = 'dual'

  /* ===== elementos del parallax de salida ===== */
  let heroEl = $state(null)
  let robotEl = $state(null)
  let ribbonEl = $state(null)
  let chromeEl = $state(null)

  /* RED DE SEGURIDAD: si el reloj de animación se congela (webview en
     segundo plano, throttle extremo), la entrada no puede dejar el hero
     invisible. A los 3.6s JS fuerza el estado final (.settled). En un
     navegador normal dispara DESPUÉS de que toda la coreografía ya
     terminó: sin ningún efecto visual. */
  let settled = $state(false)

  onMount(() => {
    if (HERO_VIDEO) {
      // (machinería de video intacta por si se re-activa)
      const a = videoA
      const b = videoB
      if (a && b) {
        for (const v of [a, b]) v.muted = true
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        let inView = true
        const io = new IntersectionObserver(
          ([entry]) => {
            inView = entry.isIntersecting
            if (!inView) for (const v of [a, b]) v.pause()
            else if (!reduced) a.play().catch(() => {})
          },
          { threshold: 0.05 },
        )
        io.observe(a)
        return () => io.disconnect()
      }
    }

    /* ===== PARALLAX DE SALIDA DEL HERO =====
       rAF + scroll pasivo (GPU: transform/opacity). El robot se queda
       clavado (factor 0.45) y se apaga, la cinta corre hacia arriba más
       rápido (−0.22) y el chrome editorial se desvanece. Nada corre cuando
       el hero sale de pantalla ni con reduced-motion. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let scrollDetected = false
    
    function apply() {
      raf = 0
      const y = window.scrollY
      const vh = window.innerHeight
      const p = Math.min(y / vh, 1) // 0 → 1 en el primer viewport
      
      // Aplicar parallax cuando hay scroll, o limpiar cuando se vuelve a top (y === 0)
      if (y > 0) {
        // Detectar scroll por primera vez y cancelar animaciones CSS
        if (!scrollDetected) {
          scrollDetected = true
          if (heroEl) heroEl.classList.add('scroll-active')
        }
        
        // Parallax con !important solo cuando hay scroll
        if (robotEl) {
          robotEl.style.setProperty('transform', `translate3d(0, ${(y * 0.45).toFixed(1)}px, 0)`, 'important')
          robotEl.style.setProperty('opacity', String(Math.max(0, 1 - p * 1.05)), 'important')
          robotEl.style.maskImage = 'linear-gradient(180deg, #000 60%, #000 75%, transparent 100%)'
          robotEl.style.webkitMaskImage = 'linear-gradient(180deg, #000 60%, #000 75%, transparent 100%)'
        }
        
        if (ribbonEl) {
          ribbonEl.style.setProperty('transform', `translate(-50%, calc(-50% + ${(-y * 0.22).toFixed(1)}px))`, 'important')
          ribbonEl.style.setProperty('opacity', String(Math.max(0, 1 - p * 1.35)), 'important')
        }
        
        if (chromeEl) {
          chromeEl.style.setProperty('opacity', String(Math.max(0, 1 - p * 1.6)), 'important')
        }
      } else {
        // Restablecer visibilidad completa e inline styles al volver al top
        if (scrollDetected) {
          scrollDetected = false
          if (heroEl) heroEl.classList.remove('scroll-active')
        }
        if (robotEl) {
          robotEl.style.removeProperty('transform')
          robotEl.style.removeProperty('opacity')
          robotEl.style.removeProperty('mask-image')
          robotEl.style.removeProperty('-webkit-mask-image')
        }
        if (ribbonEl) {
          ribbonEl.style.removeProperty('transform')
          ribbonEl.style.removeProperty('opacity')
        }
        if (chromeEl) {
          chromeEl.style.removeProperty('opacity')
        }
      }
    }
    function schedule() {
      if (!raf) raf = requestAnimationFrame(apply)
    }
    window.addEventListener('scroll', schedule, { passive: true })
    // NO ejecutar apply al montar - dejar que las animaciones corran naturalmente
    return () => {
      window.removeEventListener('scroll', schedule)
      if (raf) cancelAnimationFrame(raf)
    }
  })

  onMount(() => {
    const t = setTimeout(() => (settled = true), 3600)
    return () => clearTimeout(t)
  })
</script>

<section id="inicio" class="hero" class:settled bind:this={heroEl}>
  {#if HERO_VIDEO}
    <video
      bind:this={videoA}
      class="hero-video video-a"
      muted
      playsinline
      preload="auto"
      poster="/hero-robot.png"
      aria-hidden="true"
      disablepictureinpicture
    >
      <source src="/video-hero.mp4" type="video/mp4" />
    </video>
    <video
      bind:this={videoB}
      class="hero-video video-b"
      muted
      playsinline
      preload="auto"
      aria-hidden="true"
      disablepictureinpicture
    >
      <source src="/video-revert.mp4" type="video/mp4" />
    </video>
  {/if}

  <!-- ---- ROBOT: pegado al borde inferior (variante recortada al alfa de
       la silueta: sin espacio transparente bajo los pies). Entra emergiendo
       desde abajo con ease largo (coreografía de entrada) ---- -->
  <img class="hero-robot" bind:this={robotEl} src="/hero-robot-planted.png" alt="" aria-hidden="true" />

  <!-- ---- COLUMNA CENTRAL: cinta y halos (el robot está fuera) ---- -->
  <div class="core">
    <!-- ---- TIPOGRAFÍA GIGANTE: cruza la CARA del robot (≈40% del recorte
         desde arriba) y por DETRÁS de él: la silueta corta las letras. ---- -->
    <div class="ribbon" bind:this={ribbonEl} aria-hidden="true">
      <div class="ribbon-track">
        {#each RIBBON_HALVES as half}
          <div class="ribbon-half">
            {#each RIBBON as phrase, i}
              <span
                class="ribbon-item"
                style="--wi: {half * RIBBON.length + i}; --wj: {RIBBON_JITTER[(half * RIBBON.length + i) % RIBBON_JITTER.length]}s"
              >{phrase}</span>
              <span class="ribbon-dot"></span>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- ---- CHROME EDITORIAL: intro + lema + barra inferior ---- -->
  <div class="hero-chrome" bind:this={chromeEl}>
    <p class="hero-intro">
      <span class="hi-rule" aria-hidden="true"></span>
      <span class="hi-body">
        <strong>Aletheia</strong> es una aplicación descentralizada que
        permite a los profesionales construir una reputación basada en
        <span class="hi-accent">evidencia concreta</span>.
      </span>
    </p>

    <div class="hero-meta">
      <span class="meta-line meta-strong">La IA propone, tú decides</span>
      <span class="meta-line">Tu identidad, portable</span>
      <span class="meta-line">Sin intermediarios</span>
    </div>

    <div class="hero-bottom" aria-hidden="true">
      <span class="hb-plus">+</span>
      <span class="hb-word">Evidencia</span>
      <span class="hb-plus">+</span>
      <span class="hb-word">Blockchain</span>
      <span class="hb-plus">+</span>
      <span class="hb-word">Identidad</span>
      <span class="hb-plus">+</span>
    </div>
  </div>

</section>

<style>
  /* ===== HERO: escenario — robot + tipografía gigante + chrome =====
   .hero NO pinta fondo: es transparente para que se vea el mesh animado
   global (GlobalBackground), el mismo de todas las secciones. La rejilla
   mantiene al robot en el centro geométrico exacto.
   El scene-stage maneja el sticky, el hero solo estructura el contenido. */
  .hero {
    position: relative;
    width: 100%;
    height: 100%;
    /* rejilla: [hueco | ROBOT | hueco] */
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(420px, 50vw, 860px) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    align-items: center;
    overflow: hidden;
    clip-path: inset(0);
    --hero-pad-x: clamp(20px, 3.6vw, 58px);
    padding: clamp(68px, 8.2vh, 100px) var(--hero-pad-x) 0;
  }

  /* ---- COLUMNA CENTRAL ---- */
  .core {
    grid-column: 2;
    grid-row: 1;
    position: relative;
    /* DEBAJO del robot (z-2): la tipografía gigante que vive aquí dentro
       queda POR DETRÁS de la silueta — las letras se cortan contra el cuerpo */
    z-index: 1;
    align-self: stretch;
    min-height: 0;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    isolation: auto;
    container-type: size;
    /* variante recortada: 1179×1163 → el robot es más alto que ancho.
       --robot-h = alto REAL con el que se dibuja la silueta (la cinta y el
       halo cuelgan de él): el menor entre el ancho disponible y el 88% del
       alto (el robot ya no llega hasta arriba: no pasa del header). */
    --robot-aspect: 1.0137;
    --robot-max: 0.88;
    --robot-h: min(calc(100cqw / var(--robot-aspect)), calc(var(--robot-max) * 100cqh));
  }

  /* halo detrás de la silueta (mezcla ámbar + morado profundo del mesh) */
  .core::before {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    width: min(95vw, 1100px);
    aspect-ratio: 1;
    transform: translate(-50%, 20%);
    /* SIN border-radius: el degradado muere al 66% del rayo (antes del
       borde del elemento al 70.7%) → el color jamás toca un borde y
       NO PUEDE existir arco visible, sin importar la fase de la deriva */
    background:
      radial-gradient(
        circle at 50% 50%,
        rgba(139, 92, 246, 0.3) 0%,
        rgba(30, 12, 76, 0.2) 18%,
        rgba(22, 10, 64, 0.11) 36%,
        rgba(20, 9, 60, 0.04) 52%,
        transparent 66%
      );
    filter: blur(60px);
    pointer-events: none;
    will-change: transform, opacity;
    /* disolución ANTES del borde inferior del hero: sin costura al salir */
    -webkit-mask-image: linear-gradient(180deg, #000 40%, transparent 74%);
    mask-image: linear-gradient(180deg, #000 40%, transparent 74%);
    animation: deriva-halo-robot 17s linear infinite alternate;
  }

  @keyframes deriva-halo-robot {
    0% {
      transform: translate(-50%, 20%) translate3d(0, 0, 0) scale(1);
      opacity: 1;
    }
    23% {
      transform: translate(-50%, 20%) translate3d(-12vmax, 8vmax, 0) scale(1.15);
      opacity: 0.9;
    }
    41% {
      transform: translate(-50%, 20%) translate3d(4vmax, 20vmax, 0) scale(0.8);
      opacity: 0.85;
    }
    66% {
      transform: translate(-50%, 20%) translate3d(16vmax, -2vmax, 0) scale(1.05);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, 20%) translate3d(-4vmax, -16vmax, 0) scale(0.88);
      opacity: 0.95;
    }
  }

  /* recorte con alfa: PEGADO ABAJO y SIN PASAR DEL HEADER — la imagen
     ocupa el 88% del hero anclada al borde inferior: los pies siguen
     plantados y la cabeza queda por debajo de la zona del navbar.
     Con el parallax de salida el robot se hunde y el borde del hero lo
     recorta limpio (overflow hidden), como una transición natural. */
  .hero-robot {
    position: absolute;
    inset: auto 0 0 0;
    width: 100%;
    height: var(--robot-max, 88%);
    object-fit: contain;
    object-position: center bottom;
    z-index: 2;
    filter: drop-shadow(0 4px 20px rgba(9, 4, 24, 0.2));
    pointer-events: none;
    user-select: none;
    /* máscara de degradado en la parte inferior del robot para que se funda
       con el fondo sin importar la posición del scroll */
    -webkit-mask-image: linear-gradient(180deg, #000 60%, #000 75%, transparent 100%);
    mask-image: linear-gradient(180deg, #000 60%, #000 75%, transparent 100%);
    /* ENTRADA: emerge desde abajo (36% de su alto) desenfocándose hacia
       el foco — curva tipo expo-out, la firma de las animaciones GSAP */
    animation: robot-enter 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
  }

  @keyframes robot-enter {
    from {
      opacity: 0;
      transform: translateY(36%) scale(0.985);
      filter: blur(14px) drop-shadow(0 4px 20px rgba(9, 4, 24, 0.2));
    }
    60% {
      filter: blur(0) drop-shadow(0 4px 20px rgba(9, 4, 24, 0.2));
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0) drop-shadow(0 4px 20px rgba(9, 4, 24, 0.2));
    }
  }

  /* degradado de base, fusión con el mesh */
  .core::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: min(130cqw, calc(var(--robot-h) * var(--robot-aspect) * 1.4));
    height: 35%;
    background:
      radial-gradient(
        ellipse 120% 130% at 50% 100%,
        rgba(29, 15, 85, 0.88) 0%,
        rgba(23, 11, 66, 0.58) 22%,
        rgba(20, 10, 60, 0.3) 40%,
        rgba(18, 9, 56, 0.1) 58%,
        transparent 74%
      );
    filter: blur(30px);
    pointer-events: none;
    z-index: 0;
    will-change: transform, opacity;
    /* el charco de luz se disuelve ANTES del borde inferior del hero */
    -webkit-mask-image: linear-gradient(180deg, #000 52%, transparent 96%);
    mask-image: linear-gradient(180deg, #000 52%, transparent 96%);
    animation: deriva-base-robot 19s linear infinite alternate;
  }

  @keyframes deriva-base-robot {
    0% {
      transform: translateX(-50%) translate3d(0, 0, 0) scale(1.12);
      opacity: 0.95;
    }
    21% {
      transform: translateX(-50%) translate3d(10vmax, -6vmax, 0) scale(0.85);
      opacity: 0.8;
    }
    47% {
      transform: translateX(-50%) translate3d(-8vmax, -14vmax, 0) scale(1.22);
      opacity: 1;
    }
    63% {
      transform: translateX(-50%) translate3d(6vmax, 10vmax, 0) scale(0.9);
      opacity: 0.85;
    }
    84% {
      transform: translateX(-50%) translate3d(16vmax, 2vmax, 0) scale(1.05);
      opacity: 0.9;
    }
    100% {
      transform: translateX(-50%) translate3d(-4vmax, 12vmax, 0) scale(0.95);
      opacity: 1;
    }
  }

  /* degradado oscuro en la parte inferior para ocultar el fin del robot */
  .hero::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 45%;
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(10, 6, 24, 0.3) 25%,
      rgba(10, 6, 24, 0.6) 50%,
      rgba(10, 6, 24, 0.85) 75%,
      rgba(10, 6, 24, 0.98) 100%
    );
    z-index: 3;
    pointer-events: none;
  }

  /* ---- videos de fondo (solo con HERO_VIDEO=true) ---- */
  .hero-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1;
    pointer-events: none;
  }

  .video-b {
    z-index: 1;
  }

  .video-a {
    z-index: 2;
  }

  /* ===== TIPOGRAFÍA GIGANTE: CENTRADA verticalmente en el hero =====
     Sólida (casi blanca), enorme, a todo el ancho de la ventana y POR
     DETRÁS del robot: la silueta corta las letras. Su centro cae en el
     centro exacto del hero (un poco más abajo que antes: cruza el torso). */
  .ribbon {
    position: absolute;
    left: 50%;
    top: 46%; /* un poco más arriba del centro exacto */
    width: 100vw;
    transform: translate(-50%, -50%);
    z-index: 1;
    display: flex;
    align-items: center;
    height: clamp(120px, 22vh, 250px);
    overflow: hidden;
    pointer-events: none;
    user-select: none;
    /* máscara 2D: desvanecido horizontal (bordes de ventana) + vertical
       (arriba/abajo de la caja) — ninguna letra se recorta con línea
       recta: todo borde de la cinta es pluma pura */
    -webkit-mask-image:
      linear-gradient(90deg, transparent 0, #000 5%, #000 95%, transparent 100%),
      linear-gradient(180deg, transparent 0, #000 24%, #000 76%, transparent 100%);
    mask-image:
      linear-gradient(90deg, transparent 0, #000 5%, #000 95%, transparent 100%),
      linear-gradient(180deg, transparent 0, #000 24%, #000 76%, transparent 100%);
    -webkit-mask-composite: source-in;
    mask-composite: intersect;
    /* ENTRADA de la caja: fade + leve acercamiento (el slide de las letras
       vive en los items, para no pisar la máscara 2D del contenedor) */
    animation: ribbon-enter 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.55s both;
  }

  @keyframes ribbon-enter {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(1.04);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  .ribbon-track {
    display: flex;
    width: max-content;
    /* el track creció con la fuente: 110s mantiene el desplazamiento sereno */
    animation: ribbon-slide 110s linear infinite;
  }

  /* dos mitades idénticas → -50% cierra el bucle sin salto */
  @keyframes ribbon-slide {
    to {
      transform: translate3d(-50%, 0, 0);
    }
  }

  .ribbon-half {
    display: flex;
    align-items: center;
    gap: clamp(44px, 4.4vw, 84px);
    padding-right: clamp(44px, 4.4vw, 84px);
  }

  .ribbon-item {
    white-space: nowrap;
    font-family: var(--font-display);
    font-size: clamp(6.4rem, 17.5vw, 15.5rem);
    font-weight: 300;
    letter-spacing: -0.025em;
    line-height: 1;
    color: rgba(240, 236, 255, 0.96);
    /* SIN sombra: el drop-shadow de letras enormes se acumulaba en una
       banda rectangular detrás de la línea (parecía un fondo de color). */
    filter: none;
    /* ENTRADA por palabra: cada frase sube desenfocada en cascada —
       el jitter (−0.06s…+0.12s) rompe la uniformidad y da vida */
    animation: word-enter 1.5s cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: calc(0.65s + var(--wi, 0) * 0.14s + var(--wj, 0s));
  }

  @keyframes word-enter {
    from {
      opacity: 0;
      transform: translateY(0.35em);
      filter: blur(12px);
    }
    55% {
      filter: blur(0);
    }
    to {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
    }
  }

  .ribbon-dot {
    flex: 0 0 auto;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--purple-400);
    box-shadow: 0 0 18px rgba(167, 139, 250, 0.9);
  }

  /* ===== CHROME EDITORIAL ===== */
  .hero-chrome {
    position: absolute;
    inset: 0;
    z-index: 4;
    pointer-events: none;
    /* el halo respira una vez al aparecer: presencia, no decoración */
    animation: chrome-fade 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.9s both;
  }

  @keyframes chrome-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* párrafo intro arriba-izquierda: tipografía editorial con jerarquía —
     regla corta, marca en blanco y el concepto clave en morado claro */
  .hero-intro {
    position: absolute;
    top: clamp(84px, 12vh, 124px);
    left: var(--hero-pad-x);
    width: min(340px, 36vw);
    margin: 0;
    animation: chrome-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) 1s both;
  }

  .hi-rule {
    display: block;
    width: 32px;
    height: 1px;
    margin-bottom: 12px;
    background: linear-gradient(90deg, var(--purple-400), transparent);
  }

  .hi-body {
    display: block;
    font-size: clamp(0.85rem, 1vw, 0.98rem);
    line-height: 1.7;
    color: var(--gray-300);
    text-shadow: 0 1px 14px rgba(9, 4, 24, 0.55);
    text-wrap: pretty;
  }

  .hi-body strong {
    color: var(--white);
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .hi-accent {
    color: var(--purple-300);
  }

  /* entrada escalonada del chrome (en hijos: la opacidad del contenedor
     la controla el parallax de salida con el scroll) */
  @keyframes chrome-in {
    from {
      opacity: 0;
      transform: translateY(14px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* frases del lema arriba-derecha, apiladas */
  .hero-meta {
    position: absolute;
    top: clamp(84px, 12vh, 124px);
    right: var(--hero-pad-x);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: clamp(0.62rem, 0.72vw, 0.72rem);
    text-transform: uppercase;
    letter-spacing: 0.18em;
    animation: chrome-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) 1.15s both;
  }

  .meta-line {
    color: var(--gray-400);
    text-shadow: 0 1px 12px rgba(5, 3, 8, 0.55);
  }

  .meta-strong {
    color: var(--purple-300);
  }

  /* barra inferior: separadores "+" y palabras ancla */
  .hero-bottom {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    padding: 0 var(--hero-pad-x) 16px;
    font-family: var(--font-display);
    font-size: clamp(0.62rem, 0.8vw, 0.75rem);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    animation: chrome-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) 1.3s both;
  }

  .hb-word {
    color: var(--gray-200);
    text-shadow: 0 1px 12px rgba(5, 3, 8, 0.55);
    white-space: nowrap;
  }

  .hb-plus {
    font-family: var(--font-mono);
    font-weight: 400;
    font-size: 1.05em;
    color: var(--purple-300);
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 1080px) {
    .hero {
      grid-template-columns: minmax(0, 1fr);
      padding: clamp(60px, 8.4vh, 84px) clamp(18px, 5vw, 30px) 0;
    }

    .core {
      grid-column: 1;
      padding: 0;
    }

    .hero-intro {
      width: min(300px, 56vw);
    }
  }

  @media (max-width: 760px) {
    .ribbon-item {
      font-size: clamp(3.6rem, 17vw, 6.4rem);
    }

    .hero-meta {
      display: none;
    }

    .hero-intro {
      width: min(280px, 72vw);
      top: clamp(72px, 10vh, 100px);
    }

    .hero-bottom {
      padding-bottom: 12px;
    }
  }

  /* ===== RED DE SEGURIDAD (.settled): estado final forzado =====
     Solo actúa si JS detectó que pasaron 3.6s (todo ya terminó en un
     navegador normal, o el reloj estaba congelado en uno raro). */
  .hero.settled .hero-robot {
    animation: none;
    opacity: 1;
  }

  .hero.settled .ribbon {
    animation: none;
    opacity: 1;
  }

  .hero.settled .ribbon-item {
    animation: none;
    opacity: 1;
    transform: none;
    filter: none;
  }

  .hero.settled .hero-chrome {
    animation: none;
    opacity: 1;
  }

  /* ===== SCROLL DETECTADO: cancelar animaciones de entrada inmediatamente =====
     (.scroll-active la añade el JS del parallax en runtime → :global para
     que Svelte no la pode del CSS compilado.) */
  .hero:global(.scroll-active) .hero-robot {
    animation: none !important;
  }

  .hero:global(.scroll-active) .ribbon {
    animation: none !important;
  }

  .hero:global(.scroll-active) .ribbon-item {
    animation: none !important;
  }

  .hero:global(.scroll-active) .hero-chrome {
    animation: none !important;
  }

  @media (prefers-reduced-motion: reduce) {
    /* cinta quieta: el lema sigue cruzando la cara, pero sin recorrido */
    .ribbon-track {
      animation: none;
    }
    /* halos y atmósfera estáticos: sin deriva */
    .core::before,
    .core::after {
      animation: none;
    }
    /* chrome y coreografía de entrada: todo visible de inmediato */
    .hero-intro,
    .hero-meta,
    .hero-bottom,
    .hero-robot,
    .ribbon,
    .ribbon-item,
    .hero-chrome {
      animation: none;
    }
  }

</style>
