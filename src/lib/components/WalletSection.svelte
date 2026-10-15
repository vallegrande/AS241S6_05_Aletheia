<script>
  /**
   * WalletSection — conexión de Pali Wallet y estado de la cuenta.
   *
   * Vive dentro del modal "Detalle de wallet" del panel (PanelModal):
   * sin cabecera de sección propia (el modal ya titula) y con ritmo
   * compacto. Estados: desconectada → conectando → conectada.
   * Datos 100% reales del provider: address, balance, network, chainId.
   */
  import { wallet, connectWallet, disconnectWallet, networkKind, formatBalance, refreshWallet } from '../stores/wallet'
  import { prettyNetwork, getAddressUrl } from '../web3/chains'
  import Icon from './Icon.svelte'
  import StatusMessage from './dapp/StatusMessage.svelte'

  let error = $state('')
  let copied = $state(false)
  let refreshing = $state(false)

  const connected = $derived($wallet.connected)
  const installed = $derived($wallet.installed)
  const connecting = $derived($wallet.connecting)
  const isTestnet = $derived(networkKind($wallet.chainId) === 'Testnet')
  const explorerUrl = $derived(getAddressUrl($wallet.chainId, $wallet.address))

  async function handleConnect() {
    error = ''
    try {
      await connectWallet()
    } catch (err) {
      mapError(err)
      setTimeout(() => (error = ''), 4200)
    }
  }

  function mapError(err) {
    if (err?.code === 'NO_WALLET') error = 'Pali Wallet no detectada.'
    else if (err?.code === 'USER_REJECTED') error = 'Conexión rechazada desde Pali Wallet.'
    else error = 'No se pudo conectar la wallet.'
    console.error('[aletheia] wallet connect:', err)
  }

  async function copyAddress() {
    if (!$wallet.address) return
    try {
      await navigator.clipboard.writeText($wallet.address)
      copied = true
      setTimeout(() => (copied = false), 1600)
    } catch (err) {
      console.warn('[aletheia] clipboard:', err)
    }
  }

  async function refresh() {
    refreshing = true
    await refreshWallet()
    setTimeout(() => (refreshing = false), 500)
  }
</script>

<section id="wallet" class="w-section" aria-label="Conexión de wallet">
  {#if !connected}
    <!-- ---- estado: sin conectar — RANURA vacía esperando la wallet ---- -->
    <div class="w-slot" class:connecting>
      <span class="w-slot-orb" class:pulse={connecting} aria-hidden="true">
        <Icon name={connecting ? 'zap' : 'lock'} size={22} />
      </span>
      <h3 class="w-slot-name">Pali Wallet</h3>
      <p class="w-slot-status">
        {#if connecting}
          Esperando aprobación… revisa la ventana de tu extensión.
        {:else if installed}
          Desconectada. Autoriza la conexión para leer tu cuenta y la red activa.
        {:else}
          No se detectó la extensión en este navegador. Instálala y recarga la página.
        {/if}
      </p>
      {#if connecting}
        <button type="button" class="w-connect" disabled>Conectando…</button>
      {:else if installed}
        <button type="button" class="w-connect" onclick={handleConnect}>
          <Icon name="lock" size={15} />
          Conectar Pali Wallet
        </button>
      {:else}
        <a class="w-connect" href="https://www.paliwallet.com/" target="_blank" rel="noopener noreferrer">
          Obtener Pali Wallet
          <Icon name="external" size={14} />
        </a>
      {/if}
    </div>

    {#if error}
      <StatusMessage tone="error" message={error} />
    {/if}
  {:else}
    <!-- ---- estado: conectada — jerarquía: estado → dirección → datos → acciones ---- -->
    <article class="w-card" aria-label="Wallet conectada">
      <!-- estado de conexión -->
      <div class="w-head">
        <span class="w-dot" aria-hidden="true"></span>
        <strong class="w-title">Conectada</strong>
        {#if isTestnet === true}
          <span class="w-chip">Testnet</span>
        {:else if $wallet.chainId != null}
          <span class="w-chip main">Mainnet</span>
        {/if}
      </div>

      <!-- dirección: bloque propio, acciones como BOTONES con etiqueta -->
      <div class="w-addr-box">
        <span class="w-addr-label mono">DIRECCIÓN</span>
        <p class="w-hash">{$wallet.address}</p>
        <div class="w-addr-acts">
          <button type="button" class="w-btn" onclick={copyAddress}>
            <Icon name={copied ? 'check' : 'copy'} size={13} />
            {copied ? 'Copiada' : 'Copiar'}
          </button>
          {#if explorerUrl}
            <button type="button" class="w-btn" onclick={() => window.open(explorerUrl, '_blank', 'noopener')}>
              <Icon name="external" size={13} />
              Explorador
            </button>
          {/if}
        </div>
      </div>

      <!-- datos on-chain: tres celdas equilibradas -->
      <dl class="w-stats">
        <div class="ws">
          <dt>Balance</dt>
          <dd class="w-balance">
            <span class="w-fig">{formatBalance($wallet.balanceWei)}<span class="unit"> ETH</span></span>
            <button type="button" class="w-btn w-btn-sm" onclick={refresh} disabled={refreshing}>
              <Icon name="zap" size={12} />
              {refreshing ? '…' : 'Actualizar'}
            </button>
          </dd>
        </div>
        <div class="ws">
          <dt>Network</dt>
          <dd>{prettyNetwork($wallet.networkName, $wallet.chainId)}</dd>
        </div>
        <div class="ws">
          <dt>Chain ID</dt>
          <dd class="mono">{$wallet.chainId ?? '—'}</dd>
        </div>
      </dl>

      <!-- desconectar: acción destructiva separada abajo -->
      <button type="button" class="w-disconnect" onclick={disconnectWallet}>
        Desconectar wallet
      </button>
    </article>
  {/if}
</section>

<style>
  .w-section {
    display: flex;
    flex-direction: column;
    gap: var(--s-2, 8px);
  }

  /* ---- ranura vacía (desconectada / conectando): composición centrada,
       borde punteado — la wallet "entrará" aquí al conectarse ---- */
  .w-slot {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 18px 16px 16px;
    text-align: center;
  }

  .w-slot-orb {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    color: var(--purple-300, #c4b5fd);
    background: none;
  }

  /* radar suave mientras espera la firma */
  .w-slot-orb.pulse {
    animation: w-radar 2s ease-out infinite;
  }

  @keyframes w-radar {
    0% {
      box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.16);
    }
    70% {
      box-shadow: 0 0 0 12px rgba(124, 58, 237, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(124, 58, 237, 0);
    }
  }

  .w-slot-name {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 650;
    letter-spacing: -0.01em;
    color: var(--white, #fff);
  }

  .w-slot-status {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--gray-400, #9c96b0);
    max-width: 46ch;
  }

  /* CTA centrado y contenido dentro de la ranura */
  .w-slot .w-connect {
    width: min(280px, 100%);
    margin-top: 2px;
  }

  .w-slot .w-connect:disabled {
    opacity: 0.65;
    cursor: wait;
  }

  /* ---- acción principal: CTA morado plano, sin sombras ---- */
  .w-connect {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 42px;
    border: none;
    border-radius: 10px;
    background: var(--purple-600, #7c3aed);
    color: var(--white, #fff);
    font-family: var(--font-display, 'Geist Sans', system-ui, sans-serif);
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.18s ease, border-color 0.18s ease;
  }

  .w-connect:hover {
    background: var(--purple-500, #8b5cf6);
  }

  .w-connect:active {
    background: var(--purple-700, #6d28d9);
  }

  .w-connect:focus-visible {
    outline: 2px solid var(--purple-300, #c4b5fd);
    outline-offset: 2px;
  }

  /* ---- tarjeta conectada: jerarquía clara por bloques ---- */
  .w-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 0;
  }

  .w-head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .w-dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
    background: var(--ok, #6ee7b7);
    box-shadow: 0 0 10px rgba(110, 231, 183, 0.6);
  }

  .w-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--white, #fff);
  }

  .w-chip {
    font-size: 0.62rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    padding: 2px 0;
    color: var(--purple-300, #c4b5fd);
  }

  .w-chip.main {
    color: var(--ok, #6ee7b7);
  }

  /* ---- dirección: caja bonded con label + botones con etiqueta ---- */
  .w-addr-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    border: 1px solid rgba(196, 181, 253, 0.14);
    border-radius: 10px;
    background: rgba(5, 3, 16, 0.55);
  }

  .w-addr-label {
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    color: var(--gray-500, #726c86);
  }

  .w-hash {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    letter-spacing: 0.01em;
    color: var(--gray-100, #e2e0ea);
    word-break: break-all;
  }

  .w-addr-acts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 2px;
  }

  /* botón estándar del bloque: pill compacta, borde violeta discreto */
  .w-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid rgba(196, 181, 253, 0.2);
    border-radius: 999px;
    background: rgba(124, 58, 237, 0.08);
    color: var(--gray-100, #e2e0ea);
    font-family: var(--font-body, 'Geist Sans', system-ui, sans-serif);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
  }

  .w-btn:hover:not(:disabled) {
    border-color: rgba(196, 181, 253, 0.5);
    background: rgba(124, 58, 237, 0.16);
    color: var(--white, #fff);
  }

  .w-btn:disabled {
    opacity: 0.55;
    cursor: wait;
  }

  .w-btn:focus-visible {
    outline: 2px solid var(--purple-400, #a78bfa);
    outline-offset: 2px;
  }

  .w-btn-sm {
    min-height: 26px;
    padding: 0 10px;
    font-size: 0.68rem;
  }

  /* ---- stats: tres celdas separadas por línea, sin caja pesada ---- */
  .w-stats {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr;
    gap: 12px var(--s-3, 16px);
    margin: 0;
    padding: 12px 0 0;
    border-top: 1px solid rgba(196, 181, 253, 0.12);
  }

  .ws dt {
    font-size: 0.66rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--gray-400, #9c96b0);
    margin-bottom: 4px;
  }

  .ws dd {
    margin: 0;
    font-size: 0.9rem;
    color: var(--white, #fff);
  }

  .w-balance {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .w-fig {
    font-family: var(--font-display, 'Geist Sans', system-ui, sans-serif);
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;
    color: var(--white, #fff);
  }

  .w-fig .unit {
    font-size: 0.45em;
    font-weight: 600;
    margin-left: 4px;
    color: var(--purple-300, #c4b5fd);
  }

  /* desconectar: separado, tono neutro-rojizo discreto */
  .w-disconnect {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 38px;
    width: 100%;
    margin-top: 4px;
    border: 1px solid rgba(253, 164, 175, 0.28);
    border-radius: 10px;
    background: rgba(253, 164, 175, 0.05);
    color: #fda4af;
    font-family: var(--font-body, 'Geist Sans', system-ui, sans-serif);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.18s ease, background 0.18s ease;
  }

  .w-disconnect:hover {
    border-color: rgba(253, 164, 175, 0.55);
    background: rgba(253, 164, 175, 0.1);
  }

  .w-disconnect:focus-visible {
    outline: 2px solid #fda4af;
    outline-offset: 2px;
  }

  /* ---- responsive (modal angosto / móvil) ---- */
  @media (max-width: 560px) {
    .w-stats {
      grid-template-columns: 1fr 1fr;
    }

    .ws:first-child {
      grid-column: 1 / -1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .w-slot-orb.pulse {
      animation: none;
    }
  }
</style>
