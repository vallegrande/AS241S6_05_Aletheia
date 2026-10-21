<script>
  /**
   * EvidenceQr — QR de verificación pública de una evidencia con huella.
   * Apunta a #/verificar?hash=…, que verifica al entrar, sin cuenta.
   * Se muestra dentro de un PanelModal.
   */
  import QRCode from 'qrcode'
  import { pushToast } from '../../stores/toast'
  import StatusMessage from '../dapp/StatusMessage.svelte'
  import Icon from '../Icon.svelte'

  let { evidence } = $props()

  let qrUrl = $state('')
  let error = $state('')

  const verifyUrl = $derived(
    `${location.origin}${location.pathname}#/verificar?hash=${encodeURIComponent(evidence.hash)}`
  )

  $effect(() => {
    if (!evidence.hash) return
    QRCode.toDataURL(verifyUrl, {
      margin: 2,
      width: 480,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b0613ff', light: '#ffffffff' },
    })
      .then((url) => (qrUrl = url))
      .catch((e) => (error = e.message || 'No se pudo generar el QR'))
  })

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(verifyUrl)
      pushToast('success', 'Enlace copiado', 'Compártelo o pégalo en cualquier navegador.')
    } catch {
      pushToast('error', 'No se pudo copiar', 'Copia el enlace manualmente.')
    }
  }
</script>

{#if !evidence.hash}
  <StatusMessage tone="warn" message="Esta evidencia aún no tiene huella. Genera la huella SHA-256 primero." />
{:else if error}
  <StatusMessage tone="error" message={error} />
{:else}
  <div class="qr-card">
    {#if qrUrl}
      <img class="qr-img" src={qrUrl} alt="QR de verificación de {evidence.titulo}" width="240" height="240" />
    {:else}
      <div class="qr-placeholder" aria-live="polite">
        <span class="mini-spinner" aria-hidden="true"></span>
      </div>
    {/if}
    <div class="qr-info">
      <h3 class="qr-title">{evidence.titulo}</h3>
      <p class="qr-hint">Escanea el código o comparte el enlace: cualquiera puede verificar esta evidencia, sin cuenta.</p>
      <div class="qr-link-row">
        <code class="qr-url">{verifyUrl}</code>
        <button type="button" class="btn btn-sm" onclick={copyLink}>
          <Icon name="copy" size={13} /> Copiar enlace
        </button>
      </div>
      <p class="qr-note">
        El QR apunta a la verificación pública de la huella
        <span class="qr-hash">{evidence.hash.slice(0, 12)}…</span>
      </p>
    </div>
  </div>
{/if}

<style>
  .qr-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s-3, 16px);
    text-align: center;
  }

  .qr-img,
  .qr-placeholder {
    width: 240px;
    height: 240px;
    padding: 10px;
    border-radius: 16px;
    background: #ffffff;
  }

  .qr-placeholder {
    display: grid;
    place-items: center;
  }

  .qr-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    max-width: 100%;
  }

  .qr-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 650;
    color: var(--white);
  }

  .qr-hint {
    margin: 0;
    font-size: 0.82rem;
    line-height: 1.45;
    color: var(--gray-400, #9c96b0);
    max-width: 40ch;
  }

  .qr-link-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    max-width: 420px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .qr-url {
    flex: 1;
    min-width: 0;
    padding: 7px 10px;
    border: 1px solid rgba(196, 181, 253, 0.18);
    border-radius: 8px;
    background: rgba(8, 5, 18, 0.5);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--purple-300);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
  }

  .qr-note {
    margin: 0;
    font-size: 0.74rem;
    color: var(--gray-500, #726c86);
  }

  .qr-hash {
    font-family: var(--font-mono);
    color: var(--gray-400, #9c96b0);
  }
</style>
