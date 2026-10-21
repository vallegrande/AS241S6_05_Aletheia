<script>
  /**
   * LoginModal — acceso con Google.
   *
   * Superficie sobria (Nocturne): plano casi negro con filo de luz, cabecera
   * de marca, cuerpo editorial y pie de privacidad. Todo en Geist Sans.
   * Cierra con Escape, click fuera o el botón X. Loading state y errores
   * inmediatos.
   */
  import { signInWithGoogle } from '../stores/auth'
  import GoogleMark from './GoogleMark.svelte'
  import { fade, fly } from 'svelte/transition'

  let { onClose } = $props()

  let loading = $state(false)
  let error = $state('')

  async function handleLogin() {
    loading = true
    error = ''

    try {
      await signInWithGoogle()
      // Login exitoso — cerrar modal
      onClose?.()
    } catch (err) {
      error = err.message || 'No se pudo iniciar sesión'
      loading = false
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') onClose?.()
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose?.()
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
<div
  class="modal-backdrop"
  onclick={handleBackdropClick}
  onkeydown={(e) => e.key === 'Escape' && onClose?.()}
  transition:fade={{ duration: 180 }}
>
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-label="Iniciar sesión"
    transition:fly={{ y: 16, duration: 260 }}
  >
    <!-- filo de luz: 1px en el borde superior -->
    <span class="m-topline" aria-hidden="true"></span>

    <!-- cabecera: marca + cerrar -->
    <header class="m-head">
      <div class="m-brand">
        <span class="m-logo">
          <img src="/aletheia-logo.png" alt="" width="22" height="26" />
        </span>
        <div class="m-brand-txt">
          <span class="m-name">Aletheia</span>
          <span class="m-sub">Identidad verificable</span>
        </div>
      </div>

      <button class="close-btn" onclick={onClose} aria-label="Cerrar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </header>

    <!-- cuerpo -->
    <div class="m-body">
      <p class="m-eyebrow">
        <span class="m-dot" aria-hidden="true"></span>Acceso
      </p>

      <h2 class="m-title">Bienvenido a <span class="m-accent">Aletheia</span></h2>
      <p class="m-lead">
        Inicia sesión para acceder a tu panel de identidad verificable.
      </p>

      {#if error}
        <div class="error-box" role="alert" transition:fly={{ y: -6, duration: 180 }}>
          <svg class="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <span>{error}</span>
        </div>
      {/if}

      <button
        class="google-btn"
        class:loading
        onclick={handleLogin}
        disabled={loading}
      >
        {#if loading}
          <span class="spinner" aria-hidden="true"></span>
          <span>Conectando con Google…</span>
        {:else}
          <span class="g-chip" aria-hidden="true"><GoogleMark size={15} /></span>
          <span class="g-label">Continuar con Google</span>
          <svg class="g-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        {/if}
      </button>
    </div>

    <!-- pie: privacidad -->
    <footer class="m-foot">
      <svg class="lock-ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <p>
        Tu cuenta de Google solo identifica tu sesión. Nunca almacenamos tu
        contraseña; podrás conectar GitHub desde tu perfil.
      </p>
    </footer>
  </div>
</div>

<style>
  /* Todo el modal habla un solo idioma tipográfico: Geist Sans. */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(4, 2, 8, 0.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .modal {
    position: relative;
    width: 100%;
    max-width: 416px;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 22px;
    background: #0f0e13;
    font-family: var(--font-display);
    box-shadow:
      0 32px 80px -16px rgba(0, 0, 0, 0.7),
      0 2px 10px rgba(0, 0, 0, 0.35);
    overflow: hidden;
  }

  /* luz ambiental morada: apenas un velo en la parte alta */
  .modal::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(130% 90% at 50% -30%, rgba(139, 92, 246, 0.13), transparent 58%);
  }

  .m-topline {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(196, 181, 253, 0.4), transparent);
  }

  /* ---- cabecera ---- */
  .m-head {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 16px 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.055);
  }

  .m-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  /* la marca vive en una tesela, como un sello */
  .m-logo {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    flex: none;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 13px;
    background: rgba(255, 255, 255, 0.035);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .m-logo img {
    display: block;
  }

  .m-name {
    display: block;
    font-family: inherit;
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.1;
    color: var(--white);
  }

  .m-sub {
    display: block;
    margin-top: 3px;
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 450;
    color: var(--gray-500);
  }

  .close-btn {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    flex: none;
    border: 1px solid transparent;
    border-radius: 9px;
    background: transparent;
    color: var(--gray-500);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
  }

  .close-btn:hover {
    color: var(--white);
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .close-btn:active {
    transform: scale(0.92);
  }

  .close-btn:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.45);
    outline-offset: 2px;
  }

  /* ---- cuerpo ---- */
  .m-body {
    position: relative;
    padding: 24px 26px 26px;
  }

  .m-eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 14px;
    font-family: inherit;
    font-size: 0.68rem;
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--gray-400);
  }

  .m-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--amber-300);
    box-shadow: 0 0 7px rgba(252, 211, 77, 0.55);
    animation: m-pulse 2.8s ease-in-out infinite;
  }

  @keyframes m-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }

  .m-title {
    margin: 0 0 8px;
    font-family: inherit;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.026em;
    line-height: 1.14;
    color: var(--white);
  }

  .m-accent {
    color: var(--amber-200);
  }

  .m-lead {
    margin: 0 0 24px;
    max-width: 36ch;
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--gray-400);
  }

  /* ---- error ---- */
  .error-box {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 13px;
    margin-bottom: 14px;
    border: 1px solid rgba(253, 164, 175, 0.22);
    border-radius: 11px;
    background: rgba(253, 164, 175, 0.07);
    color: var(--err);
    font-size: 0.84rem;
    line-height: 1.45;
  }

  .error-icon {
    flex: none;
    margin-top: 1px;
  }

  /* ---- botón Google: superficie plana elevada, sin gradiente ---- */
  .google-btn {
    display: grid;
    grid-template-columns: 30px 1fr 20px;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: 54px;
    padding: 0 15px 0 13px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    background: #17161d;
    color: var(--white);
    font-family: inherit;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.005em;
    cursor: pointer;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.045),
      0 1px 2px rgba(0, 0, 0, 0.3);
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
  }

  .google-btn:hover:not(:disabled) {
    background: #1d1c24;
    border-color: rgba(255, 255, 255, 0.2);
  }

  .google-btn:active:not(:disabled) {
    transform: scale(0.99);
  }

  .google-btn:disabled {
    opacity: 0.65;
    cursor: wait;
  }

  .google-btn:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.45);
    outline-offset: 2px;
  }

  .g-chip {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 10px;
    background: var(--white);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    transition: transform 0.18s ease;
  }

  .google-btn:hover:not(:disabled) .g-chip {
    transform: scale(1.06);
  }

  .g-label {
    text-align: center;
  }

  .g-arrow {
    color: var(--gray-500);
    transition: transform 0.18s ease, color 0.18s ease;
  }

  .google-btn:hover:not(:disabled) .g-arrow {
    transform: translateX(2px);
    color: var(--gray-200);
  }

  /* estado de carga: contenido centrado */
  .google-btn.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--gray-200);
    cursor: wait;
  }

  .spinner {
    width: 15px;
    height: 15px;
    flex: none;
    border: 2px solid rgba(255, 255, 255, 0.18);
    border-top-color: var(--white);
    border-radius: 50%;
    animation: m-spin 0.8s linear infinite;
  }

  @keyframes m-spin {
    to { transform: rotate(360deg); }
  }

  /* ---- pie: privacidad ---- */
  .m-foot {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 14px 22px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.055);
    background: rgba(255, 255, 255, 0.015);
  }

  .lock-ic {
    flex: none;
    margin-top: 2px;
    color: var(--gray-600);
  }

  .m-foot p {
    margin: 0;
    font-size: 0.74rem;
    line-height: 1.55;
    color: var(--gray-500);
  }

  /* ---- responsive ---- */
  @media (max-width: 480px) {
    .modal {
      border-radius: 18px;
    }

    .m-body {
      padding: 20px 20px 22px;
    }

    .m-title {
      font-size: 1.32rem;
    }
  }
</style>
