<script>
  /**
   * TransactionSection — vista PRINCIPAL del módulo de transacciones:
   * tabla con TODAS las transacciones de la sesión (txLedger) + botón
   * "Nueva transacción" que abre el modal de envío.
   */
  import { txLedger } from '../stores/txLedger'
  import { getTxUrl } from '../web3/chains'
  import { wallet } from '../stores/wallet'
  import { requestOpenWalletModal } from '../stores/panelBus'
  import Icon from './Icon.svelte'
  import StatusMessage from './dapp/StatusMessage.svelte'

  let { onNew } = $props()

  const connected = $derived($wallet.connected)

  let copied = $state('')
  async function copyHash(hash) {
    if (!hash) return
    try {
      await navigator.clipboard.writeText(hash)
      copied = hash
      setTimeout(() => (copied = ''), 1600)
    } catch (err) {
      console.warn('[aletheia] clipboard:', err)
    }
  }

  function shortHash(hash) {
    return hash ? `${hash.slice(0, 12)}…${hash.slice(-8)}` : ''
  }

  function shortAddr(addr) {
    return addr ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : '—'
  }

  function timeAgo(ts) {
    if (!ts) return ''
    const s = Math.floor((Date.now() - ts) / 1000)
    if (s < 60) return 'hace instantes'
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`
    return `hace ${Math.floor(s / 3600)} h`
  }

  const STATUS_LABEL = {
    confirmed: 'Confirmada',
    reverted: 'Revertida',
    pending: 'Pendiente',
  }
</script>

<section class="dapp-section tx" aria-label="Historial de transacciones">
  {#if $txLedger.length === 0}
    <div class="tx-empty dapp-pane">
      <span class="tx-empty-icon" aria-hidden="true"><Icon name="send" size={22} /></span>
      <h3>Aún no hay transacciones</h3>
      <p class="muted small">Todo lo que firmes en Pali Wallet aparece aquí: hash, destino, cantidad, red y estado en vivo.</p>
      <button type="button" class="tx-cta" onclick={() => (connected ? onNew?.() : requestOpenWalletModal())}>
        {connected ? 'Hacer una transacción' : 'Conecta tu wallet para empezar'}
      </button>
    </div>
  {:else}
    <div class="tx-table-head">
      <p class="tx-table-title mono">REGISTRO DE LA SESIÓN</p>
      <button type="button" class="tx-cta tx-cta-sm" onclick={() => (connected ? onNew?.() : requestOpenWalletModal())}>
        <Icon name="send" size={13} />
        Nueva transacción
      </button>
    </div>
    <div class="dapp-pane tx-table-pane">
      <table class="tx-table">
        <thead>
          <tr>
            <th scope="col" class="col-status"><span class="visually-hidden">Estado</span></th>
            <th scope="col">Hash</th>
            <th scope="col">Destino</th>
            <th scope="col" class="num">Cantidad</th>
            <th scope="col">Red</th>
            <th scope="col">Estado</th>
            <th scope="col">Hace</th>
            <th scope="col" class="col-actions"><span class="visually-hidden">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {#each $txLedger as tx (tx.hash)}
            <tr data-status={tx.status}>
              <td class="col-status"><span class="tx-status-dot" aria-hidden="true"></span></td>
              <td class="mono tx-hash" title={tx.hash}>{shortHash(tx.hash)}</td>
              <td class="mono">{shortAddr(tx.to)}</td>
              <td class="num mono">{tx.amount} ETH</td>
              <td>{tx.network}</td>
              <td>
                <span class="dapp-chip" class:ok={tx.status === 'confirmed'} class:warn={tx.status === 'pending'} class:err={tx.status === 'reverted'}>
                  {STATUS_LABEL[tx.status] ?? tx.status}
                </span>
              </td>
              <td class="muted small">{timeAgo(tx.ts)}</td>
              <td class="col-actions">
                <div class="tx-actions-cell">
                  <button type="button" class="dash-mini-btn" onclick={() => copyHash(tx.hash)} aria-label="Copiar hash" title="Copiar hash">
                    {#if copied === tx.hash}<Icon name="check" size={12} />{:else}<Icon name="copy" size={12} />{/if}
                  </button>
                  {#if getTxUrl(tx.chainId, tx.hash)}
                    <a class="dash-mini-btn" href={getTxUrl(tx.chainId, tx.hash)} target="_blank" rel="noopener noreferrer" aria-label="Abrir en el explorador" title="Abrir en el explorador">
                      <Icon name="external" size={12} />
                    </a>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="muted small tx-note">La DApp nunca firma: la aprobación ocurre en Pali Wallet.</p>
    </div>
  {/if}
</section>

<style>
  /* tabla: filas alineadas a la altura del rail, líneas violeta discretas */
  .tx-table-pane { padding: 0; gap: 0; overflow: hidden; }
  .tx-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  .tx-table th {
    text-align: left;
    font-family: var(--font-mono);
    font-size: 0.64rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--gray-500);
    padding: 12px 14px;
    border-bottom: 1px solid rgba(196, 181, 253, 0.14);
    white-space: nowrap;
  }
  .tx-table td {
    padding: 11px 14px;
    border-bottom: 1px solid rgba(196, 181, 253, 0.07);
    vertical-align: middle;
    min-width: 0;
  }
  .tx-table tbody tr { transition: background 0.2s ease; }
  .tx-table tbody tr:hover { background: rgba(124, 58, 237, 0.05); }
  .tx-table tbody tr:last-child td { border-bottom: 0; }

  .num { text-align: right; }
  .tx-hash { color: var(--purple-200, #ddd6fe); font-size: 0.78rem; }
  td.mono { font-size: 0.78rem; color: var(--gray-200); }

  .col-status { width: 30px; padding-right: 0 !important; }
  .col-actions { width: 84px; }
  .tx-actions-cell { display: inline-flex; gap: 6px; }
  a.dash-mini-btn { text-decoration: none; color: var(--gray-200); }
  a.dash-mini-btn:hover { color: var(--white); }

  .tx-status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--purple-400);
    box-shadow: 0 0 8px rgba(167, 139, 250, 0.5);
  }
  tr[data-status='confirmed'] .tx-status-dot { background: var(--ok); box-shadow: 0 0 8px rgba(110, 231, 183, 0.6); }
  tr[data-status='reverted'] .tx-status-dot { background: var(--err); box-shadow: 0 0 8px rgba(253, 164, 175, 0.55); }
  tr[data-status='pending'] .tx-status-dot { background: var(--warn); box-shadow: 0 0 8px rgba(252, 211, 77, 0.55); animation: tx-dot-blink 1.6s ease-in-out infinite; }
  @keyframes tx-dot-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

  .tx-note { margin: 10px 14px 0; padding-bottom: 0; }

  /* cabezal de la tabla: título de registro + CTA nueva transacción */
  .tx-table-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    margin-bottom: 12px;
  }
  .tx-table-title {
    margin: 0;
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    color: var(--gray-500);
  }
  .tx-table-head .tx-cta-sm {
    width: auto;
    min-height: 36px;
    padding: 0 16px;
    font-size: 0.8rem;
  }

  /* estado vacío */
  .tx-empty { align-items: center; text-align: center; gap: 10px; padding: var(--s-6) var(--s-4); }
  .tx-empty-icon {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 1px solid rgba(196, 181, 253, 0.22);
    background: rgba(124, 58, 237, 0.12);
    color: var(--purple-300);
    margin-bottom: 4px;
  }
  .tx-empty h3 { margin: 0; color: var(--white); }
  .tx-empty p { margin: 0; max-width: 46ch; }

  /* CTA mismo lenguaje que "Conectar Pali Wallet" (morado plano) */
  .tx-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 42px;
    width: min(300px, 100%);
    margin-top: 6px;
    border: none;
    border-radius: 10px;
    background: var(--purple-600, #7c3aed);
    color: var(--white, #fff);
    font-family: var(--font-display, 'Geist Sans', system-ui, sans-serif);
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: background 0.18s ease;
  }
  .tx-cta:hover { background: var(--purple-500, #8b5cf6); }
  .tx-cta:active { background: var(--purple-700, #6d28d9); }
  .tx-cta:focus-visible { outline: 2px solid var(--purple-300, #c4b5fd); outline-offset: 2px; }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  /* scroll horizontal en pantallas angostas, sin romper la fila */
  .tx-table-pane { overflow-x: auto; }

  @media (max-width: 820px) {
    /* colapsan columnas poco críticas: la tabla respira en móvil */
    .tx-table th:nth-child(4), .tx-table td:nth-child(4),
    .tx-table th:nth-child(6), .tx-table td:nth-child(6),
    .tx-table th:nth-child(7), .tx-table td:nth-child(7) { display: none; }
  }
</style>
