<script>
  /**
   * PanelModal — modal de vidrio para los módulos que viven en el sidebar
   * (red, wallet). Escape, click fuera o botón X cierran. El foco entra
   * al diálogo al abrirse.
   */
  import { fade, fly } from 'svelte/transition'
  import Icon from './Icon.svelte'

  let { title = '', width = 560, onClose, children } = $props()

  let dialogEl = $state(null)

  function onKey(e) {
    if (e.key === 'Escape') onClose?.()
  }

  $effect(() => {
    dialogEl?.focus({ preventScroll: true })
  })
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
<div
  class="pm-backdrop"
  onclick={(e) => e.target === e.currentTarget && onClose?.()}
  onkeydown={(e) => e.key === 'Escape' && onClose?.()}
  transition:fade={{ duration: 180 }}
>
  <div
    class="pm"
    role="dialog"
    aria-modal="true"
    aria-label={title}
    tabindex="-1"
    bind:this={dialogEl}
    style="max-width: {width}px"
    transition:fly={{ y: 18, duration: 260 }}
  >
    <header class="pm-head">
      <h2 class="pm-title">{title}</h2>
      <button type="button" class="pm-close" onclick={onClose} aria-label="Cerrar">
        <Icon name="x" size={15} />
      </button>
    </header>
    <div class="pm-body">
      {@render children?.()}
    </div>
  </div>
</div>

<style>
  .pm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .pm {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 20px 22px 22px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    background: #141418;
    box-shadow:
      0 24px 64px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
    max-height: calc(100dvh - 48px);
    overflow-y: auto;
    outline: none;
  }

  .pm-head {
    position: sticky;
    top: -20px;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: -4px -4px 0;
    padding: 4px 4px 12px;
    background: #141418;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .pm-title {
    margin: 0;
    font-family: var(--font-display, 'Geist Sans', system-ui, sans-serif);
    font-size: 1.05rem;
    font-weight: 650;
    letter-spacing: -0.015em;
    color: #fff;
  }

  .pm-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex: none;
    border: 1px solid transparent;
    border-radius: 10px;
    background: none;
    color: #8a8a96;
    cursor: pointer;
    transition:
      color 0.15s ease,
      background 0.15s ease,
      border-color 0.15s ease,
      transform 0.15s ease;
  }

  .pm-close:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .pm-close:active {
    transform: scale(0.92);
  }

  .pm-close:focus-visible {
    outline: 2px solid #e8e8ec;
    outline-offset: 2px;
  }

  .pm-body {
    min-width: 0;
  }
</style>
