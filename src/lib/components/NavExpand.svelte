<script>
  /**
   * NavbarExpand — header pill flotante con logo real de Aletheia.
   *
   * Basado en la variante "Expanding pill" de beUI Pro:
   *  - Pill redondeada centrada que EXPANDE su ancho con el scroll (spring).
   *  - Pill compartida de hover/activo que se desliza entre enlaces y sigue
   *    también la sección visible mientras se hace scroll (scroll-spy).
   *  - Logo real del proyecto (/aletheia-logo.png) + nombre.
   *  - Enlaces = TODAS las secciones de la landing:
   *      visitante → Inicio · Descripción · Objetivos · Beneficios ·
   *                  Características · Desarrollador
   *  - CTA de sesión a la derecha: "Entrar" (Google) o avatar + menú.
   *  - Móvil: hamburger con panel overlay.
   */
  import { auth, signOutGoogle } from '../stores/auth'
  import { wallet, disconnectWallet } from '../stores/wallet'
  import GoogleMark from './GoogleMark.svelte'
  import Icon from './Icon.svelte'
  import LoginModal from './LoginModal.svelte'
  import { fly } from 'svelte/transition'
  import { onMount } from 'svelte'

  let {
    brand = 'Aletheia',
    brandHref = '#inicio',
  } = $props()

  /* ---------------- secciones del sitio (spec MVP) ---------------- */
  const baseItems = [
    { id: 'inicio', label: 'Inicio', href: '#inicio' },
    { id: 'descripcion', label: 'Manifiesto', href: '#descripcion' },
    { id: 'proyecto', label: 'Proyecto', href: '#proyecto' },
    { id: 'objetivos', label: 'Objetivos', href: '#objetivos' },
    { id: 'beneficios', label: 'Beneficios', href: '#beneficios' },
    { id: 'caracteristicas', label: 'Características', href: '#caracteristicas' },
    { id: 'desarrollador', label: 'Desarrollador', href: '#desarrollador' },
    { id: 'verificar', label: 'Verificar', href: '#/verificar' },
  ]

  const user = $derived($auth.user)
  // Ruta actual: el header es dinámico — en #/panel muestra "Panel" como
  // sección activa en vez del scroll-spy de la landing.
  let routeHash = $state(typeof location !== 'undefined' ? location.hash : '')
  const isPanel = $derived(routeHash === '#/panel')
  const panelItem = { id: 'panel', label: 'Panel', href: '#/panel' }
  const items = $derived(isPanel ? [panelItem] : baseItems)
  /* ---------------- estado ---------------- */
  let scrollY = $state(0)
  let activeId = $state('inicio')
  let hoverId = $state(null)
  let accountOpen = $state(false) // menú de cuenta (avatar)
  let mobileOpen = $state(false) // menú móvil (hamburger)
  let authError = $state('')

  // scroll>12 → pill con borde/glow más presente
  const scrolledPast = $derived(scrollY > 12)
  const authLoading = $derived($auth.loading)
  const initial = $derived((user?.displayName ?? user?.email ?? 'A').trim().charAt(0).toUpperCase())

  // Zona Web3: SOLO visible con sesión de Google (el orden es Google → wallet)
  const connected = $derived(Boolean(user) && $wallet.connected)
  const address = $derived($wallet.address)

  // La pill mide lo que su contenido necesita (width: max-content). El ancho
  // adicional se calcula desde esa medida, sin depender del viewport.
  const SPRING = { stiffness: 170, damping: 24, mass: 0.8 }

  let grow = $state(0) // 0 → 1 con spring (alimenta el ancho limitado)
  let growVel = 0
  let linkOpacity = $state(0.82)
  let linkX = $state(-4)

  // estado objetivo según scroll — se recalcula solo cuando scrollY cambia
  let targetGrow = 0
  let targetO = 0.82
  let targetX = -4

  /* ===== EXPANSIÓN A LOS COSTADOS =====
     Al hacer scroll la pill conserva su proporción: solo puede crecer un
     20 % respecto de su ancho inicial. La anchura base se mide con
     max-content y el spring sigue gobernando una transición suave. */
  let pillEl = $state(null)
  let baseW = $state(0)
  let wide = $state(true)
  const MAX_WIDTH_GROWTH = 0.2

  function measurePill() {
    if (!pillEl) return
    pillEl.style.width = 'max-content'
    baseW = pillEl.offsetWidth
    pillEl.style.width = ''
  }

  $effect(() => {
    // re-medir cuando cambia el contenido (Google ↔ avatar ↔ estado)
    void authLoading
    void user
    void connected
    void wide
    measurePill()
  })

  onMount(() => {
    const mq = window.matchMedia('(min-width: 1100px)')
    wide = mq.matches
    const onMq = (e) => (wide = e.matches)
    mq.addEventListener('change', onMq)
    const onHash = () => {
      routeHash = location.hash
      closeAllMenus()
    }
    window.addEventListener('hashchange', onHash)
    measurePill()
    document.fonts?.ready?.then(measurePill)
    window.addEventListener('resize', measurePill, { passive: true })
    return () => {
      mq.removeEventListener('change', onMq)
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('resize', measurePill)
    }
  })

  $effect(() => {
    const y = scrollY
    const progress = Math.min(Math.max(y / 280, 0), 1)
    targetGrow = progress
    targetO = 0.82 + Math.min(Math.max(y / 180, 0), 1) * 0.18 // .82 → 1
    targetX = -4 * (1 - Math.min(Math.max(y / 180, 0), 1)) // -4 → 0
  })

  // integration spring en rAF — separado del efecto de scroll para no
  // disparar actualizaciones en cascada (effect_update_depth_exceeded)
  $effect(() => {
    let raf = requestAnimationFrame(function tick() {
      const dt = 1 / 60
      const acc = -SPRING.stiffness * (grow - targetGrow) - SPRING.damping * growVel
      growVel += acc * dt
      grow += growVel * dt
      if (grow < 0) {
        grow = 0
        growVel = 0
      }

      // lerp suave para opacidad y desplazamiento
      linkOpacity += (targetO - linkOpacity) * 0.16
      linkX += (targetX - linkX) * 0.16

      raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  })

  // sección activa efectiva: la inicial es el primer item
  const pillId = $derived(hoverId ?? activeId ?? items[0]?.id ?? '')

  /* ---------------- compartida deslizante (hover/activo) ---------------- */
  /* Una sola pill vive bajo los enlaces y se MUEVE con transform (GPU):
     nunca se "teletransporta" ni aparece/desaparece entre enlaces. */
  let sliderEl = $state(null)
  let linksEl = $state(null)
  let sliderTarget = $state(null)
  let sliderReady = $state(false)

  /* La pill se coloca con translate3d(left, top) —NO con translateX suelto—:
     si el transform inline sólo lleva la X, borra el centrado vertical del
     CSS y la pill cae media altura por debajo de la etiqueta. Con las dos
     coordenadas, la pill copia EXACTAMENTE la caja del enlace. */
  function placeSlider(el) {
    if (!sliderEl || !el) return
    sliderEl.style.width = `${el.offsetWidth}px`
    sliderEl.style.height = `${el.offsetHeight}px`
    sliderEl.style.transform = `translate3d(${el.offsetLeft}px, ${el.offsetTop}px, 0)`
  }

  function moveSlider() {
    if (!sliderTarget) return
    placeSlider(sliderTarget)
    sliderReady = true
  }

  $effect(() => {
    // cuando cambia el objetivo (hover o activo), desliza hacia él
    if (!linksEl) return
    const id = pillId
    const el = linksEl.querySelector(`[data-id="${id}"]`)
    if (el) {
      sliderTarget = el
      moveSlider()
    }
  })

  $effect(() => {
    // primer posicionamiento + reposición en resize (sin transición brusca)
    if (!linksEl) return
    const ro = new ResizeObserver(() => placeSlider(sliderTarget))
    ro.observe(linksEl)
    return () => ro.disconnect()
  })

  /* ---------------- sección activa según el scroll (scroll-spy) ---------------- */
  /* La sección activa es la última cuyo inicio ya cruzó la línea de lectura
     (35% del alto de la ventana): la pill y el resaltado siguen el scroll sin
     depender de un clic. Al pasar el puntero manda el hover (hoverId se
     limpia solo al salir de la lista) y al llegar al final de la página se
     marca la última sección, aunque su inicio nunca cruce la línea. */
  $effect(() => {
    // En el panel no hay secciones de landing: la activa es siempre "Panel".
    if (isPanel) {
      if (activeId !== 'panel') activeId = 'panel'
      return
    }
    const y = scrollY
    const viewport = window.innerHeight
    const probe = y + viewport * 0.35
    let current = ''

    for (const item of items) {
      const el = document.getElementById(item.href.slice(1))
      if (!el) continue
      if (el.getBoundingClientRect().top + y <= probe) current = item.id
    }

    // al final de la página manda la última sección… pero solo si la página
    // se puede desplazar: sin scroll no hay "final" y el resaltado se
    // quedaría pegado al último enlace con la página quieta.
    const scrollable = document.documentElement.scrollHeight - viewport > 4
    if (scrollable && y + viewport >= document.documentElement.scrollHeight - 2) {
      current = items[items.length - 1]?.id ?? current
    }

    if (current && current !== activeId) activeId = current
  })

  /* ---------------- acciones ---------------- */
  let showLoginModal = $state(false)

  function openLoginModal() {
    showLoginModal = true
    closeAllMenus()
  }

  function closeLoginModal() {
    showLoginModal = false
  }

  async function handleSignOut() {
    // Salir también desconecta la wallet: el orden Google → wallet se mantiene.
    await disconnectWallet().catch(() => {})
    await signOutGoogle()
    accountOpen = false
  }

  function closeAllMenus() {
    accountOpen = false
    mobileOpen = false
  }
</script>

<svelte:window bind:scrollY />

  <header class="expand-header" class:is-scrolled={scrolledPast} class:panel-mode={isPanel}>
    <nav
      aria-label="Primary"
      class="expand-pill"
      bind:this={pillEl}
      style="width: {wide && baseW > 0
        ? `${baseW * (1 + Math.max(0, Math.min(1, grow)) * MAX_WIDTH_GROWTH)}px`
        : 'max-content'}"
    >
      <!-- Brand: logo real + nombre -->
      <a
        href={brandHref}
        class="brand"
        onclick={() => {
          activeId = items[0]?.id ?? ''
          closeAllMenus()
        }}
      >
        <img class="brand-logo" src="/aletheia-logo.png" alt="" width="30" height="34" />
        <span class="brand-name">{brand}</span>
      </a>

  <!-- Enlaces desktop (todas las secciones) -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="links" bind:this={linksEl} onpointerleave={() => (hoverId = null)} style="opacity: {linkOpacity}; transform: translateX({linkX}px)">
        <!-- compartida: se DESLIZA (transform) entre enlaces con el rAF de abajo -->
        <span class="pill-slider" class:slider-visible={sliderReady} bind:this={sliderEl} aria-hidden="true"></span>
        {#each items as item (item.id)}
          <a
            href={item.href}
            class="link"
            class:active={activeId === item.id}
            data-id={item.id}
            onclick={() => (activeId = item.id)}
            onpointerenter={(e) => { hoverId = item.id; sliderTarget = e.currentTarget; moveSlider() }}
            onfocus={(e) => { sliderTarget = e.currentTarget; moveSlider() }}
          >
            {item.label}
          </a>
        {/each}
      </div>

    <!-- CTA / estado de sesión -->
    <div class="cta-slot">
      {#if authLoading}
        <span class="pill-state pill-connecting" aria-live="polite">
          <span class="dot spin"></span> Abriendo Google…
        </span>
      {:else if user}
        <button
          class="pill-account"
          onclick={() => { accountOpen = !accountOpen; mobileOpen = false }}
          aria-expanded={accountOpen}
          aria-haspopup="menu"
          aria-label="Cuenta"
          title={user.displayName ?? user.email}
        >
          {#if user.photoURL}
            <img class="avatar" src={user.photoURL} alt="" referrerpolicy="no-referrer" />
          {:else}
            <span class="avatar avatar-fallback" aria-hidden="true">{initial}</span>
          {/if}
          {#if connected}
            <span class="dot dot-live" aria-hidden="true"></span>
          {/if}
        </button>
      {:else}
        <button class="google-btn" onclick={openLoginModal} aria-label="Iniciar sesión con Google" title="Iniciar sesión con Google">
          <GoogleMark size={20} />
        </button>
      {/if}

      <!-- Hamburger móvil -->
      <button
        type="button"
        class="hamburger"
        onclick={() => { mobileOpen = !mobileOpen; accountOpen = false }}
        aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={mobileOpen}
      >
        <span class="hamburger-bars" class:open={mobileOpen}>
          <span class="bar bar-a"></span>
          <span class="bar bar-b"></span>
          <span class="bar bar-c"></span>
        </span>
      </button>
    </div>
  </nav>

  <!-- menú de cuenta (avatar → panel con datos + cerrar sesión) -->
  {#if accountOpen && user}
    <div
      class="overlay-menu"
      role="menu"
      transition:fly={{ y: -8, duration: 180 }}
    >
      <div class="menu-user">
        {#if user.photoURL}
          <img class="avatar avatar-lg" src={user.photoURL} alt="" referrerpolicy="no-referrer" />
        {:else}
          <span class="avatar avatar-lg avatar-fallback" aria-hidden="true">{initial}</span>
        {/if}
        <div class="menu-user-data">
          <p class="menu-user-name">{user.displayName ?? 'Sin nombre'}</p>
          <p class="muted small">{user.email}</p>
        </div>
      </div>
      {#if connected}
        <p class="mono addr-full">{address}</p>
      {/if}
      <div class="menu-actions">
        <a class="btn btn-sm menu-panel-link" href={isPanel ? '#inicio' : '#/panel'} onclick={closeAllMenus}>
          {#if isPanel}Volver al inicio{:else if $auth.user}Abrir panel{:else}Crear identidad{/if}
        </a>
        {#if $auth.user}
          <button class="btn btn-sm" onclick={handleSignOut}>Cerrar sesión</button>
        {/if}
      </div>
    </div>
  {:else if mobileOpen}
    <!-- menú móvil con TODAS las secciones -->
    <div class="overlay-menu" transition:fly={{ y: -8, duration: 180 }}>
      {#each items as item (item.id)}
        <a
          href={item.href}
          class="overlay-link"
          onclick={() => {
            activeId = item.id
            mobileOpen = false
          }}>{item.label}</a
        >
      {/each}
      {#if isPanel}
        <a
          href="#inicio"
          class="overlay-link overlay-cta"
          onclick={() => {
            mobileOpen = false
          }}>Volver al inicio <Icon name="arrow" size={15} /></a
        >
      {:else if !user}
        <button class="overlay-link overlay-cta" onclick={openLoginModal}>
          Iniciar sesión <Icon name="arrow" size={15} />
        </button>
      {:else}
        <button class="overlay-link overlay-cta" onclick={closeAllMenus}>
          Mi panel <Icon name="arrow" size={15} />
        </button>
      {/if}
    </div>
  {/if}

  {#if authError}
    <p class="connect-error small fade-in" role="alert">{authError}</p>
  {/if}
</header>

{#if showLoginModal}
  <LoginModal onClose={closeLoginModal} />
{/if}

{#if accountOpen || mobileOpen}
  <button class="scrim" aria-label="Cerrar menú" onclick={closeAllMenus}></button>
{/if}

<style>
  /* Fijo: flota sobre el hero desde y=0, sin ocupar espacio en el flujo
     (así el video cubre toda la parte superior sin cortes). */
  .expand-header {
    position: fixed;
    top: 12px;
    left: 0;
    right: 0;
    z-index: 50;
    padding: 0 16px;
    pointer-events: none;
    /* ENTRADA: cae desde arriba con fade al cargar la página,
       en conversación con la coreografía del hero */
    animation: nav-enter 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both;
  }

  @keyframes nav-enter {
    from {
      opacity: 0;
      transform: translateY(-18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .expand-pill {
    pointer-events: auto;
    margin-inline: auto;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: space-between; /* con la expansión: logo | links | Google */
    gap: 8px;
    overflow: visible;
    /* la anchura la maneja el style inline (max-content + spring).
       Este valor es el fallback si JS aún no midió. */
    width: max-content;
    max-width: calc(100vw - 2rem);
    border-radius: 999px;
    border: 1px solid rgba(167, 139, 250, 0.24);
    background: linear-gradient(180deg, rgba(52, 40, 96, 0.38), rgba(38, 28, 74, 0.46));
    backdrop-filter: blur(18px) saturate(1.25);
    padding: 0 12px;
    box-shadow:
      0 8px 32px rgba(20, 8, 44, 0.35),
      inset 0 1px 0 rgba(196, 181, 253, 0.12);
    transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
  }

  /* En el panel hay sidebar fijo de 320px: la pill se centra en el
     espacio restante en vez de montarse sobre el sidebar. */
  .expand-header.panel-mode {
    padding: 0 16px 0 266px;
  }

  @media (max-width: 900px) {
    /* sin sidebar en móvil: la pill vuelve a centrarse sola */
    .expand-header.panel-mode {
      padding: 0 16px;
    }
  }

  /* con scroll: un poco más de cuerpo para no perder legibilidad */
  .expand-header.is-scrolled .expand-pill {
    border-color: rgba(167, 139, 250, 0.4);
    background: linear-gradient(180deg, rgba(52, 40, 96, 0.55), rgba(38, 28, 74, 0.62));
    box-shadow:
      0 10px 40px rgba(20, 8, 44, 0.4),
      0 0 32px rgba(124, 58, 237, 0.15),
      inset 0 1px 0 rgba(196, 181, 253, 0.15);
  }

  /* ---- brand: logo real ---- */
  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
    flex-shrink: 0;
    color: var(--white);
    text-decoration: none;
    border-radius: 999px;
    padding-right: 14px;
  }

  .brand:hover {
    text-decoration: none;
  }

  .brand-logo {
    width: 28px;
    height: auto;
    filter: none;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .brand:hover .brand-logo {
    transform: scale(1.1) rotate(-4deg);
  }

  .brand-name {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: linear-gradient(90deg, var(--white), var(--purple-300));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* ---- links ---- */
  .links {
    display: none;
    align-items: center;
    transition: opacity 0.2s ease;
  }

  .link {
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 0.84rem;
    font-weight: 500;
    color: var(--gray-400);
    text-decoration: none;
    outline: none;
    transition: color 0.18s ease;
    white-space: nowrap;
  }

  /* Inicio (primero) respira un poco más */
  .link:first-child {
    padding: 0 17px;
  }

  .link:hover,
  .link.active {
    color: var(--white);
  }

  .link:focus-visible {
    outline: 2px solid var(--purple-400);
    outline-offset: 1px;
  }

  /* ---- compartida deslizante: UNA pill bajo los enlaces que se MUEVE
     (solo transform + width/height inline). Con focus por teclado también
     se coloca → la tecla Tab Navega y la pill sigue el both hover/focus. ---- */
  .links {
    position: relative;
  }

  .pill-slider {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
    width: 0;
    height: 30px;
    border-radius: 999px;
    background: rgba(124, 58, 237, 0.18);
    border: 1px solid rgba(167, 139, 250, 0.22);
    opacity: 0;
    /* JS escribe translate3d(left, top): misma caja que el enlace activo */
    transform: translate3d(0, 0, 0);
    transition:
      transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
      width 0.32s cubic-bezier(0.22, 1, 0.36, 1),
      height 0.2s ease,
      opacity 0.18s ease;
    pointer-events: none;
    will-change: transform;
  }

  .pill-slider.slider-visible {
    opacity: 1;
  }

  /* los enlaces viven SOBRE la compartida */
  .links > .link {
    z-index: 1;
  }

  /* ---- CTA / cuenta ---- */
  .cta-slot {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 6px;
    margin-left: 18px;
  }

  /* ---- botón Google: SOLO el ícono, fondo = color del navbar ---- */
  .google-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid rgba(167, 139, 250, 0.35);
    border-radius: 999px;
    background: linear-gradient(180deg, rgba(52, 40, 96, 0.85), rgba(38, 28, 74, 0.9));
    color: var(--purple-300);
    cursor: pointer;
    transition: border-color 0.2s ease, transform 0.15s ease, background 0.2s ease;
  }

  .google-btn:hover {
    border-color: rgba(196, 181, 253, 0.65);
    background: linear-gradient(180deg, rgba(64, 50, 116, 0.9), rgba(48, 36, 92, 0.95));
    transform: translateY(-1px);
  }

  .google-btn:focus-visible {
    outline: 2px solid var(--purple-400);
    outline-offset: 2px;
  }

  .pill-state {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 0.84rem;
    white-space: nowrap;
  }

  .pill-connecting {
    color: var(--gray-400);
    border: 1px dashed rgba(167, 139, 250, 0.3);
    cursor: default;
  }

  .pill-account {
    position: relative;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border-radius: 999px;
    border: 2px solid rgba(167, 139, 250, 0.4);
    background: transparent;
    color: var(--white);
    cursor: pointer;
    overflow: visible;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .pill-account .avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  .pill-account:hover {
    border-color: rgba(196, 181, 253, 0.7);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.35);
  }

  .avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    flex: none;
    object-fit: cover;
  }

  .avatar-fallback {
    display: grid;
    place-items: center;
    background: linear-gradient(160deg, var(--purple-500), var(--purple-700));
    color: var(--white);
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .avatar-lg {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--gray-500);
    flex: none;
  }

  .dot-live {
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--ok);
    border: 2px solid var(--black-900);
    box-shadow: 0 0 8px rgba(110, 231, 183, 0.7);
    animation: pulse-dot 2.4s ease-in-out infinite;
  }

  .dot.spin {
    animation: spin 1s linear infinite;
    background: linear-gradient(var(--purple-400), transparent) no-repeat, var(--gray-600);
  }

  /* ---- hamburger (solo móvil) ---- */
  .hamburger {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 999px;
    color: var(--white);
    cursor: pointer;
  }

  .hamburger:focus-visible {
    outline: 2px solid var(--purple-400);
  }

  .hamburger-bars {
    position: relative;
    display: block;
    width: 16px;
    height: 14px;
  }

  .bar {
    position: absolute;
    left: 0;
    width: 100%;
    height: 2px;
    border-radius: 999px;
    background: currentColor;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), top 0.25s cubic-bezier(0.22, 1, 0.36, 1),
      bottom 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.18s ease;
  }

  .bar-a { top: 0; }
  .bar-b { top: 6px; }
  .bar-c { bottom: 0; }

  .hamburger-bars.open .bar-a {
    top: 6px;
    transform: rotate(45deg);
  }
  .hamburger-bars.open .bar-b {
    opacity: 0;
  }
  .hamburger-bars.open .bar-c {
    bottom: 6px;
    transform: rotate(-45deg);
  }

  /* ---- overlay menú (móvil + cuenta) ---- */
  .overlay-menu {
    pointer-events: auto;
    position: absolute;
    top: 62px;
    left: 16px;
    right: 16px;
    margin-inline: auto;
    max-width: 28rem;
    border-radius: 24px;
    border: 1px solid rgba(167, 139, 250, 0.18);
    background: rgba(10, 7, 16, 0.95);
    backdrop-filter: blur(24px);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  }

  .overlay-link {
    display: block;
    min-height: 40px;
    padding: 10px 12px;
    border-radius: 16px;
    font-weight: 500;
    font-size: 0.92rem;
    color: var(--white);
    text-decoration: none;
  }

  .overlay-link:hover {
    background: rgba(124, 58, 237, 0.15);
  }

  .overlay-cta {
    margin-top: 4px;
    border-top: 1px solid rgba(167, 139, 250, 0.14);
    border-radius: 0 0 16px 16px;
    color: var(--purple-300);
  }

  .menu-user {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px 6px;
  }

  .menu-user-name {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    color: var(--white);
    font-size: 0.95rem;
  }

  .menu-user-data p {
    margin: 0;
  }

  .addr-full {
    word-break: break-all;
    color: var(--gray-200);
    font-size: 0.78rem;
    padding: 8px 12px;
  }

  .menu-actions {
    display: flex;
    gap: 8px;
    padding: 4px 8px 8px;
  }

  .connect-error {
    pointer-events: auto;
    margin: 8px auto 0;
    width: min(49rem, calc(100vw - 2rem));
    color: var(--err);
  }

  .scrim {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: transparent;
    border: none;
    cursor: default;
  }

  /* ---- breakpoints ----
     Los 6 links solo entran con holgura desde ~1100px: debajo de eso,
     hamburger (la pill max-content no puede recortarse). */
  @media (min-width: 1100px) {
    .links {
      display: flex;
    }
    .hamburger {
      display: none;
    }
    /* el menú móvil no existe en desktop */
    .overlay-menu {
      display: none;
    }
    .overlay-menu:has(.menu-user) {
      display: flex; /* el menú de cuenta sí aparece en desktop */
    }
  }

  /* franja intermedia (900–1100px): pill compacta con brand + sesión */
  @media (min-width: 900px) and (max-width: 1099.98px) {
    .overlay-menu {
      max-width: 22rem;
    }
  }

  @media (hover: none) {
    .pill-account {
      width: 40px;
      height: 40px;
    }

    .google-btn {
      min-height: 40px;
    }
  }
</style>
