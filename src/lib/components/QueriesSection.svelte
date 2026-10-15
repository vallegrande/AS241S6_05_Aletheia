<script>
  /**
   * QueriesSection — módulo ÚNICO de consultas con tabs internas:
   * consulta individual (una dirección) y consulta masiva (varias).
   *
   * Tabs modernas de subrayado: la pastilla de hover SIGUE AL PUNTERO
   * (como el navbar de la landing) y la barra inferior marca la activa.
   */
  import BalanceSingle from './BalanceSingle.svelte'
  import BalanceMulti from './BalanceMulti.svelte'

  const TABS = [
    { id: 'individual', label: 'Consulta individual' },
    { id: 'masiva', label: 'Consulta masiva' },
  ]

  let qTab = $state(0)
  let hoverIdx = $state(-1)

  const hoverX = $derived(hoverIdx < 0 ? '0%' : `${hoverIdx * 100}%`)

  function selectQ(i) {
    qTab = i
  }

  function onKey(e) {
    let next = null
    if (e.key === 'ArrowRight') next = (qTab + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (qTab - 1 + TABS.length) % TABS.length
    if (next != null) {
      e.preventDefault()
      selectQ(next)
      hoverIdx = next
      document.getElementById(`qtab-${TABS[next].id}`)?.focus({ preventScroll: true })
    }
  }
</script>

<section class="dapp-section queries" aria-label="Consultas">
  <!-- svelte-ignore a11y_interactive_supports_focus: el foco lo gestionan los
       role="tab" hijos con roving tabindex (patrón WAI-ARIA tabs) -->
  <div
    class="q-tabs"
    role="tablist"
    aria-label="Tipo de consulta"
    style:--hover-x={hoverX}
    style:--active-idx={qTab}
    onpointerleave={() => (hoverIdx = -1)}
  >
    <!-- pastilla que sigue al puntero -->
    <span class="q-tabs-hover" class:show={hoverIdx >= 0} aria-hidden="true"></span>
    <!-- barra que marca la tab activa -->
    <span class="q-tabs-bar" aria-hidden="true"></span>
    {#each TABS as t, i (t.id)}
      <button
        type="button"
        id={`qtab-${t.id}`}
        role="tab"
        class="q-tab"
        class:active={qTab === i}
        aria-selected={qTab === i}
        aria-controls={`qpanel-${t.id}`}
        tabindex={qTab === i ? 0 : -1}
        onclick={() => selectQ(i)}
        onpointerenter={() => (hoverIdx = i)}
        onfocus={() => (hoverIdx = i)}
        onkeydown={onKey}
      >
        {t.label}
      </button>
    {/each}
  </div>

  <div role="tabpanel" id="qpanel-individual" aria-labelledby="qtab-individual" hidden={qTab !== 0}>
    <BalanceSingle />
  </div>
  <div role="tabpanel" id="qpanel-masiva" aria-labelledby="qtab-masiva" hidden={qTab !== 1}>
    <BalanceMulti />
  </div>
</section>

<style>
  /* ---- tabs de subrayado: sin píldora estática ---- */
  .q-tabs {
    position: relative;
    display: flex;
    max-width: 720px;
    margin-bottom: var(--s-4, 24px);
    /* la línea base sobre la que corre la barra */
    box-shadow: inset 0 -1px 0 rgba(196, 181, 253, 0.14);
  }

  /* pastilla de hover: persigue al puntero entre tabs */
  .q-tabs-hover {
    position: absolute;
    top: 3px;
    bottom: 3px;
    left: 0;
    width: 50%;
    border-radius: 6px;
    background: rgba(139, 92, 246, 0.1);
    transform: translateX(var(--hover-x, 0%));
    transition:
      transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 140ms ease;
    opacity: 0;
    pointer-events: none;
  }

  .q-tabs-hover.show {
    opacity: 1;
  }

  /* barra inferior: marca la tab activa (no al puntero) */
  .q-tabs-bar {
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 50%;
    height: 2px;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--purple-400, #a78bfa), var(--purple-300, #c4b5fd));
    transform: translateX(calc(var(--active-idx, 0) * 100%));
    transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  }

  .q-tab {
    position: relative;
    z-index: 1;
    flex: 1 1 0;
    min-width: 120px;
    min-height: 40px;
    padding: 0 20px;
    border: none;
    background: none;
    color: var(--gray-400, #9c96b0);
    font-family: var(--font-body, 'Geist Sans', system-ui, sans-serif);
    font-size: 0.85rem;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: color 140ms ease;
  }

  .q-tab:hover {
    color: var(--gray-050, #ecebf1);
  }

  .q-tab.active {
    color: var(--white, #fff);
    font-weight: 600;
  }

  .q-tab:focus-visible {
    outline: 2px solid var(--purple-400, #a78bfa);
    outline-offset: -2px;
    border-radius: 6px;
  }

  @media (prefers-reduced-motion: reduce) {
    .q-tabs-hover,
    .q-tabs-bar {
      transition: none;
    }
  }
</style>
