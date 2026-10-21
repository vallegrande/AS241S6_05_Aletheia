<script>
  /**
   * Panel — dashboard de identidad de Aletheia (vive en #/panel).
   *
   * Layout: header fijo + rail colapsable 260px + main.
   * Módulos: Resumen, Evidencias, Certificados e Historial (API Express + Postgres).
   * El perfil se edita en un modal abierto desde el menú de cuenta.
   * La wallet (Pali) solo se necesita para certificar on-chain en Amoy.
   */
  import '../../styles/dapp.css'
  import '../../styles/sidebar.css'
  import { auth } from '../stores/auth'
  import { wallet, shortenAddress } from '../stores/wallet'
  import { network, initNetworkSync } from '../stores/network'
  import { getNetwork } from '../web3/networks'
  import AuthGate from './AuthGate.svelte'
  import WalletSection from './WalletSection.svelte'
  import NetworkSwitcher from './NetworkSwitcher.svelte'
  import PanelAccount from './PanelAccount.svelte'
  import PanelModal from './PanelModal.svelte'
  import ProfileForm from './panel/ProfileForm.svelte'
  import EvidencesSection from './panel/EvidencesSection.svelte'
  import CertificatesSection from './panel/CertificatesSection.svelte'
  import TransactionsSection from './panel/TransactionsSection.svelte'
  import DashboardSection from './panel/DashboardSection.svelte'
  import Icon from './Icon.svelte'
  import { OPEN_WALLET_MODAL, OPEN_PROFILE_MODAL } from '../stores/panelBus'
  import { onMount } from 'svelte'

  const user = $derived($auth.user)

  const activeNet = $derived(getNetwork($network.activeId))
  const walletOn = $derived($wallet.connected)

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'sparkle' },
    { id: 'evidencias', label: 'Evidencias', icon: 'book' },
    { id: 'certificados', label: 'Certificados', icon: 'award' },
    { id: 'historial', label: 'Historial', icon: 'history' },
  ]

  let activeTab = $state('dashboard')
  let sideOpen = $state(false)
  let netOpen = $state(false)
  let walletOpen = $state(false)
  let profileOpen = $state(false)

  const MODULES = {
    dashboard: {
      title: 'Dashboard',
      sub: 'Tu reputación en un vistazo: evidencias, huellas y certificados.',
      icon: 'sparkle',
    },
    evidencias: {
      title: 'Evidencias',
      sub: 'Proyectos, certificaciones y logros con archivo o enlace.',
      icon: 'book',
    },
    certificados: {
      title: 'Certificados',
      sub: 'Huella SHA-256 y registro on-chain en Polygon Amoy.',
      icon: 'award',
    },
    historial: {
      title: 'Historial',
      sub: 'Cada transacción on-chain que has firmado, con su red y fecha.',
      icon: 'history',
    },
  }
  const moduleMeta = $derived(MODULES[activeTab] ?? MODULES.dashboard)

  const activeIdx = $derived(NAV.findIndex((t) => t.id === activeTab))
  let collapsed = $state(typeof localStorage !== 'undefined' && localStorage.getItem('sb-collapsed') === '1')

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
    initNetworkSync()
    const openWallet = () => (walletOpen = true)
    const openProfile = () => (profileOpen = true)
    window.addEventListener(OPEN_WALLET_MODAL, openWallet)
    window.addEventListener(OPEN_PROFILE_MODAL, openProfile)
    return () => {
      window.removeEventListener(OPEN_WALLET_MODAL, openWallet)
      window.removeEventListener(OPEN_PROFILE_MODAL, openProfile)
    }
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
      <div role="tabpanel" id="panel-dashboard" aria-label="Dashboard" hidden={activeTab !== 'dashboard'}>
        <AuthGate>
          <DashboardSection />
        </AuthGate>
      </div>

      <div role="tabpanel" id="panel-evidencias" aria-label="Evidencias" hidden={activeTab !== 'evidencias'}>
        <AuthGate>
          <EvidencesSection />
        </AuthGate>
      </div>

      <div role="tabpanel" id="panel-certificados" aria-label="Certificados" hidden={activeTab !== 'certificados'}>
        <AuthGate>
          <CertificatesSection />
        </AuthGate>
      </div>

      <div role="tabpanel" id="panel-historial" aria-label="Historial de transacciones" hidden={activeTab !== 'historial'}>
        <AuthGate>
          <TransactionsSection />
        </AuthGate>
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

  {#if profileOpen}
    <PanelModal title="Tu perfil" width={640} onClose={() => (profileOpen = false)}>
      <AuthGate>
        <ProfileForm />
      </AuthGate>
    </PanelModal>
  {/if}
  </div>
