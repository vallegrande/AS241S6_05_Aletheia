<script>
  /**
   * OverviewSection — resumen del dashboard: bienvenida con avatar de
   * Google, métricas de evidencias/certificados, progreso y acciones
   * rápidas hacia los otros módulos.
   */
  import { onMount } from 'svelte'
  import { listEvidences, getProfile } from '../../api/client'
  import { auth } from '../../stores/auth'
  import { PROOF_REGISTRY_ADDRESS } from '../../web3/proof-registry'
  import { fade } from 'svelte/transition'
  import Icon from '../Icon.svelte'
  import StatusMessage from '../dapp/StatusMessage.svelte'

  let { onNavigate = () => {} } = $props()

  const user = $derived($auth.user)
  const initial = $derived((user?.displayName ?? user?.email ?? 'A').trim().charAt(0).toUpperCase())
  const firstName = $derived((user?.displayName ?? user?.email ?? '').trim().split(' ')[0] || 'profesional')

  let loading = $state(true)
  let error = $state('')
  let evidences = $state([])
  let profile = $state(null)

  const total = $derived(evidences.length)
  const hashed = $derived(evidences.filter((e) => e.cert_status === 'hashed' || e.cert_status === 'onchain').length)
  const onchain = $derived(evidences.filter((e) => e.cert_status === 'onchain').length)
  const pending = $derived(total - hashed)
  const progress = $derived(total === 0 ? 0 : Math.round((hashed / total) * 100))
  const profileReady = $derived(Boolean(profile && profile.nombre))
  const recent = $derived(evidences.slice(0, 3))

  const tipoLabel = (id) =>
    ({ proyecto: 'Proyecto', certificacion: 'Certificación', logro: 'Logro', portafolio: 'Portafolio' })[id] ?? id

  onMount(async () => {
    try {
      const [evs, prof] = await Promise.all([listEvidences(), getProfile()])
      evidences = evs
      profile = prof
    } catch (e) {
      error = e.message || 'No se pudo cargar el resumen'
    } finally {
      loading = false
    }
  })

  const ACTIONS = [
    { id: 'perfil', label: 'Completar perfil', icon: 'user', hint: 'Nombre, bio y enlaces' },
    { id: 'evidencias', label: 'Añadir evidencia', icon: 'plus', hint: 'Proyecto, certificado o logro' },
    { id: 'certificados', label: 'Certificar', icon: 'award', hint: 'Huella SHA-256 y on-chain' },
  ]
</script>

<section class="dapp-section ov" aria-label="Resumen">
  {#if loading}
    <StatusMessage tone="muted" spin message="Preparando tu resumen…" />
  {:else if error}
    <StatusMessage tone="error" message={error} />
  {:else}
    <div class="ov-grid" in:fade={{ duration: 280 }}>
      <!-- bienvenida -->
      <article class="ov-welcome" class:incomplete={!profileReady}>
        <div class="ov-av-wrap">
          {#if user?.photoURL}
            <img class="ov-av" src={user.photoURL} alt="" referrerpolicy="no-referrer" />
          {:else}
            <span class="ov-av ov-av-fb" aria-hidden="true">{initial}</span>
          {/if}
        </div>
        <div class="ov-welcome-text">
          <p class="ov-eyebrow">Hola, {firstName}</p>
          <h2 class="ov-title">
            {#if profileReady}
              {profile.nombre}{#if profile.titulo}<span class="ov-title-dim"> · {profile.titulo}</span>{/if}
            {:else}
              Tu perfil aún está vacío
            {/if}
          </h2>
          {#if !profileReady}
            <p class="ov-hint">Importamos tu nombre y foto de Google. Completa el resto para que tu identidad brille.</p>
            <button type="button" class="btn btn-sm" onclick={() => onNavigate('perfil')}>Completar ahora</button>
          {:else}
            <p class="ov-hint">
              {total === 0
                ? 'Añade tu primera evidencia para empezar a construir reputación portable.'
                : `${total} evidencia${total === 1 ? '' : 's'} en tu historial · ${onchain} certificada${onchain === 1 ? '' : 's'} on-chain.`}
            </p>
          {/if}
        </div>
      </article>

      <!-- métricas -->
      <div class="ov-stats">
        <article class="ov-stat">
          <span class="ov-stat-ic" aria-hidden="true"><Icon name="book" size={16} /></span>
          <p class="ov-stat-num">{total}</p>
          <p class="ov-stat-label">Evidencias</p>
        </article>
        <article class="ov-stat">
          <span class="ov-stat-ic warn" aria-hidden="true"><Icon name="zap" size={16} /></span>
          <p class="ov-stat-num">{hashed}</p>
          <p class="ov-stat-label">Con huella</p>
        </article>
        <article class="ov-stat">
          <span class="ov-stat-ic ok" aria-hidden="true"><Icon name="shield" size={16} /></span>
          <p class="ov-stat-num">{onchain}</p>
          <p class="ov-stat-label">On-chain</p>
        </article>
        <article class="ov-stat">
          <span class="ov-stat-ic dim" aria-hidden="true"><Icon name="history" size={16} /></span>
          <p class="ov-stat-num">{pending}</p>
          <p class="ov-stat-label">Pendientes</p>
        </article>
      </div>

      <!-- progreso -->
      <article class="ov-progress">
        <div class="ov-progress-head">
          <p class="ov-progress-title">Cobertura de certificación</p>
          <p class="ov-progress-pct">{progress}%</p>
        </div>
        <div
          class="ov-bar"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Porcentaje de evidencias con huella"
        >
          <span class="ov-bar-fill" style:width={`${progress}%`}></span>
        </div>
        <p class="ov-progress-note">
          {#if total === 0}
            Crea evidencias y genera su huella SHA-256 para avanzar.
          {:else if pending > 0}
            Te faltan {pending} evidencia{pending === 1 ? '' : 's'} por huella.
          {:else}
            Todas tus evidencias tienen huella. Puedes certificarlas on-chain.
          {/if}
          {#if !PROOF_REGISTRY_ADDRESS}
            <span class="ov-progress-warn"> (contrato on-chain sin configurar)</span>
          {/if}
        </p>
      </article>

      <!-- acciones -->
      <div class="ov-actions">
        {#each ACTIONS as a (a.id)}
          <button type="button" class="ov-action" onclick={() => onNavigate(a.id)}>
            <span class="ov-action-ic" aria-hidden="true"><Icon name={a.icon} size={17} /></span>
            <span class="ov-action-text">
              <span class="ov-action-label">{a.label}</span>
              <span class="ov-action-hint">{a.hint}</span>
            </span>
            <span class="ov-action-arrow" aria-hidden="true"><Icon name="arrow" size={14} /></span>
          </button>
        {/each}
      </div>

      <!-- recientes -->
      {#if recent.length > 0}
        <article class="ov-recent">
          <div class="ov-recent-head">
            <p class="ov-recent-title">Recientes</p>
            <button type="button" class="ov-recent-all" onclick={() => onNavigate('evidencias')}>
              Ver todas <Icon name="arrow" size={12} />
            </button>
          </div>
          <ul class="ov-recent-list">
            {#each recent as ev (ev.id)}
              <li class="ov-recent-item">
                <span class="dapp-chip info">{tipoLabel(ev.tipo)}</span>
                <span class="ov-recent-name">{ev.titulo}</span>
                {#if ev.cert_status === 'onchain'}
                  <span class="dapp-chip ok">on-chain</span>
                {:else if ev.cert_status === 'hashed'}
                  <span class="dapp-chip warn">huella</span>
                {:else}
                  <span class="dapp-chip">pendiente</span>
                {/if}
              </li>
            {/each}
          </ul>
        </article>
      {/if}
    </div>
  {/if}
</section>

<style>
  .ov-grid {
    display: grid;
    gap: var(--s-3, 16px);
    max-width: 960px;
  }

  /* ---- bienvenida ---- */
  .ov-welcome {
    display: flex;
    gap: var(--s-4, 24px);
    align-items: center;
    padding: var(--s-4, 24px);
    border: 1px solid rgba(196, 181, 253, 0.14);
    border-radius: var(--radius, 14px);
    background:
      radial-gradient(120% 140% at 0% 0%, rgba(124, 58, 237, 0.18), transparent 55%),
      rgba(10, 7, 22, 0.6);
  }

  .ov-welcome.incomplete {
    border-color: rgba(252, 211, 77, 0.28);
  }

  .ov-av {
    width: 68px;
    height: 68px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(196, 181, 253, 0.4);
    box-shadow: 0 0 26px rgba(124, 58, 237, 0.3);
  }

  .ov-av-fb {
    display: grid;
    place-items: center;
    font-size: 1.5rem;
    font-weight: 650;
    color: var(--purple-300);
    background: linear-gradient(160deg, rgba(52, 40, 96, 0.9), rgba(26, 18, 52, 0.95));
  }

  .ov-welcome-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .ov-eyebrow {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--purple-300);
  }

  .ov-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 650;
    letter-spacing: -0.02em;
    color: var(--white);
    text-wrap: balance;
  }

  .ov-title-dim {
    color: var(--gray-400);
    font-weight: 500;
  }

  .ov-hint {
    margin: 0;
    font-size: 0.84rem;
    color: var(--gray-400);
    line-height: 1.45;
    max-width: 52ch;
  }

  /* ---- métricas ---- */
  .ov-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--s-3, 16px);
  }

  .ov-stat {
    position: relative;
    padding: var(--s-3, 16px);
    border: 1px solid rgba(196, 181, 253, 0.12);
    border-radius: 12px;
    background: rgba(8, 5, 18, 0.55);
    transition: border-color 0.2s ease, transform 0.2s ease;
  }

  .ov-stat:hover {
    border-color: rgba(196, 181, 253, 0.28);
    transform: translateY(-2px);
  }

  .ov-stat-ic {
    position: absolute;
    top: 12px;
    right: 12px;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: rgba(124, 58, 237, 0.14);
    color: var(--purple-300);
  }

  .ov-stat-ic.warn { background: rgba(252, 211, 77, 0.1); color: var(--warn); }
  .ov-stat-ic.ok { background: rgba(110, 231, 183, 0.1); color: var(--ok); }
  .ov-stat-ic.dim { background: rgba(156, 150, 176, 0.1); color: var(--gray-400); }

  .ov-stat-num {
    margin: 0;
    font-size: 1.7rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--white);
    font-variant-numeric: tabular-nums;
  }

  .ov-stat-label {
    margin: 2px 0 0;
    font-size: 0.72rem;
    color: var(--gray-400);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-family: var(--font-mono);
  }

  /* ---- progreso ---- */
  .ov-progress {
    padding: var(--s-3, 16px);
    border: 1px solid rgba(196, 181, 253, 0.12);
    border-radius: 12px;
    background: rgba(8, 5, 18, 0.55);
  }

  .ov-progress-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 10px;
  }

  .ov-progress-title {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--white);
  }

  .ov-progress-pct {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--purple-300);
    font-variant-numeric: tabular-nums;
  }

  .ov-bar {
    height: 8px;
    border-radius: 999px;
    background: rgba(196, 181, 253, 0.1);
    overflow: hidden;
  }

  .ov-bar-fill {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--purple-600), var(--purple-400));
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
    transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .ov-progress-note {
    margin: 10px 0 0;
    font-size: 0.78rem;
    color: var(--gray-400);
  }

  .ov-progress-warn {
    color: var(--warn);
  }

  /* ---- acciones ---- */
  .ov-actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--s-3, 16px);
  }

  .ov-action {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid rgba(196, 181, 253, 0.14);
    border-radius: 12px;
    background: rgba(10, 7, 22, 0.55);
    color: inherit;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
  }

  .ov-action:hover {
    border-color: rgba(167, 139, 250, 0.45);
    background: rgba(26, 18, 52, 0.65);
    transform: translateY(-2px);
  }

  .ov-action:active {
    transform: translateY(0);
  }

  .ov-action:focus-visible {
    outline: 2px solid var(--purple-400);
    outline-offset: 2px;
  }

  .ov-action-ic {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    flex: none;
    border-radius: 10px;
    background: rgba(124, 58, 237, 0.16);
    color: var(--purple-300);
  }

  .ov-action-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }

  .ov-action-label {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--white);
  }

  .ov-action-hint {
    font-size: 0.72rem;
    color: var(--gray-500);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ov-action-arrow {
    color: var(--gray-500);
    flex: none;
    transition: transform 0.15s ease, color 0.15s ease;
  }

  .ov-action:hover .ov-action-arrow {
    color: var(--purple-300);
    transform: translateX(3px);
  }

  /* ---- recientes ---- */
  .ov-recent {
    padding: var(--s-3, 16px);
    border: 1px solid rgba(196, 181, 253, 0.12);
    border-radius: 12px;
    background: rgba(8, 5, 18, 0.55);
  }

  .ov-recent-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .ov-recent-title {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--white);
  }

  .ov-recent-all {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0;
    border: none;
    background: none;
    font-size: 0.76rem;
    color: var(--purple-300);
    cursor: pointer;
  }

  .ov-recent-all:hover {
    text-decoration: underline;
  }

  .ov-recent-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ov-recent-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(5, 3, 14, 0.5);
    border: 1px solid rgba(196, 181, 253, 0.08);
    transition: border-color 0.15s ease;
  }

  .ov-recent-item:hover {
    border-color: rgba(196, 181, 253, 0.2);
  }

  .ov-recent-name {
    flex: 1;
    min-width: 0;
    font-size: 0.85rem;
    color: var(--white);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 900px) {
    .ov-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .ov-actions {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 560px) {
    .ov-welcome {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
