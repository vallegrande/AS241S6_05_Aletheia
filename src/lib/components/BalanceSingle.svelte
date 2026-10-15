<script>
  /**
   * BalanceSingle — consulta individual: Address + 1 Network → Balance.
   *
   * Pública: funciona sin login. Con wallet conectada ofrece usar su address.
   * Lógica en web3/balance-service.ts; aquí solo presentación: formulario en
   * una sola fila (address → red → CTA) y el balance como protagonista.
   * Cifra en tabular-nums, chip de red y copiado al portapapeles. Geist.
   */
  import { networkAddressUrl, getNetwork } from '../web3/networks'
  import { querySingleBalance } from '../web3/balance-service'
  import { wallet } from '../stores/wallet'
  import StatusMessage from './dapp/StatusMessage.svelte'
  import NetworkSelect from './dapp/NetworkSelect.svelte'
  import Icon from './Icon.svelte'

  let address = $state('')
  let netId = $state('sepolia')
  let copied = $state(false)
  let copyTimer

  let busy = $state(false)
  let result = $state(null)
  let failure = $state(null)

  const connected = $derived($wallet.connected)
  const walletAddress = $derived($wallet.address)
  const net = $derived(getNetwork(netId))
  const explorerUrl = $derived(net && result ? networkAddressUrl(net, result.address) : '')

  function useWalletAddress() {
    if (walletAddress) address = walletAddress
  }

  async function copyAddress() {
    if (!result || copied) return
    try {
      await navigator.clipboard.writeText(result.address)
      copied = true
      copyTimer = setTimeout(() => (copied = false), 1600)
    } catch {
      /* sin permiso de portapapeles: se ignora */
    }
  }

  async function run() {
    busy = true
    result = null
    failure = null
    copied = false
    try {
      const q = await querySingleBalance(address, netId)
      if (q.status === 'ok') result = q.result
      else failure = q
    } finally {
      busy = false
    }
  }
</script>

<section class="q-panel" aria-label="Consulta individual de saldo">
  <!-- formulario en línea: address (con wallet dentro) → red → CTA -->
  <div class="q-row q-form">
    <div class="q-field">
      <div class="q-input-wrap">
        <input
          class="q-input"
          type="text"
          spellcheck="false"
          autocomplete="off"
          placeholder="Dirección · 0x… o tb1… / bc1… / 1…"
          bind:value={address}
          onkeydown={(e) => e.key === 'Enter' && !busy && address.trim() && run()}
        />
        {#if connected && walletAddress}
          <button type="button" class="q-mini" onclick={useWalletAddress} title="Usar la address de mi wallet">
            <Icon name="lock" size={13} />
            Mi wallet
          </button>
        {/if}
      </div>
      <NetworkSelect bind:value={netId} id="netsel-single" />
      <button type="button" class="q-go" onclick={run} disabled={busy || !address.trim()}>
        {busy ? 'Consultando…' : 'Consultar'}
      </button>
    </div>
  </div>

  <!-- resultado: banda con la cifra protagonista + metadatos -->
  {#if busy}
    <div class="q-skeleton" aria-hidden="true">
      <span class="q-skel-line"></span>
      <span class="q-skel-chip"></span>
    </div>
    <StatusMessage tone="warn" spin={true} message={`Consultando ${net?.label ?? netId}…`} />
  {:else if result}
    <div class="q-result" aria-live="polite">
      <div class="q-result-head">
        <span class="q-label">BALANCE</span>
        <span class="dapp-chip info">{net?.label}</span>
      </div>
      <p class="q-fig">{result.balance}<span class="q-unit">{result.symbol}</span></p>
      <div class="q-meta">
        <span class="q-addr">{result.address}</span>
        <button type="button" class="q-copy" class:on={copied} onclick={copyAddress} aria-label="Copiar dirección" title="Copiar dirección">
          <Icon name={copied ? 'check' : 'copy'} size={12} />
        </button>
        {#if explorerUrl}
          <a class="q-link" href={explorerUrl} target="_blank" rel="noopener noreferrer">
            Explorador <Icon name="external" size={12} />
          </a>
        {/if}
      </div>
    </div>
  {:else if failure}
    <StatusMessage tone="error" message={failure.message} tech={`[${failure.code}] red: ${failure.networkId}`} />
  {:else}
    <p class="q-empty">Pega una dirección y elige una red — el balance aparece aquí.</p>
  {/if}
</section>
