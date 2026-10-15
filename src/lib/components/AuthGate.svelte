<script>
  /**
   * AuthGate — puerta entre la landing pública y la zona Web3.
   *
   * Sin sesión de Google: solo Hero (landing pura) — nada de wallet.
   * Con sesión de Google: se revela la zona de Pali Wallet + transacciones.
   *
   * El orden es SIEMPRE: Google → Wallet. Nunca wallet sin Google.
   */
  import { auth, signInWithGoogle } from '../stores/auth'
  import GoogleMark from './GoogleMark.svelte'
  import { fade, fly } from 'svelte/transition'

  /** Snippet con el contenido protegido (zona Web3) que pasa el padre. */
  let { children } = $props()

  const user = $derived($auth.user)
  const ready = $derived($auth.ready)
</script>

<section id="auth" class="auth-gate">
{#if ready && user}
  <!-- ============ SESIÓN INICIADA: zona Web3 ============ -->
  <div in:fly={{ y: 18, duration: 500 }}>
    {@render children?.()}
  </div>
{:else}
  <!-- ============ VISITANTE: panel de login ============ -->
  <div class="gate-locked" in:fade={{ duration: 300 }}>
    <div class="lock-card">
      <span class="lock-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>

      <h3>Acceso para miembros</h3>
      <p class="muted">
        Inicia sesión con Google para desbloquear la conexión de Pali Wallet,
        el balance on-chain y las transacciones de prueba.
      </p>

      <button
        class="google-btn"
        onclick={signInWithGoogle}
        disabled={$auth.loading}
        aria-label="Iniciar sesión con Google"
        title="Iniciar sesión con Google"
      >
        <GoogleMark size={26} />
      </button>
      {#if $auth.loading}
        <p class="gate-loading small muted" aria-live="polite">Abriendo Google…</p>
      {/if}

      <p class="gate-foot small muted">
        Tu cuenta de Google solo se usa para identificar tu sesión.
      </p>
    </div>
  </div>
{/if}
</section>

<style>
  /* La puerta es solo lógica: cero espaciado propio. El ritmo lo pone
     el contenedor (modal del panel o sección) — no ella misma. */

  /* ---- tarjeta de login ---- */
  .gate-locked {
    display: grid;
    place-items: center;
    padding-block: var(--s-5);
  }

  .lock-card {
    width: min(440px, 100%);
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    padding: var(--s-5);
    border: var(--border-strong);
    border-radius: var(--radius);
    background: rgba(10, 7, 16, 0.72);
    backdrop-filter: blur(16px);
    box-shadow: var(--glow-md);
    text-align: center;
    align-items: center;
  }

  .lock-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid rgba(167, 139, 250, 0.35);
    background: rgba(124, 58, 237, 0.12);
    color: var(--purple-300);
  }

  .lock-card h3 {
    font-size: 1.3rem;
  }

  .lock-card p {
    max-width: 38ch;
  }

  /* ---- botón Google: SOLO el ícono, color de la app ---- */
  .google-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    min-height: 56px;
    padding: 0;
    border: 1px solid rgba(167, 139, 250, 0.4);
    border-radius: 999px;
    background: linear-gradient(180deg, rgba(52, 40, 96, 0.8), rgba(38, 28, 74, 0.85));
    color: var(--purple-300);
    cursor: pointer;
    transition: border-color 0.2s ease, transform 0.15s ease, opacity 0.2s ease;
  }

  .google-btn:hover:not(:disabled) {
    border-color: rgba(196, 181, 253, 0.7);
    transform: translateY(-1px);
  }

  .gate-loading {
    margin: 0;
    min-height: 1.2em;
  }

  .google-btn:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .google-btn:focus-visible {
    outline: 2px solid var(--purple-400);
    outline-offset: 2px;
  }

  .gate-foot {
    border-top: 1px solid rgba(167, 139, 250, 0.12);
    padding-top: var(--s-3);
    width: 100%;
  }
</style>
