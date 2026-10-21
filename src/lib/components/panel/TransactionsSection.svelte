<script>
  /**
   * TransactionsSection — historial de transacciones on-chain: cada registro
   * de huella en ProofRegistry, con su tx, red, fecha y enlace al explorador.
   * A diferencia de Certificados, aquí quedan todas (re-certificaciones incluidas).
   */
  import { onMount } from 'svelte'
  import { listTransactions } from '../../api/client'
  import { getTxUrl, prettyNetwork } from '../../web3/chains'
  import { pushToast } from '../../stores/toast'
  import StatusMessage from '../dapp/StatusMessage.svelte'
  import Icon from '../Icon.svelte'
  import { fly } from 'svelte/transition'

  let items = $state([])
  let loading = $state(true)
  let error = $state('')

  async function refresh() {
    error = ''
    try {
      items = await listTransactions()
    } catch (e) {
      error = e.message || 'No se pudo cargar el historial'
    } finally {
      loading = false
    }
  }

  onMount(refresh)

  async function copyTx(hash) {
    try {
      await navigator.clipboard.writeText(hash)
      pushToast('info', 'Transacción copiada', hash.slice(0, 16) + '…')
    } catch {
      pushToast('error', 'No se pudo copiar', 'Copia manualmente desde la fila.')
    }
  }

  const fmtDate = (iso) =>
    new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })

  const short = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '—')
  const netName = (chainId) => prettyNetwork('', chainId)
</script>

<section class="dapp-section" aria-label="Historial de transacciones">
  {#if loading}
    <StatusMessage tone="muted" spin message="Cargando transacciones…" />
  {:else if error}
    <StatusMessage tone="error" message={error} />
  {:else if items.length === 0}
    <StatusMessage tone="muted" message="Aún no hay transacciones. Certifica una evidencia en el módulo Certificados y su registro aparecerá aquí." />
  {:else}
    <ul class="tx-list">
      {#each items as tx, i (tx.id)}
        <li class="tx-item" in:fly={{ y: 10, duration: 240, delay: Math.min(i * 40, 200) }}>
          <div class="tx-date">{fmtDate(tx.created_at)}</div>
          <div class="tx-main">
            <div class="tx-head">
              <h3 class="tx-title">{tx.titulo}</h3>
              <span class="dapp-chip">{netName(tx.chain_id)}</span>
              {#if tx.cert_status !== 'onchain'}
                <span class="dapp-chip warn">re-certificada después</span>
              {/if}
            </div>
            <div class="tx-meta">
              <button
                type="button"
                class="tx-hash"
                onclick={() => copyTx(tx.tx_hash)}
                title="Copiar hash de transacción completo"
              >
                tx {short(tx.tx_hash)}
              </button>
              {#if tx.hash}
                <span class="tx-evidence-hash" title="Huella SHA-256 registrada">huella {short(tx.hash)}</span>
              {/if}
            </div>
          </div>
          {#if getTxUrl(tx.chain_id, tx.tx_hash)}
            <a
              class="tx-link"
              href={getTxUrl(tx.chain_id, tx.tx_hash)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="external" size={13} /> explorador
            </a>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .tx-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .tx-item {
    display: flex;
    align-items: center;
    gap: var(--s-3, 16px);
    padding: var(--s-3, 16px);
    border: 1px solid rgba(196, 181, 253, 0.12);
    border-radius: 12px;
    background: rgba(8, 5, 18, 0.5);
  }

  .tx-date {
    flex: none;
    width: 132px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--gray-400, #9c96b0);
    line-height: 1.4;
  }

  .tx-main {
    min-width: 0;
    flex: 1;
  }

  .tx-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tx-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--white);
  }

  .tx-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 6px;
    flex-wrap: wrap;
  }

  .tx-hash {
    display: inline-block;
    padding: 0;
    border: none;
    background: none;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--purple-300);
    cursor: pointer;
  }

  .tx-hash:hover {
    text-decoration: underline;
  }

  .tx-evidence-hash {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--gray-500, #726c86);
  }

  .tx-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
    padding: 6px 12px;
    border: 1px solid rgba(110, 231, 183, 0.28);
    border-radius: 8px;
    font-size: 0.75rem;
    color: var(--mint, #6ee7b7);
    text-decoration: none;
    transition: background 0.18s ease, border-color 0.18s ease;
  }

  .tx-link:hover {
    background: rgba(110, 231, 183, 0.08);
    border-color: rgba(110, 231, 183, 0.5);
  }

  @media (max-width: 700px) {
    .tx-item {
      flex-direction: column;
      align-items: stretch;
    }

    .tx-date {
      width: auto;
    }

    .tx-link {
      justify-content: center;
    }
  }
</style>
