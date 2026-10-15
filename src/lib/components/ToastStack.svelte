<script>
  /**
   * ToastStack — notificaciones flotantes de la app (esquina inferior derecha).
   *
   * Tonos:
   *   warning → cancelaciones del usuario (cerró el popup de Google)
   *   error   → fallos reales (red, dominio, configuración)
   *   success → confirmaciones
   *
   * Auto-cierra según ttl; el usuario puede cerrarlas con la X.
   */
  import { toasts, dismissToast } from '../stores/toast'
  import { fly } from 'svelte/transition'

  const ICONS = {
    warning:
      'M12 9v4m0 4h.01M10.29 3.86l-8.02 13.9A2 2 0 0 0 3.95 21h16.1a2 2 0 0 0 1.73-3.24l-8.02-13.9a2 2 0 0 0-3.47 0Z',
    error:
      'M12 9v4m0 4h.01M10.29 3.86l-8.02 13.9A2 2 0 0 0 3.95 21h16.1a2 2 0 0 0 1.73-3.24l-8.02-13.9a2 2 0 0 0-3.47 0Z',
    success: 'M20 6L9 17l-5-5',
    info: 'M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  }
</script>

<div class="toast-stack" aria-live="polite">
  {#each $toasts as t (t.id)}
    <div class="toast {t.tone}" role="status" transition:fly={{ y: 16, duration: 260 }}>
      <span class="t-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d={ICONS[t.tone] ?? ICONS.info} />
        </svg>
      </span>
      <div class="t-body">
        <strong class="t-title">{t.title}</strong>
        {#if t.detail}
          <span class="t-detail">{t.detail}</span>
        {/if}
      </div>
      <button class="t-close" onclick={() => dismissToast(t.id)} aria-label="Cerrar aviso">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-stack {
    position: fixed;
    right: 22px;
    bottom: 22px;
    z-index: 90;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: min(360px, calc(100vw - 44px));
    pointer-events: none; /* el stack no bloquea; los toasts sí */
  }

  .toast {
    pointer-events: auto;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 13px 14px;
    border-radius: 14px;
    border: 1px solid rgba(167, 139, 250, 0.25);
    background: rgba(24, 17, 48, 0.92);
    backdrop-filter: blur(18px);
    box-shadow: 0 12px 40px rgba(5, 2, 12, 0.55);
  }

  /* ---- tonos ---- */
  .toast.warning {
    border-color: rgba(251, 191, 36, 0.4);
    background: linear-gradient(180deg, rgba(58, 44, 12, 0.94), rgba(38, 28, 10, 0.94));
  }

  .toast.warning .t-icon {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.14);
  }

  .toast.error {
    border-color: rgba(248, 113, 113, 0.42);
    background: linear-gradient(180deg, rgba(62, 18, 22, 0.94), rgba(42, 12, 15, 0.94));
  }

  .toast.error .t-icon {
    color: #f87171;
    background: rgba(248, 113, 113, 0.14);
  }

  .toast.success {
    border-color: rgba(110, 231, 183, 0.4);
    background: linear-gradient(180deg, rgba(14, 46, 35, 0.94), rgba(9, 32, 24, 0.94));
  }

  .toast.success .t-icon {
    color: #6ee7b7;
    background: rgba(110, 231, 183, 0.14);
  }

  .toast.info .t-icon {
    color: var(--purple-300, #c4b5fd);
    background: rgba(167, 139, 250, 0.14);
  }

  /* ---- icono ---- */
  .t-icon {
    flex: none;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
  }

  /* ---- texto ---- */
  .t-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .t-title {
    font-family: var(--font-display);
    font-size: 0.88rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--gray-050, #f4f2fa);
  }

  .t-detail {
    font-family: var(--font-body);
    font-size: 0.8rem;
    line-height: 1.45;
    color: var(--gray-300, #c9c4da);
  }

  /* ---- cerrar ---- */
  .t-close {
    flex: none;
    margin-left: auto;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--gray-400, #9b94b8);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .t-close:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--gray-100, #e9e6f5);
  }

  .t-close:focus-visible {
    outline: 2px solid var(--purple-400, #a78bfa);
    outline-offset: 1px;
  }
</style>
