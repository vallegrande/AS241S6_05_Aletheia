<script>
  /**
   * App.svelte — raíz de Aletheia: el RECORRIDO.
   *
   *   /            → landing: nav + hud + seis escenas apiladas.
   *   #/section    → scroll a la escena correspondiente.
   *   #/panel      → dashboard de la DApp.
   *
   * Sesión ↔ ruta: cerrar sesión en el panel expulsa a la landing;
   * iniciar sesión (desde donde sea) manda al panel. La restauración
   * inicial de sesión NO redirige (respeta dónde entró el visitante).
   *
   * Cada escena se declara con su `length` (viewports de contenido fijado),
   * su `accent` (luz propia) y su `scrim` (opacidad de su suelo). El cableado
   * entre escenas (entrada / retroceso / cubrir) vive en initSceneStack.
   */
  import { onMount } from 'svelte'
  import GlobalBackground from './lib/components/GlobalBackground.svelte'
  import NavExpand from './lib/components/NavExpand.svelte'
  import Hero from './lib/components/Hero.svelte'
  import ManifestSection from './lib/components/ManifestSection.svelte'
  import ObjectiveProtocol from './lib/components/ObjectiveProtocol.svelte'
  import EvidenceBenefits from './lib/components/EvidenceBenefits.svelte'
  import SystemOrbit from './lib/components/SystemOrbit.svelte'
  import AuthorSignature from './lib/components/AuthorSignature.svelte'
  import ProjectSection from './lib/components/ProjectSection.svelte'
  import Scrollbar from './lib/components/Scrollbar.svelte'
  import ToastStack from './lib/components/ToastStack.svelte'
  import ScrollScene from './lib/components/ScrollScene.svelte'
  import Panel from './lib/components/Panel.svelte'
  import { initSceneStack } from './lib/scroll/stack'
  import { initCovers } from './lib/scroll/cover'
  import { initAuth, auth } from './lib/stores/auth'
  import { initWallet } from './lib/stores/wallet'

  let route = $state(location.hash)
  let stackEl = $state(null)
  // Ruta de app (vive en #/panel) vs landing cinematográfica. Solo conmuta
  // qué se renderiza; el diseño de la landing queda intacto.
  let isPanel = $derived(route === '#/panel')

  onMount(() => {
    // Firebase: restaura la sesión de Google previa si existe.
    initAuth().catch((err) => console.error('[aletheia] initAuth:', err))
    // Detección silenciosa de Pali Wallet (sin popup).
    initWallet().catch((err) => console.error('[aletheia] initWallet:', err))

    // Coreografía entre escenas: vive en un efecto aparte para montarse
    // SOLO en la landing (en #/panel no hay stack de escenas).
    const onHash = () => {
      route = location.hash
      window.scrollTo(0, 0)
      // volver a la landing y respetar el ancla (#inicio)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const id = route.slice(1)
          if (id && !id.includes('/')) {
            const target = document.getElementById(id)
            if (target) {
              const pull = target.style.getPropertyValue('--pull')
              const pullVal = parseFloat(pull) || 0
              const offset = target.offsetTop + (pullVal > 0 ? pullVal * window.innerHeight : 0)
              window.scrollTo({ top: offset, behavior: 'instant' })
            }
          }
        }),
      )
    }
    window.addEventListener('hashchange', onHash)
    return () => {
      window.removeEventListener('hashchange', onHash)
    }
  })

  // Stack de escenas solo en landing: al entrar a #/panel se desmonta
  // (teardown) y al volver se re-inicializa.
  $effect(() => {
    if (isPanel || !stackEl) return
    const teardown = initSceneStack(stackEl)
    // Física de muelle para TODAS las láminas entrantes (hero→01, 01→02, …).
    const teardownCover = initCovers()
    return () => {
      teardown()
      teardownCover()
    }
  })

  /* ===== Sesión ↔ ruta =====
     La sesión decide el destino, pero SOLO en transiciones explícitas:
     el primer settle de Firebase (restauración de sesión al cargar la
     página) no mueve a nadie — respeta dónde entró el visitante.
       · Cerrar sesión estando en #/panel → expulsado a la landing
         (REEMPLAZA el entry del historial: atrás no reabre el panel).
       · Iniciar sesión (desde donde sea) → mandado al panel.
       · Regla PERMANENTE: sin sesión, #/panel expulsa a #inicio — cubre
         el botón atrás del navegador (popstate dispara hashchange).

     Comparación por UID: Firebase puede emitir objetos User distintos
     para el mismo usuario (refresh de token); uid es estable. */
  let authSettled = false
  let prevUid = null

  function kickToLanding() {
    // reemplaza el entry del historial: atrás NO reabre el panel.
    // OJO: si location.hash ya era '#inicio', asignarlo no dispara
    // hashchange — la pipeline (route/render) se dispara A MANO.
    history.replaceState(history.state, '', '#inicio')
    if (location.hash === '#inicio') {
      route = '#inicio' // pipeline a mano
      window.scrollTo(0, 0)
    } else {
      location.hash = '#inicio' // hashchange normal
    }
  }

  $effect(() => {
    const ready = $auth.ready
    const user = $auth.user
    if (!ready) return
    const uid = user?.uid ?? null
    if (!authSettled) {
      // primer settle: fija el punto de partida y aplica la regla panel↔sesión
      authSettled = true
      prevUid = uid
      // SIN SESIÓN NO HAY PANEL: si restauró (o entró) sobre #/panel a oscuras,
      // expulsa — el visitante legítimo (con sesión) no se mueve.
      if (!uid && location.hash === '#/panel') kickToLanding()
      return
    }
    /* GUARDIA PERMANENTE: sin sesión no hay panel (cubre atrás/popstate) */
    if (!uid && location.hash === '#/panel') {
      kickToLanding()
      prevUid = null
      return
    }
    if (prevUid === uid) return
    const wasSignedIn = Boolean(prevUid)
    prevUid = uid
    if (wasSignedIn && !uid) {
      // cerró sesión: fuera del panel, a la landing (entry reemplazado)
      kickToLanding()
    } else if (!wasSignedIn && uid) {
      // inició sesión: al panel
      location.hash = '#/panel'
    }
  })
</script>

<GlobalBackground />
{#if !isPanel}
  <NavExpand />
{/if}
{#if !isPanel}
  <Scrollbar />
{/if}

{#if isPanel}
  <Panel />
{:else}
  <main bind:this={stackEl}>
  <!-- 00 · Aparición: el único escenario sin suelo propio (muestra el mesh) -->
  <ScrollScene id="inicio" length={0} accent="#a78bfa" scrim={0} isHero={true}>
    <Hero />
  </ScrollScene>

  <!-- 01 · Manifiesto: entra desde la DERECHA -->
  <ScrollScene id="descripcion" length={6} scrim={0} pull={1} from="right">
    <ManifestSection />
  </ScrollScene>

  <!-- 02 · Proyecto: arquitectura interactiva, entra desde la IZQUIERDA -->
  <ScrollScene id="proyecto" length={4} scrim={0} pull={1} from="left">
    <ProjectSection />
  </ScrollScene>

  <!-- 03 · Estaciones: cinco objetivos, entra desde ABAJO -->
  <ScrollScene id="objetivos" length={4.5} scrim={0} pull={1} from="bottom">
    <ObjectiveProtocol />
  </ScrollScene>

  <!-- 04 · Reordenación: evidencia dispersa, entra desde la DERECHA -->
  <ScrollScene id="beneficios" length={4.2} scrim={0} pull={1} from="right">
    <EvidenceBenefits />
  </ScrollScene>

  <!-- 05 · Instrumento: ocho capacidades, entra desde la IZQUIERDA -->
  <ScrollScene id="caracteristicas" length={5} scrim={0} pull={1} from="left">
    <SystemOrbit />
  </ScrollScene>

  <!-- 06 · Firma: colofón y cierre editorial, entra desde ABAJO -->
  <ScrollScene id="desarrollador" length={2.6} scrim={0} pull={1} from="bottom">
    <AuthorSignature />
  </ScrollScene>
  </main>
{/if}

<ToastStack />
