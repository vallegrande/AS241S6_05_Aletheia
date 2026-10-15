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
    background: rgba(5, 3, 16, 0.62);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .pm {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: none;
    border-radius: 14px;
    /* UN solo color: superficie sólida, sin vidrio ni capas */
    background: #0f0b16;
    box-shadow: 0 12px 40px rgba(3, 0, 12, 0.45);
    max-height: calc(100dvh - 48px);
    overflow-y: auto;
    outline: none;
  }

  .pm-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 8px;
  }

  .pm-title {
    margin: 0;
    font-family: var(--font-display, 'Geist Sans', system-ui, sans-serif);
    font-size: 1rem;
    font-weight: 650;
    letter-spacing: -0.01em;
    color: var(--white, #fff);
  }

  .pm-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex: none;
    border: none;
    border-radius: 8px;
    background: none;
    color: var(--gray-400, #9c96b0);
    cursor: pointer;
    transition:
      color 0.15s ease,
      background 0.15s ease,
      transform 0.15s ease;
  }

  .pm-close:hover {
    color: var(--purple-300, #c4b5fd);
    background: rgba(139, 92, 246, 0.12);
  }

  .pm-close:active {
    transform: scale(0.92);
  }

  .pm-close:focus-visible {
    outline: 2px solid var(--purple-400, #a78bfa);
    outline-offset: 2px;
  }

  .pm-body {
    min-width: 0;
  }
</style>
