<script>
  /**
   * CertificatesSection — selección de evidencias para certificar:
   *  1) Generar huella SHA-256 (WebCrypto) y guardarla (cert_status: hashed).
   *  2) Registrar la huella en el contrato ProofRegistry (Polygon Amoy).
   *
   * La wallet SOLO se pide en el paso 2. El paso 1 es 100% local + API.
   */
  import { onMount } from 'svelte'
  import { listEvidences, updateEvidence } from '../../api/client'
  import { evidenceFingerprint } from '../../crypto/hash'
  import {
    PROOF_REGISTRY_ADDRESS,
    PROOF_CHAIN_ID,
    registerHashOnChain,
  } from '../../web3/proof-registry'
  import { getTxUrl } from '../../web3/chains'
  import { wallet, connectWallet } from '../../stores/wallet'
  import { pushToast } from '../../stores/toast'
  import StatusMessage from '../dapp/StatusMessage.svelte'
  import PanelModal from '../PanelModal.svelte'
  import EvidenceQr from './EvidenceQr.svelte'
  import Icon from '../Icon.svelte'
  import { fly } from 'svelte/transition'

  let items = $state([])
  let loading = $state(true)
  let error = $state('')
  let busyId = $state(null)
  let busyKind = $state('') // 'hash' | 'onchain'
  let qrEv = $state(null) // evidencia cuyo QR se muestra en el modal

  const contractReady = Boolean(PROOF_REGISTRY_ADDRESS)

  async function refresh() {
    error = ''
    try {
      items = await listEvidences()
    } catch (e) {
      error = e.message || 'No se pudieron cargar las evidencias'
    } finally {
      loading = false
    }
  }

  onMount(refresh)

  async function makeHash(ev) {
    busyId = ev.id
    busyKind = 'hash'
    try {
      const file = ev.has_file ? await fetchFile(ev.id) : null
      const hash = await evidenceFingerprint({
        tipo: ev.tipo,
        titulo: ev.titulo,
        descripcion: ev.descripcion,
        enlace: ev.enlace,
        fecha: ev.fecha,
        file,
      })
      await updateEvidence(ev.id, { hash, cert_status: 'hashed' })
      pushToast('success', 'Huella generada', `${ev.titulo} → SHA-256`)
      await refresh()
    } catch (err) {
      pushToast('error', 'No se pudo generar la huella', err.message)
    } finally {
      busyId = null
      busyKind = ''
    }
  }

  async function fetchFile(id) {
    const token = await (await import('../../stores/auth')).getIdToken()
    const res = await fetch(`/api/evidences/${id}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return null
    return res.blob()
  }

  async function certifyOnChain(ev) {
    if (!ev.hash) return
    if (!$wallet.connected) {
      try {
        await connectWallet()
      } catch {
        pushToast('warning', 'Wallet requerida', 'Conecta Pali Wallet para certificar on-chain.')
        return
      }
    }
    busyId = ev.id
    busyKind = 'onchain'
    try {
      const txHash = await registerHashOnChain(ev.hash)
      await updateEvidence(ev.id, {
        cert_status: 'onchain',
        tx_hash: txHash,
        chain_id: PROOF_CHAIN_ID,
      })
      pushToast('success', 'Certificada en Polygon Amoy', `tx ${txHash.slice(0, 10)}…`)
      await refresh()
    } catch (err) {
      pushToast('error', 'No se pudo certificar', err.message)
    } finally {
      busyId = null
      busyKind = ''
    }
  }

  async function copyHash(hash) {
    try {
      await navigator.clipboard.writeText(hash)
      pushToast('info', 'Huella copiada', hash.slice(0, 16) + '…')
    } catch {
      pushToast('error', 'No se pudo copiar', 'Copia manualmente desde la fila.')
    }
  }

  const short = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '—')
</script>

<section class="dapp-section" aria-label="Certificados">
  {#if !contractReady}
    <StatusMessage
      tone="warn"
      message="El contrato ProofRegistry aún no está desplegado. Puedes generar huellas SHA-256; el registro on-chain se habilita al configurar VITE_PROOF_REGISTRY_ADDRESS en el .env."
    />
  {/if}

  {#if loading}
    <StatusMessage tone="muted" spin message="Cargando evidencias…" />
  {:else if error}
    <StatusMessage tone="error" message={error} />
  {:else if items.length === 0}
    <StatusMessage tone="muted" message="Primero crea evidencias en el módulo Evidencias; desde ahí podrás certificarlas aquí." />
  {:else}
    <ul class="ct-list">
      {#each items as ev, i (ev.id)}
        <li class="ct-item" in:fly={{ y: 10, duration: 240, delay: Math.min(i * 40, 200) }}>
          <div class="ct-main">
            <div class="ct-head">
              <h3 class="ct-title">{ev.titulo}</h3>
              {#if ev.cert_status === 'onchain'}
                <span class="dapp-chip ok">on-chain</span>
              {:else if ev.cert_status === 'hashed'}
                <span class="dapp-chip warn">huella lista</span>
              {:else}
                <span class="dapp-chip">pendiente</span>
              {/if}
            </div>
            {#if ev.hash}
              <button type="button" class="ct-hash" onclick={() => copyHash(ev.hash)} title="Copiar huella completa">
                SHA-256 {short(ev.hash)}
              </button>
            {/if}
            {#if ev.tx_hash && ev.chain_id}
              <a class="ct-tx" href={getTxUrl(ev.chain_id, ev.tx_hash)} target="_blank" rel="noopener noreferrer">
                ver transacción ↗
              </a>
            {/if}
          </div>
          <div class="ct-actions">
            {#if ev.hash}
              <button
                type="button"
                class="btn btn-sm"
                onclick={() => (qrEv = ev)}
                title="QR de verificación pública (huella SHA-256)"
              >
                <Icon name="qr" size={13} /> QR
              </button>
            {/if}
            <button
              type="button"
              class="btn btn-sm"
              onclick={() => makeHash(ev)}
              disabled={busyId === ev.id}
            >
              {#if busyId === ev.id && busyKind === 'hash'}
                <span class="mini-spinner" aria-hidden="true"></span> Generando…
              {:else}
                {ev.hash ? 'Regenerar huella' : 'Generar huella'}
              {/if}
            </button>
            <button
              type="button"
              class="btn btn-sm"
              onclick={() => certifyOnChain(ev)}
              disabled={!ev.hash || ev.cert_status === 'onchain' || !contractReady || busyId === ev.id}
              title={ev.cert_status === 'onchain' ? 'Ya certificada' : !ev.hash ? 'Genera la huella primero' : 'Registrar en Polygon Amoy'}
            >
              {#if busyId === ev.id && busyKind === 'onchain'}
                <span class="mini-spinner" aria-hidden="true"></span> Firmando…
              {:else}
                <Icon name="zap" size={13} /> Certificar on-chain
              {/if}
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if qrEv}
    <PanelModal title="QR de verificación" width={440} onClose={() => (qrEv = null)}>
      <EvidenceQr evidence={qrEv} />
    </PanelModal>
  {/if}
</section>

<style>
  .ct-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .ct-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    padding: var(--s-3, 16px);
    border: 1px solid rgba(196, 181, 253, 0.12);
    border-radius: 12px;
    background: rgba(8, 5, 18, 0.5);
  }

  .ct-main {
    min-width: 0;
    flex: 1;
  }

  .ct-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ct-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--white);
  }

  .ct-hash {
    display: inline-block;
    margin-top: 6px;
    padding: 0;
    border: none;
    background: none;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--purple-300);
    cursor: pointer;
  }

  .ct-hash:hover {
    text-decoration: underline;
  }

  .ct-tx {
    display: inline-block;
    margin-left: 12px;
    margin-top: 6px;
    font-size: 0.75rem;
    color: var(--mint, #6ee7b7);
    text-decoration: none;
  }

  .ct-tx:hover {
    text-decoration: underline;
  }

  .ct-actions {
    display: flex;
    gap: 6px;
    flex: none;
    flex-wrap: wrap;
  }

  @media (max-width: 700px) {
    .ct-item {
      flex-direction: column;
      align-items: stretch;
    }

    .ct-actions .btn {
      flex: 1;
    }
  }
</style>
