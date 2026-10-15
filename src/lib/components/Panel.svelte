<script>
  /**
   * Panel — dashboard de Aletheia (vive en #/panel, separada de la landing).
   *
   * Layout: header fijo a todo el ancho del contenido (saludo + cuenta del
   * usuario) + rail de 260px colapsable que llega hasta arriba (píldora
   * deslizante + aurora morada) + main.
   *
   * Módulos: Transacción y Consultas (tabs internas: individual | masiva)
   * viven en el main. Red → tuerca del rail (modal). Wallet → kebab de la
   * tarjeta del rail (modal con AuthGate). El navbar flotante de la landing
   * NO se renderiza aquí (App.svelte). En móvil el rail es un drawer.
   *
   * Sin sesión → wallet y transacción muestran su puerta de login (AuthGate);
   * red y saldos son públicos. El orden es SIEMPRE Google → wallet.
   */
  import '../../styles/dapp.css'
  import '../../styles/sidebar.css'
  import { auth } from '../stores/auth'
  import { wallet, shortenAddress } from '../stores/wallet'
  import { network, initNetworkSync } from '../stores/network'
  import { getNetwork } from '../web3/networks'
  import AuthGate from './AuthGate.svelte'
  import WalletSection from './WalletSection.svelte'
  import TransactionSection from './TransactionSection.svelte'
  import NetworkSwitcher from './NetworkSwitcher.svelte'
  import QueriesSection from './QueriesSection.svelte'
  import PanelAccount from './PanelAccount.svelte'
  import PanelModal from './PanelModal.svelte'
  import TransactionModal from './TransactionModal.svelte'
  import Icon from './Icon.svelte'
  import { OPEN_WALLET_MODAL } from '../stores/panelBus'
  import { onMount } from 'svelte'

  const user = $derived($auth.user)

  // Tira de contexto: solo lectura del estado real (no cambia lógica).
  const activeNet = $derived(getNetwork($network.activeId))
  const walletOn = $derived($wallet.connected)

  /* Módulos del panel: transacción y consultas viven en el main.
     Red → tuerca del sidebar (modal). Wallet → kebab de la tarjeta
     del sidebar (modal). Saldo individual + masiva → tabs de Consultas. */
  const NAV = [
    { id: 'tx', label: 'Transacciones', icon: 'zap' },
    { id: 'consultas', label: 'Consultas', icon: 'search' },
  ]

  let activeTab = $state('tx')
  let sideOpen = $state(false)
  let netOpen = $state(false)
  let walletOpen = $state(false)
  let txModalOpen = $state(false)

  /* Header DINÁMICO: título/subtítulo del módulo activo (vive en el header,
     nunca dentro del contenido de la sección). */
  const MODULES = {
    tx: { title: 'Transacciones', sub: 'La DApp nunca firma: la aprobación ocurre en Pali Wallet.', icon: 'zap' },
    consultas: { title: 'Consultas', sub: 'Lee saldos on-chain de cualquier cuenta, individual o en lote.', icon: 'search' },
  }
  const moduleMeta = $derived(MODULES[activeTab] ?? MODULES.tx)

  // Sidebar: posición del item activo (alimenta la píldora CSS) y estado
  // de colapso del rail (solo iconos), persistido entre visitas.
  const activeIdx = $derived(NAV.findIndex((t) => t.id === activeTab))
  let collapsed = $state(typeof localStorage !== 'undefined' && localStorage.getItem('sb-collapsed') === '1')

  /* Coleta de expansión: despierta con hover (cabecera/logo o la propia
     coleta) y se OCULTA con gracia (600ms). Manejado en JS porque
     pointer-events no es animable: la gracia de CSS dejaba clicks caídos
     en el trayecto logo→coleta (pointer-events vuelve instantáneo). */
  let tailAwake = $state(false)
  let tailTimer = null

  function wakeTail() {
    if (tailTimer) {
      clearTimeout(tailTimer)
      tailTimer = null
    }
    tailAwake = true
  }

  function sleepTail() {
    if (tailTimer) clearTimeout(tailTimer)
    tailTimer = setTimeout(() => {
      tailAwake = false
      tailTimer = null
    }, 600)
  }

  /* al expandir por la coleta, se duerme de inmediato (ya no existe) */
  function toggleCollapse() {
    collapsed = !collapsed
    tailAwake = false
    if (tailTimer) {
      clearTimeout(tailTimer)
      tailTimer = null
    }
    try {
      localStorage.setItem('sb-collapsed', collapsed ? '1' : '0')
    } catch {
      /* modo privado: se ignora */
    }
  }

  function select(id) {
    activeTab = id
    sideOpen = false
  }

  function onNavKey(e) {
    const i = NAV.findIndex((t) => t.id === activeTab)
    let next = null
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = NAV[(i + 1) % NAV.length].id
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = NAV[(i - 1 + NAV.length) % NAV.length].id
    else if (e.key === 'Home') next = NAV[0].id
    else if (e.key === 'End') next = NAV[NAV.length - 1].id
    if (next) {
      e.preventDefault()
      select(next)
      document.getElementById(`nav-${next}`)?.focus({ preventScroll: true })
    }
  }

  onMount(() => {
    // Sincroniza la red activa con la wallet (incluye chainChanged externo).
    initNetworkSync()
    // Módulos hermanos (p. ej. Transacción sin wallet conectada) piden abrir
    // el modal de conexión: el listener muere con el componente.
    const openWallet = () => (walletOpen = true)
    window.addEventListener(OPEN_WALLET_MODAL, openWallet)
    return () => window.removeEventListener(OPEN_WALLET_MODAL, openWallet)
  })
</script>

  <div class="dapp" class:collapsed={collapsed}>
  <aside class="dash-side" class:open={sideOpen} class:collapsed={collapsed} aria-label="Navegación del panel">
    <div class="dash-aurora" aria-hidden="true"><i></i><i></i></div>
    <div class="dash-scroll">
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
    <header class="dash-side-head" onpointerenter={wakeTail} onpointerleave={sleepTail}>
      <!-- marca sin navegación: el logo no dirige a ningún sitio -->
      <div class="dash-brand">
        <img class="dash-logo" src="/aletheia-logo.png" alt="" width="30" height="34" />
        <span class="dash-brand-text">
          <span class="dash-brand-name">Aletheia</span>
        </span>
      </div>
      <button
        type="button"
        class="dash-mini-btn dash-collapse-btn"
        onclick={toggleCollapse}
        aria-label="Colapsar panel"
        title="Colapsar panel"
        aria-expanded={!collapsed}
      >
        <span class="dash-collapse-ic" aria-hidden="true"><Icon name="code" size={14} /></span>
      </button>
    </header>
    <nav class="dash-nav" aria-label="Funcionalidades">
      <p class="dash-caption">Funcionalidades</p>
      <div class="dash-nav-list" style:--active-idx={activeIdx}>
        <span class="dash-pill" aria-hidden="true"></span>
        {#each NAV as item (item.id)}
          <button
            type="button"
            id={`nav-${item.id}`}
            class="dash-link"
            class:active={activeTab === item.id}
            aria-current={activeTab === item.id ? 'page' : undefined}
            title={item.label}
            onclick={() => select(item.id)}
            onkeydown={onNavKey}
          >
            <span class="dash-ic" aria-hidden="true"><Icon name={item.icon} size={15} /></span>
            <span class="dash-link-label">{item.label}</span>
          </button>
        {/each}
      </div>
    </nav>
    <div class="dash-wallet" aria-label="Estado de wallet">
      <div class="dash-wallet-head">
        <span class="dash-wallet-label">Wallet</span>
        <span class="dash-wallet-actions">
          <span class="dash-wallet-state" class:on={walletOn} class:off={!walletOn}>{walletOn ? 'online' : 'offline'}</span>
          <button
            type="button"
            class="dash-mini-btn dash-wallet-more"
            onclick={() => (walletOpen = true)}
            aria-label="Detalle de wallet"
            title="Ver detalle completo de la wallet"
          >
            <Icon name="dots" size={14} />
          </button>
        </span>
      </div>
      <p class="dash-wallet-addr">{walletOn ? shortenAddress($wallet.address) : 'desconectada'}</p>
      {#if activeNet}<p class="dash-wallet-net">{activeNet.label} · chain {$wallet.chainId ?? '—'}</p>{/if}
    </div>
    <div class="dash-foot">
      <a class="dash-home" href="#inicio" onclick={() => (sideOpen = false)}>
        <span class="dash-home-ic" aria-hidden="true"><Icon name="arrow" size={13} /></span>
        Inicio
      </a>
      <span class="dash-foot-right">
        <span class="dash-version">v1.0</span>
        <button
          type="button"
          class="dash-mini-btn"
          onclick={() => (netOpen = true)}
          aria-label="Red"
          title="Red y cambio de red"
        >
          <Icon name="gear" size={15} />
        </button>
      </span>
    </div>
    </div>
  </aside>
  <!-- coleta de expansión: HERMANA del rail (fuera de su stacking context)
       para que quede por encima del header del panel. Despierta con el
       hover de la cabecera del rail (logo) y se oculta con gracia (JS). -->
  {#if collapsed}
    <button
      type="button"
      class="dash-expand-tail"
      class:is-awake={tailAwake}
      onclick={toggleCollapse}
      onpointerenter={wakeTail}
      onfocus={wakeTail}
      onblur={sleepTail}
      aria-label="Expandir panel"
      title="Expandir panel"
    >
      <span class="dash-collapse-ic" aria-hidden="true"><Icon name="code" size={14} /></span>
    </button>
  {/if}
  {#if sideOpen}
    <button class="dash-scrim" aria-label="Cerrar menú" onclick={() => (sideOpen = false)}></button>
  {/if}

  <div class="dash-body">
    <header class="dapp-header">
      <div class="dapp-header-left">
        <button
          type="button"
          class="dash-menu-btn"
          onclick={() => (sideOpen = !sideOpen)}
          aria-label={sideOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={sideOpen}
        >
          <span class:open={sideOpen} aria-hidden="true"><i></i><i></i><i></i></span>
        </button>
        <span class="dapp-module-mark" aria-hidden="true"><Icon name={moduleMeta.icon} size={15} /></span>
        <div class="dapp-module-head">
          <h1 class="dapp-module-title">{moduleMeta.title}</h1>
          <p class="dapp-module-sub">{moduleMeta.sub}</p>
        </div>
      </div>
      <div class="dapp-header-right">
        <PanelAccount />
      </div>
    </header>

    <main>
      <div role="tabpanel" id="panel-tx" aria-label="Transacciones" hidden={activeTab !== 'tx'}>
        <AuthGate>
          <TransactionSection onNew={() => (txModalOpen = true)} />
        </AuthGate>
      </div>

      <div role="tabpanel" id="panel-consultas" aria-label="Consultas" hidden={activeTab !== 'consultas'}>
        <QueriesSection />
      </div>
    </main>
  </div>

  {#if netOpen}
    <PanelModal title="Configuración de red" onClose={() => (netOpen = false)}>
      <NetworkSwitcher />
    </PanelModal>
  {/if}

  {#if walletOpen}
    <PanelModal title="Detalle de wallet" width={640} onClose={() => (walletOpen = false)}>
      <AuthGate>
        <WalletSection />
      </AuthGate>
    </PanelModal>
  {/if}

  {#if txModalOpen}
    <PanelModal title="Nueva transacción" width={560} onClose={() => (txModalOpen = false)}>
      <AuthGate>
        <TransactionModal onClose={() => (txModalOpen = false)} />
      </AuthGate>
    </PanelModal>
  {/if}
  </div>
