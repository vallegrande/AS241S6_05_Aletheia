<script>
  /**
   * PanelAccount — acceso de cuenta para el header del panel.
   *
   * Sin sesión → botón "Entrar" con Google (abre el LoginModal).
   * Con sesión → avatar del usuario con menú: datos de la cuenta,
   * wallet conectada si la hay y cierre de sesión (que también
   * desconecta la wallet, manteniendo el orden Google → wallet).
   */
  import { auth, signOutGoogle } from '../stores/auth'
  import { wallet, disconnectWallet } from '../stores/wallet'
  import GoogleMark from './GoogleMark.svelte'
  import LoginModal from './LoginModal.svelte'
  import { fly } from 'svelte/transition'

  const user = $derived($auth.user)
  const authLoading = $derived($auth.loading)
  const initial = $derived((user?.displayName ?? user?.email ?? 'A').trim().charAt(0).toUpperCase())
  const connected = $derived(Boolean(user) && $wallet.connected)

  let menuOpen = $state(false)
  let showLogin = $state(false)
  let rootEl = $state(null)

  function toggleMenu() {
    menuOpen = !menuOpen
  }

  async function handleSignOut() {
    await disconnectWallet().catch(() => {})
    await signOutGoogle().catch(() => {})
    menuOpen = false
  }

  function onWindowKey(e) {
    if (e.key === 'Escape') menuOpen = false
  }

  // click fuera del root cierra el menú
  $effect(() => {
    if (!menuOpen) return
    const close = (e) => {
      if (rootEl && !rootEl.contains(e.target)) menuOpen = false
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  })
</script>

<svelte:window onkeydown={onWindowKey} />

<div class="acct" bind:this={rootEl}>
  {#if authLoading}
    <span class="acct-loading" aria-live="polite" title="Abriendo Google…">
      <span class="spin" aria-hidden="true"></span>
    </span>
  {:else if user}
    <button
      type="button"
      class="acct-btn"
      onclick={toggleMenu}
      aria-expanded={menuOpen}
      aria-haspopup="menu"
      aria-label="Cuenta"
      title={user.displayName ?? user.email}
    >
      {#if user.photoURL}
        <img class="acct-avatar" src={user.photoURL} alt="" referrerpolicy="no-referrer" />
      {:else}
        <span class="acct-avatar acct-fallback" aria-hidden="true">{initial}</span>
      {/if}
      {#if connected}
        <span class="acct-live" aria-hidden="true" title="Wallet conectada"></span>
      {/if}
    </button>

    {#if menuOpen}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div class="acct-menu" role="menu" transition:fly={{ y: -6, duration: 160 }}>
        <div class="acct-user">
          {#if user.photoURL}
            <img class="acct-avatar acct-avatar-lg" src={user.photoURL} alt="" referrerpolicy="no-referrer" />
          {:else}
            <span class="acct-avatar acct-avatar-lg acct-fallback" aria-hidden="true">{initial}</span>
          {/if}
          <div class="acct-user-data">
            <p class="acct-user-name">{user.displayName ?? 'Sin nombre'}</p>
            <p class="acct-user-mail">{user.email}</p>
          </div>
        </div>
        <button type="button" class="acct-signout" role="menuitem" onclick={handleSignOut}>
          Cerrar sesión
        </button>
      </div>
    {/if}
  {:else}
    <button type="button" class="acct-login" onclick={() => (showLogin = true)}>
      <GoogleMark size={15} />
      <span>Entrar</span>
    </button>
  {/if}
</div>

{#if showLogin}
  <LoginModal onClose={() => (showLogin = false)} />
{/if}

<style>
  .acct {
    position: relative;
    display: inline-flex;
    flex: none;
  }

  /* avatar: la foto del usuario de Google (o su inicial) */
  .acct-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid rgba(196, 181, 253, 0.25);
    border-radius: 999px;
    background: none;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.15s ease;
  }

  .acct-btn:hover {
    border-color: rgba(167, 139, 250, 0.55);
    box-shadow: 0 0 18px rgba(124, 58, 237, 0.3);
  }

  .acct-btn:active {
    transform: scale(0.94);
  }

  .acct-btn:focus-visible {
    outline: 2px solid var(--purple-400, #a78bfa);
    outline-offset: 2px;
  }

  .acct-avatar {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    object-fit: cover;
    display: block;
  }

  .acct-avatar-lg {
    width: 40px;
    height: 40px;
  }

  .acct-fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(124, 58, 237, 0.22);
    color: var(--gray-050, #ecebf1);
    font-weight: 600;
    font-size: 0.85rem;
  }

  /* punto vivo: wallet conectada, esquina del avatar */
  .acct-live {
    position: absolute;
    right: -1px;
    bottom: -1px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--ok, #6ee7b7);
    border: 2px solid rgba(8, 5, 20, 0.9);
    box-shadow: 0 0 8px rgba(110, 231, 183, 0.55);
  }

  /* botón "Entrar" (sin sesión) */
  .acct-login {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 14px;
    border: 1px solid rgba(196, 181, 253, 0.2);
    border-radius: 999px;
    background: rgba(10, 7, 16, 0.6);
    color: var(--gray-050, #ecebf1);
    font-family: var(--font-body, 'Geist Sans', system-ui, sans-serif);
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      background 0.2s ease;
  }

  .acct-login:hover {
    border-color: rgba(167, 139, 250, 0.5);
    background: rgba(124, 58, 237, 0.12);
    box-shadow: 0 0 18px rgba(124, 58, 237, 0.22);
  }

  .acct-login:active {
    transform: scale(0.97);
  }

  .acct-login:focus-visible {
    outline: 2px solid var(--purple-400, #a78bfa);
    outline-offset: 2px;
  }

  .acct-loading {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
  }

  .spin {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid rgba(156, 150, 176, 0.3);
    border-top-color: var(--purple-300, #c4b5fd);
    animation: acct-spin 0.9s linear infinite;
  }

  @keyframes acct-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* menú de cuenta */
  .acct-menu {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 232px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    border: 1px solid rgba(196, 181, 253, 0.16);
    border-radius: 12px;
    background: rgba(10, 7, 16, 0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 12px 40px rgba(3, 0, 12, 0.45);
  }

  .acct-user {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .acct-user-data {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .acct-user-name {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--white, #fff);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .acct-user-mail {
    margin: 0;
    font-size: 0.72rem;
    color: var(--gray-400, #9c96b0);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .acct-signout {
    width: 100%;
    min-height: 34px;
    border: 1px solid rgba(196, 181, 253, 0.18);
    border-radius: 8px;
    background: none;
    color: var(--gray-200, #c9c5d6);
    font-family: var(--font-body, 'Geist Sans', system-ui, sans-serif);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      color 0.2s ease,
      background 0.2s ease;
  }

  .acct-signout:hover {
    border-color: rgba(253, 164, 175, 0.45);
    color: var(--err, #fda4af);
    background: rgba(253, 164, 175, 0.06);
  }

  .acct-signout:focus-visible {
    outline: 2px solid var(--purple-400, #a78bfa);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .spin {
      animation-duration: 0.01ms;
    }
  }
</style>
