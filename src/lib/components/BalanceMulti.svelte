<script>
  /**
   * BalanceMulti — consulta masiva: Address → N Networks → balances.
   *
   * Misma lógica de servicio que la individual (querySingleBalance por red,
   * concurrencia acotada, fallos aislados). Las redes incompatibles con el
   * formato se omiten con su motivo en lugar de contarse como error.
   * Presentación: chips agrupadas por familia (EVM/UTXO) con acciones
   * Todas/Ninguna, filas con pulso mientras esperan y resumen con chips.
   * Geist.
   */
  import { NETWORKS, networkAddressUrl, getNetwork } from '../web3/networks'
  import { querySingleBalance } from '../web3/balance-service'
  import { isAddressCompatibleWithNetwork } from '../web3/validation'
  import { wallet } from '../stores/wallet'
  import StatusMessage from './dapp/StatusMessage.svelte'
  import Icon from './Icon.svelte'

  let address = $state('')
  let ids = $state(['sepolia', 'polygon-amoy', 'bsc-testnet', 'btc-testnet'])

  let busy = $state(false)
  let pending = $state([])
  let outcome = $state(null) // { items, ok, failed, skipped }

  const connected = $derived($wallet.connected)
  const walletAddress = $derived($wallet.address)

  /* familias de redes para agrupar las chips */
  const GROUPS = $derived([
    { id: 'evm', label: 'EVM', nets: NETWORKS.filter((n) => n.kind === 'evm') },
    { id: 'utxo', label: 'UTXO', nets: NETWORKS.filter((n) => n.kind === 'utxo') },
  ])

  const selectableIds = $derived(GROUPS.flatMap((g) => g.nets.map((n) => n.id)))

  function useWalletAddress() {
    if (walletAddress) address = walletAddress
  }

  function toggle(id) {
    ids = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
  }

  /* checkbox maestro: all | some | none (estado visual + aria-checked) */
  const masterState = $derived(
    ids.length === 0 ? 'none' : ids.length === selectableIds.length ? 'all' : 'some',
  )

  function toggleMaster() {
    if (busy) return
    ids = masterState === 'all' ? [] : [...selectableIds]
  }

  function compatible(id) {
    const net = getNetwork(id)
    if (!net || !address.trim()) return true
    return isAddressCompatibleWithNetwork(address.trim(), net)
  }

  /* toggle per famiglia: marcar/desmarcar todos los ids del grupo */
  function groupAll(group) {
    if (busy) return
    const gIds = group.nets.map((n) => n.id)
    const all = gIds.every((id) => ids.includes(id))
    ids = all ? ids.filter((x) => !gIds.includes(x)) : [...new Set([...ids, ...gIds])]
  }

  async function run() {
    busy = true
    outcome = null
    const addr = address.trim()
    // Las redes incompatibles con el formato NO se consultan: van a omitidas.
    const skipped = []
    const queue = [...new Set(ids)].filter((id) => {
      const net = getNetwork(id)
      if (!net) {
        skipped.push({ networkId: id, label: id, reason: 'Red desconocida.' })
        return false
      }
      if (addr && !isAddressCompatibleWithNetwork(addr, net)) {
        skipped.push({
          networkId: id,
          label: net.label,
          reason: `Formato ${net.kind === 'evm' ? 'EVM (0x…)' : 'UTXO'} incompatible con esta address.`,
        })
        return false
      }
      return true
    })
    pending = [...queue]
    const items = []
    const CONC = 3
    async function worker() {
      while (queue.length) {
        const id = queue.shift()
        const net = getNetwork(id)
        const q = await querySingleBalance(addr, id)
        pending = pending.filter((x) => x !== id)
        if (q.status === 'ok') items.push({ networkId: id, label: net.label, status: 'ok', result: q.result })
        else items.push({ networkId: id, label: net.label, status: 'error', code: q.code, message: q.message })
      }
    }
    try {
      await Promise.all(Array.from({ length: Math.min(CONC, Math.max(queue.length, 1)) }, worker))
      const order = new Map(NETWORKS.map((n, i) => [n.id, i]))
      items.sort((a, b) => (order.get(a.networkId) ?? 99) - (order.get(b.networkId) ?? 99))
      outcome = {
        address: address.trim(),
        items,
        ok: items.filter((i) => i.status === 'ok').length,
        failed: items.filter((i) => i.status === 'error').length,
        skipped,
      }
    } finally {
      busy = false
      pending = []
    }
  }
</script>

<section class="q-panel" aria-label="Consulta masiva de saldos">
  <div class="q-row">
    <div class="q-field">
      <div class="q-input-wrap">
        <input
          class="q-input"
          type="text"
          spellcheck="false"
          autocomplete="off"
          placeholder="Dirección · 0x… o tb1… / bc1… / 1…"
          bind:value={address}
          onkeydown={(e) => e.key === 'Enter' && !busy && address.trim() && ids.length && run()}
        />
        {#if connected && walletAddress}
          <button type="button" class="q-mini" onclick={useWalletAddress} title="Usar la address de mi wallet">
            <Icon name="lock" size={13} />
            Mi wallet
          </button>
        {/if}
      </div>
    </div>
  </div>

  <div class="q-sub">
    <div class="q-sub-left">
      <button
        type="button"
        class="q-master"
        class:on={masterState !== 'none'}
        role="checkbox"
        aria-checked={masterState === 'all' ? true : masterState === 'some' ? 'mixed' : false}
        disabled={busy}
        onclick={toggleMaster}
        aria-label="Marcar o desmarcar todas las redes"
        title="Marcar / desmarcar todas"
      >
        <span class="q-master-box" aria-hidden="true">
          <span class="q-master-check"><Icon name="check" size={11} /></span>
          <span class="q-master-dash" aria-hidden="true"></span>
        </span>
      </button>
      <span class="q-sub-text">Redes a consultar · <b class="q-count">{ids.length}</b></span>
    </div>
    <span class="q-sub-line" aria-hidden="true"></span>
  </div>

  <div class="q-groups">
    {#each GROUPS as group (group.id)}
      {@const gIds = group.nets.map((n) => n.id)}
      {@const allOn = gIds.every((id) => ids.includes(id))}
      <div class="q-group">
        <div class="q-group-head">
          <p class="q-group-label">{group.label}</p>
          <button type="button" class="q-ghost q-group-toggle" onclick={() => groupAll(group)} disabled={busy}>
            {allOn ? 'Desmarcar' : 'Marcar'} {group.label}
          </button>
        </div>
        <div class="q-nets" role="group" aria-label="Redes {group.label} a consultar">
          {#each group.nets as n (n.id)}
            <button
              type="button"
              class="q-net"
              class:on={ids.includes(n.id)}
              class:dim={!compatible(n.id)}
              role="checkbox"
              aria-checked={ids.includes(n.id)}
              aria-label={`${n.label} (${n.symbol})`}
              onclick={() => toggle(n.id)}
            >
              <!-- checklist: caja visual que refleja el estado -->
              <span class="q-net-box" class:checked={ids.includes(n.id)} aria-hidden="true">
                <Icon name="check" size={11} />
              </span>
              <span class="q-net-name">{n.label}</span>
              <span class="q-net-sym">{n.symbol}</span>
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <div class="q-row">
    <button
      type="button"
      class="q-go block"
      onclick={run}
      disabled={busy || !address.trim() || ids.length === 0}
    >
      {busy ? 'Consultando…' : ids.length === 1 ? 'Consultar 1 red' : `Consultar ${ids.length} redes`}
    </button>
  </div>

  <!-- resultados por red -->
  {#if busy}
    <StatusMessage tone="warn" spin={true} message={`Consultando ${pending.length} red(es)…`} />
    {#if pending.length}
      <ul class="q-list" aria-live="polite">
        {#each pending as p (p)}
          <li class="q-item pend">
            <span class="q-item-dot" aria-hidden="true"></span>
            <span class="q-item-name">{getNetwork(p)?.label ?? p}</span>
            <span class="q-item-val pending-text">consultando…</span>
          </li>
        {/each}
      </ul>
    {/if}
  {:else if outcome}
    <div class="q-sum" role="status">
      <span class="dapp-chip ok">{outcome.ok} correctas</span>
      {#if outcome.failed}<span class="dapp-chip err">{outcome.failed} con error</span>{/if}
      {#if outcome.skipped.length}<span class="dapp-chip">{outcome.skipped.length} omitidas</span>{/if}
    </div>
    <ul class="q-list" aria-live="polite">
      {#each outcome.items as item (item.networkId)}
        <li class="q-item" class:err={item.status === 'error'}>
          <span class="q-item-dot" aria-hidden="true"></span>
          <span class="q-item-name">{item.label}</span>
          {#if item.status === 'ok'}
            <span class="q-item-val">{item.result.balance} <span class="q-item-unit">{item.result.symbol}</span></span>
            {@const net = getNetwork(item.networkId)}
            {#if net}
              <a class="dash-mini-btn" href={networkAddressUrl(net, item.result.address)} target="_blank" rel="noopener noreferrer" aria-label={`Ver ${item.label} en el explorador`} title="Explorador">
                <Icon name="external" size={12} />
              </a>
            {/if}
          {:else}
            <span class="q-item-val" title={`${item.message} [${item.code}]`}>{item.message}</span>
          {/if}
        </li>
      {/each}
      {#each outcome.skipped as s (s.networkId)}
        <li class="q-item dim" title={s.reason}>
          <span class="q-item-dot" aria-hidden="true"></span>
          <span class="q-item-name">{s.label}</span>
          <span class="q-item-val">omitida</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="q-empty">Selecciona redes y consulta — los balances agrupados aparecen aquí.</p>
  {/if}
</section>
