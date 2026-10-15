<script>
  /**
   * NetworkSwitcher — cambio de red como GRILLA DE UN CLICK.
   *
   * Vive dentro del modal "Configuración de red" del panel. Cada celda es
   * una red: un click dispara el flujo completo del store (EVM: comprobar
   * → cambiar → agregar si falta → verificar; UTXO: selección de lectura
   * instantánea). La celda activa marca la red real de la wallet (el
   * store la sincroniza al conectar y en cada chainChanged).
   */
  import { network, switchNetwork, addNetworkToWallet, evmOptions } from '../stores/network'
  import { UTXO_NETWORKS, getNetwork, networkIcon } from '../web3/networks'
  import { wallet } from '../stores/wallet'
  import StatusMessage from './dapp/StatusMessage.svelte'
  import Icon from './Icon.svelte'

  const activeId = $derived($network.activeId)
  const switching = $derived($network.switching)
  const netError = $derived($network.error)
  const pendingAddId = $derived($network.pendingAddId)
  const connected = $derived($wallet.connected)
  const options = $derived(evmOptions())

  // "Agregar red a wallet" solo cuando un switch detectó que falta.
  const pendingDef = $derived(pendingAddId ? getNetwork(pendingAddId) : undefined)
  const canOfferAdd = $derived(
    pendingDef?.kind === 'evm' && Boolean(pendingDef.rpcUrl) && connected && !switching,
  )

  let notice = $state('')
  let busyId = $state('')

  function done(res, utxo = false) {
    if (!res.ok) return // el error ya está en el store
    notice =
      res.alreadyThere
        ? 'Ya estabas en esta red.'
        : res.added
          ? 'Red agregada y activada automáticamente.'
          : utxo
            ? 'Red UTXO seleccionada para lectura.'
            : 'Red cambiada y verificada.'
    setTimeout(() => (notice = ''), 4000)
  }

  /** Click en una celda: toda la lógica vive en el store. */
  async function pick(id) {
    if (switching || id === activeId) return
    notice = ''
    busyId = id
    const utxo = getNetwork(id)?.kind === 'utxo'
    done(await switchNetwork(id), utxo)
    busyId = ''
  }

  /** Acción secundaria: agregar la red faltante (solo cuando hizo falta). */
  async function addMissing() {
    if (!pendingAddId) return
    notice = ''
    const res = await addNetworkToWallet(pendingAddId)
    if (!res.ok) return
    notice = 'Red agregada y activada en la wallet.'
    setTimeout(() => (notice = ''), 4000)
  }
</script>

<section id="red" class="n-section" aria-label="Selección de red">
  {#if !connected}
    <p class="n-hint">Conecta tu wallet para cambiar la cadena EVM.</p>
  {/if}

  <!-- ---- EVM: un click = switch completo en la wallet ---- -->
  <div class="n-group" role="radiogroup" aria-label="Redes EVM">
    <p class="n-group-label">EVM · wallet</p>
    {#each options as { def } (def.id)}
      <button
        type="button"
        class="n-row"
        class:active={activeId === def.id}
        role="radio"
        aria-checked={activeId === def.id}
        onclick={() => pick(def.id)}
        disabled={switching || (!connected && def.id !== activeId)}
      >
        <span class="n-net-ic" aria-hidden="true"><Icon name={networkIcon(def.id)} size={19} /></span>
        <span class="n-txt">
          <span class="n-name">{def.label}</span>
          <span class="n-meta">chain {def.chainId} · <span class="kind">{def.testnet ? 'testnet' : 'mainnet'}</span></span>
        </span>
        <span class="n-state" aria-hidden="true">
          {#if activeId === def.id}
            <Icon name="check" size={13} />
          {:else if busyId === def.id && switching}
            <span class="n-spin"></span>
          {/if}
        </span>
      </button>
    {/each}
  </div>

  <!-- ---- UTXO: un click = selección de lectura (instantánea) ---- -->
  <div class="n-group" role="radiogroup" aria-label="Redes UTXO, solo lectura">
    <p class="n-group-label">UTXO · lectura</p>
    {#each UTXO_NETWORKS as def (def.id)}
      <button
        type="button"
        class="n-row"
        class:active={activeId === def.id}
        role="radio"
        aria-checked={activeId === def.id}
        onclick={() => pick(def.id)}
        disabled={switching}
      >
        <span class="n-net-ic" aria-hidden="true"><Icon name={networkIcon(def.id)} size={19} /></span>
        <span class="n-txt">
          <span class="n-name">{def.label}</span>
          <span class="n-meta">{def.symbol} · <span class="kind">{def.testnet ? 'testnet' : 'mainnet'}</span></span>
        </span>
        <span class="n-state" aria-hidden="true">
          {#if activeId === def.id}
            <Icon name="check" size={13} />
          {:else if busyId === def.id && switching}
            <span class="n-spin"></span>
          {/if}
        </span>
      </button>
    {/each}
  </div>

  {#if canOfferAdd}
    <div class="n-addbar">
      <span>«{pendingDef?.label}» no existe en tu wallet.</span>
      <button type="button" class="n-addbtn" onclick={addMissing}>Agregar a wallet</button>
    </div>
  {/if}

  <!-- una sola línea de estado, nunca un stack -->
  {#if netError}
    <StatusMessage tone="error" message={netError} />
  {:else if switching}
    <StatusMessage tone="warn" spin={true} message="Operando con la wallet… comprueba su ventana." />
  {:else if notice}
    <StatusMessage tone="ok" message={notice} />
  {/if}
</section>

<style>
  .n-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .n-hint {
    margin: -2px 0 0;
    font-size: 0.78rem;
    color: var(--gray-400, #9c96b0);
  }

  /* ---- grupos: grilla compacta + etiqueta con regla editorial ---- */
  .n-group {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 6px;
  }

  .n-group-label {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    font-size: 0.64rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--gray-400, #9c96b0);
  }

  .n-group-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(196, 181, 253, 0.1);
  }

  /* ---- celda de red: icono centrado, texto apilado a su derecha ---- */
  .n-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border: none;
    border-radius: 8px;
    background: none;
    color: var(--gray-200, #c9c5d6);
    font-family: var(--font-body, 'Geist Sans', system-ui, sans-serif);
    cursor: pointer;
    text-align: left;
    transition:
      background 140ms ease,
      color 140ms ease;
  }

  .n-row:hover:not(:disabled):not(.active) {
    background: rgba(139, 92, 246, 0.08);
    color: var(--white, #fff);
  }

  .n-row.active {
    background: rgba(124, 58, 237, 0.12);
    color: var(--white, #fff);
  }

  .n-row:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .n-row:focus-visible {
    outline: 2px solid var(--purple-400, #a78bfa);
    outline-offset: -2px;
  }

  /* marca de la red: gris tenue, morada en la celda activa */
  .n-net-ic {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex: none;
    color: var(--gray-400, #9c96b0);
    transition: color 140ms ease;
  }

  .n-row:hover:not(:disabled) .n-net-ic {
    color: var(--gray-200, #c9c5d6);
  }

  .n-row.active .n-net-ic {
    color: var(--purple-300, #c4b5fd);
  }

  .n-txt {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .n-name {
    font-size: 0.8rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .n-meta {
    font-size: 0.64rem;
    letter-spacing: 0.01em;
    color: var(--gray-400, #9c96b0);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* testnet/mainnet: la clase de red, tenue pero distinguible */
  .n-meta .kind {
    color: var(--gray-500, #726c86);
  }

  .n-row.active .n-meta {
    color: var(--gray-200, #c9c5d6);
  }

  .n-state {
    width: 18px;
    height: 18px;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--purple-300, #c4b5fd);
  }

  .n-spin {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid rgba(167, 139, 250, 0.25);
    border-top-color: var(--purple-300, #c4b5fd);
    animation: n-rotate 0.9s linear infinite;
  }

  @keyframes n-rotate {
    to {
      transform: rotate(360deg);
    }
  }

  /* ---- barra de "agregar red faltante" ---- */
  .n-addbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0;
    font-size: 0.78rem;
    color: var(--gray-200, #c9c5d6);
  }

  .n-addbtn {
    flex: none;
    min-height: 30px;
    padding: 0 12px;
    border: none;
    border-radius: 8px;
    background: none;
    color: var(--purple-300, #c4b5fd);
    font-family: var(--font-body, 'Geist Sans', system-ui, sans-serif);
    font-size: 0.76rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 150ms ease;
  }

  .n-addbtn:hover {
    background: rgba(139, 92, 246, 0.12);
  }

  .n-addbtn:focus-visible {
    outline: 2px solid var(--purple-400, #a78bfa);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .n-spin {
      animation-duration: 0.01ms;
    }
  }
</style>
