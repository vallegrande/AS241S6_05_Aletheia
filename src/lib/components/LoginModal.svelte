<script>
  /**
   * LoginModal — Modal elegante para iniciar sesión con Google.
   *
   * Aparece cuando el usuario hace click en el botón de login del header.
   * Cierra con Escape, click fuera, o el botón X.
   * Muestra loading state y errores inmediatos.
   */
  import { auth, signInWithGoogle, AUTH_ERRORS } from '../stores/auth'
  import GoogleMark from './GoogleMark.svelte'
  import { fade, fly } from 'svelte/transition'

  let { onClose } = $props()

  let loading = $state(false)
  let error = $state('')
  let errorCode = $state('')

  async function handleLogin() {
    loading = true
    error = ''
    errorCode = ''

    try {
      await signInWithGoogle()
      // Login exitoso — cerrar modal
      onClose?.()
    } catch (err) {
      error = err.message || 'No se pudo iniciar sesión'
      errorCode = err.code || ''
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
  transition:fade={{ duration: 200 }}
>
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-label="Iniciar sesión"
    transition:fly={{ y: 24, duration: 300 }}
  >
    <!-- Botón cerrar -->
    <button class="close-btn" onclick={onClose} aria-label="Cerrar">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>

    <!-- Logo -->
    <div class="modal-logo">
      <img src="/aletheia-logo.png" alt="Aletheia" width="48" height="56" />
    </div>

    <!-- Título -->
    <h2 class="modal-title">Bienvenido a Aletheía</h2>
    <p class="modal-subtitle">
      Inicia sesión para acceder a tu panel de identidad verificable.
    </p>

    <!-- Error -->
    {#if error}
      <div class="error-box" role="alert" transition:fly={{ y: -8, duration: 200 }}>
        <svg class="error-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        <span>{error}</span>
      </div>
    {/if}

    <!-- Botón Google -->
    <button
      class="google-btn"
      onclick={handleLogin}
      disabled={loading}
    >
      {#if loading}
        <span class="spinner"></span>
        <span>Conectando con Google…</span>
      {:else}
        <GoogleMark size={22} />
        <span>Continuar con Google</span>
      {/if}
    </button>

    <!-- Nota de privacidad -->
    <p class="privacy-note">
      Tu cuenta de Google solo se usa para identificar tu sesión.
      Nunca almacenamos tu contraseña.
    </p>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(5, 3, 14, 0.7);
    backdrop-filter: blur(8px);
    padding: 16px;
  }

  .modal {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: linear-gradient(180deg, rgba(28, 18, 62, 0.98), rgba(14, 8, 32, 0.98));
    border: 1px solid rgba(167, 139, 250, 0.2);
    border-radius: 24px;
    padding: 40px 32px 32px;
    box-shadow:
      0 24px 80px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(167, 139, 250, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: var(--gray-400);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .close-btn:hover {
    background: rgba(167, 139, 250, 0.1);
    color: var(--white);
  }

  .modal-logo {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
  }

  .modal-logo img {
    height: 56px;
    width: auto;
    filter: drop-shadow(0 4px 12px rgba(139, 92, 246, 0.3));
  }

  .modal-title {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    text-align: center;
    color: var(--white);
  }

  .modal-subtitle {
    margin: 0 0 24px;
    text-align: center;
    color: var(--gray-300);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .error-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    margin-bottom: 20px;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    color: #fca5a5;
    font-size: 0.88rem;
    line-height: 1.4;
  }

  .error-icon {
    flex-shrink: 0;
    color: #f87171;
  }

  .google-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    height: 52px;
    padding: 0 24px;
    border: 1px solid rgba(167, 139, 250, 0.35);
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(124, 58, 237, 0.2), rgba(88, 28, 185, 0.15));
    color: var(--white);
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .google-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, rgba(124, 58, 237, 0.35), rgba(88, 28, 185, 0.25));
    border-color: rgba(167, 139, 250, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3);
  }

  .google-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: var(--white);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .privacy-note {
    margin: 20px 0 0;
    text-align: center;
    font-size: 0.78rem;
    color: var(--gray-500);
    line-height: 1.5;
  }

  /* Responsive */
  @media (max-width: 480px) {
    .modal {
      padding: 32px 24px 24px;
      border-radius: 20px;
    }

    .modal-title {
      font-size: 1.3rem;
    }
  }
</style>
