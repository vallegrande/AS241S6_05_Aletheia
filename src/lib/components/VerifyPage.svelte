<script>
  /**
   * VerifyPage — verificación PÚBLICA de huellas (sin sesión).
   * Pegar un SHA-256 → consulta la API (Postgres) y muestra el estado.
   */
  import { verifyHash } from '../api/client'
  import { getTxUrl } from '../web3/chains'
  import StatusMessage from './dapp/StatusMessage.svelte'
  import FormField from './dapp/FormField.svelte'
  import Icon from './Icon.svelte'

  let hashInput = $state('')
  let loading = $state(false)
  let error = $state('')
  let result = $state(null) // VerifyResult | null
  let searched = $state(false)

  async function onSubmit(e) {
    e.preventDefault()
    const h = hashInput.trim()
    if (!h) return
    loading = true
    error = ''
    result = null
    searched = true
    try {
      result = await verifyHash(h)
    } catch (err) {
      error = err.message || 'No se pudo verificar la huella'
    } finally {
      loading = false
    }
  }

  const tipoLabel = (id) =>
    ({ proyecto: 'Proyecto', certificacion: 'Certificación', logro: 'Logro', portafolio: 'Portafolio' })[id] ?? id

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString('es-PE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        })
      : '—'
</script>

<main class="vf-page">
  <div class="vf-card">
    <span class="vf-mark" aria-hidden="true"><Icon name="shield" size={22} /></span>
    <h1 class="vf-title">Verificar evidencia</h1>
    <p class="vf-sub">
      Pega la huella SHA-256 de una evidencia certificada en Aletheia para comprobar
      su registro. Cualquiera puede verificar: no se requiere cuenta.
    </p>

    <form class="vf-form" onsubmit={onSubmit}>
      <FormField label="Huella SHA-256" for="vf-hash" help="64 caracteres hexadecimales (opcionalmente con 0x).">
        <div class="vf-row">
          <input
            id="vf-hash"
            bind:value={hashInput}
            placeholder="a3f2… (64 hex)"
            spellcheck="false"
            autocomplete="off"
            required
          />
          <button type="submit" class="btn" disabled={loading}>
            {loading ? 'Verificando…' : 'Verificar'}
          </button>
        </div>
      </FormField>
    </form>

    {#if loading}
      <StatusMessage tone="muted" spin message="Consultando registro…" />
    {:else if error}
      <StatusMessage tone="error" message={error} />
    {:else if searched && result}
      {#if result.found}
        <div class="vf-result ok">
          <p class="vf-result-head">
            <span class="dapp-chip ok">registrada</span>
            <strong>{result.evidence.titulo}</strong>
          </p>
          <dl class="vf-kv">
            <div><dt>Tipo</dt><dd>{tipoLabel(result.evidence.tipo)}</dd></div>
            <div><dt>Huella</dt><dd class="vf-mono">{result.evidence.hash}</dd></div>
            <div><dt>Estado</dt>
              <dd>
                {#if result.evidence.cert_status === 'onchain'}
                  Certificada on-chain
                {:else}
                  Huella en el registro de Aletheia
                {/if}
              </dd>
            </div>
            <div><dt>Fecha del registro</dt><dd>{fmt(result.evidence.created_at)}</dd></div>
            {#if result.evidence.fecha}
              <div><dt>Fecha de la evidencia</dt><dd>{fmt(result.evidence.fecha)}</dd></div>
            {/if}
            {#if result.evidence.tx_hash && result.evidence.chain_id}
              <div>
                <dt>Transacción</dt>
                <dd>
                  <a href={getTxUrl(result.evidence.chain_id, result.evidence.tx_hash)} target="_blank" rel="noopener noreferrer">
                    ver en explorador ↗
                  </a>
                </dd>
              </div>
            {/if}
            {#if result.evidence.descripcion}
              <div class="vf-span"><dt>Descripción</dt><dd>{result.evidence.descripcion}</dd></div>
            {/if}
          </dl>
          <p class="vf-note">
            La huella confirma la integridad del registro desde su certificación.
            No garantiza por sí sola la veracidad del contenido original.
          </p>
        </div>
      {:else}
        <StatusMessage tone="warn" message="No se encontró ninguna evidencia con esa huella." />
      {/if}
    {/if}

    <a class="vf-home" href="#inicio">
      <Icon name="arrow" size={13} /> Volver a la página principal
    </a>
  </div>
</main>

<style>
  .vf-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: calc(var(--dapp-header-h, 72px) + 32px) var(--s-4, 20px) var(--s-6, 40px);
  }

  .vf-card {
    width: min(680px, 100%);
    display: flex;
    flex-direction: column;
    gap: var(--s-3, 16px);
    padding: var(--s-5, 32px);
    border: var(--border-strong, 1px solid rgba(196, 181, 253, 0.2));
    border-radius: var(--radius, 16px);
    background: rgba(10, 7, 20, 0.72);
    backdrop-filter: blur(18px);
    box-shadow: var(--glow-md, 0 0 40px rgba(124, 58, 237, 0.12));
  }

  .vf-mark {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid rgba(167, 139, 250, 0.35);
    background: rgba(124, 58, 237, 0.12);
    color: var(--purple-300);
  }

  .vf-title {
    margin: 0;
    font-size: 1.5rem;
    color: var(--white);
  }

  .vf-sub {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--gray-400);
    max-width: 52ch;
  }

  .vf-row {
    display: flex;
    gap: var(--s-2, 10px);
    align-items: stretch;
  }

  .vf-row input {
    flex: 1;
    min-width: 0;
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }

  .vf-result {
    padding: var(--s-3, 16px);
    border-radius: 12px;
    border: 1px solid rgba(110, 231, 183, 0.25);
    background: rgba(16, 185, 129, 0.06);
  }

  .vf-result-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 12px;
    color: var(--white);
    flex-wrap: wrap;
  }

  .vf-kv {
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px 16px;
  }

  .vf-kv > div {
    min-width: 0;
  }

  .vf-kv > .vf-span {
    grid-column: 1 / -1;
  }

  .vf-kv dt {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gray-500);
  }

  .vf-kv dd {
    margin: 2px 0 0;
    font-size: 0.85rem;
    color: var(--white);
    word-break: break-all;
  }

  .vf-kv a {
    color: var(--purple-300);
  }

  .vf-mono {
    font-family: var(--font-mono);
    font-size: 0.72rem !important;
  }

  .vf-note {
    margin: 14px 0 0;
    padding-top: 10px;
    border-top: 1px solid rgba(196, 181, 253, 0.12);
    font-size: 0.78rem;
    color: var(--gray-500);
    line-height: 1.45;
  }

  .vf-home {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 0.82rem;
    color: var(--purple-300);
    text-decoration: none;
  }

  .vf-home:hover {
    text-decoration: underline;
  }

  .vf-home :global(svg) {
    transform: rotate(180deg);
  }
</style>
