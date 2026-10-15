<script>
  /**
   * NetworkSelect — combobox de redes (patrón WAI-ARIA listbox button).
   *
   * Sustituye al <select> nativo para que las opciones lleven icono de red,
   * grupos EVM/UTXO con caption y marcador de testnet, todo en el vidrio
   * Nocturne del panel. Teclado completo: Enter/Espacio abre, flechas y
   * Home/End navegan, Enter selecciona, Esc cierra. El foco queda en el
   * trigger (aria-activedescendant marca la opción en foco).
   */
  import { NETWORKS, networkIcon, getNetwork } from '../../web3/networks'
  import Icon from '../Icon.svelte'

  let { value = $bindable('sepolia'), id = 'netselect' } = $props()

  let open = $state(false)
  let active = $state(-1) // índice dentro de ALL (para aria-activedescendant)
  let triggerEl = $state(null)

  /* familias con caption: mismo orden del catálogo */
  const GROUPS = $derived([
    { label: 'EVM', nets: NETWORKS.filter((n) => n.kind === 'evm') },
    { label: 'UTXO', nets: NETWORKS.filter((n) => n.kind === 'utxo') },
  ])

  /* lista plana en el mismo orden visual (para navegación plana) */
  const ALL = $derived(GROUPS.flatMap((g) => g.nets))

  const current = $derived(getNetwork(value) ?? ALL[0])

  function openMenu() {
    if (open) {
      closeMenu()
      return
    }
    open = true
    active = ALL.findIndex((n) => n.id === value)
  }

  function closeMenu(focusBack = true) {
    open = false
    if (focusBack) triggerEl?.focus({ preventScroll: true })
  }

  function choose(id) {
    value = id
    closeMenu()
  }

  function onTriggerKey(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      openMenu()
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      active = Math.min(active + 1, ALL.length - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      active = Math.max(active - 1, 0)
    } else if (e.key === 'Home') {
      e.preventDefault()
      active = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      active = ALL.length - 1
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const n = ALL[active]
      if (n) choose(n.id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeMenu()
    } else if (e.key === 'Tab') {
      open = false
    }
  }

  function onWindowPointerDown(e) {
    if (open && !e.target.closest('.net-sel')) closeMenu(false)
  }
</script>

<svelte:window onpointerdown={onWindowPointerDown} />

<div class="net-sel">
  <button
    type="button"
    bind:this={triggerEl}
    class="ns-trigger"
    class:open
    id={id}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-labelledby={`${id}-label`}
    onclick={openMenu}
    onkeydown={onTriggerKey}
  >
    <span class="ns-ic" aria-hidden="true"><Icon name={networkIcon(current?.id)} size={16} /></span>
    <span class="ns-value" id={`${id}-label`}>
      <span class="ns-name">{current?.label}</span>
      <span class="ns-sym">{current?.symbol}</span>
      {#if current?.testnet}<span class="ns-test">TEST</span>{/if}
    </span>
    <span class="ns-chevron" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
    </span>
  </button>

  {#if open}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
    <ul
      class="ns-menu"
      role="listbox"
      aria-labelledby={`${id}-label`}
      onkeydown={onTriggerKey}
    >
      {#each GROUPS as group (group.label)}
        <li class="ns-group" role="presentation">
          <p class="ns-group-label" aria-hidden="true">{group.label}</p>
          <ul class="ns-group-list" role="presentation">
            {#each group.nets as n (n.id)}
              {@const idx = ALL.indexOf(n)}
              <li
                role="option"
                class="ns-opt"
                class:active={idx === active}
                class:selected={n.id === value}
                id={`${id}-opt-${idx}`}
                aria-selected={n.id === value}
                aria-label={`${n.label} (${n.symbol})${n.testnet ? ' · testnet' : ''}`}
                onpointermove={() => (active = idx)}
                onclick={() => choose(n.id)}
                onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), choose(n.id))}
              >
                <span class="ns-ic" aria-hidden="true"><Icon name={networkIcon(n.id)} size={15} /></span>
                <span class="ns-opt-name">{n.label}</span>
                {#if n.testnet}<span class="ns-test" aria-hidden="true">TEST</span>{/if}
                <span class="ns-opt-sym">{n.symbol}</span>
                {#if n.id === value}
                  <span class="ns-check" aria-hidden="true"><Icon name="check" size={14} /></span>
                {/if}
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>
  {/if}
</div>
