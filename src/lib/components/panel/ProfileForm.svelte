<script>
  /**
   * ProfileForm — perfil profesional real (Postgres vía API).
   * La foto de Google es solo lectura; para cambiarla se sube un archivo
   * al backend (POST /api/profile/photo) y la ruta queda en la BD.
   */
  import { onMount, onDestroy } from 'svelte'
  import {
    getProfile,
    saveProfile,
    uploadProfilePhoto,
    fetchProfilePhotoUrl,
    getGithubState,
    listGithubRepos,
    connectGithub as connectGithubApi,
    disconnectGithub as disconnectGithubApi,
    getLinkedinState,
    disconnectLinkedin as disconnectLinkedinApi,
  } from '../../api/client'
  import { auth, linkGithubAccount, unlinkGithubAccount } from '../../stores/auth'
  import { connectLinkedIn } from '../../linkedin'
  import { pushToast } from '../../stores/toast'
  import StatusMessage from '../dapp/StatusMessage.svelte'

  const CUSTOM_FOTO = '/api/profile/photo'

  const user = $derived($auth.user)
  const initial = $derived((user?.displayName ?? user?.email ?? 'A').trim().charAt(0).toUpperCase())

  function nameFromEmail(email) {
    if (!email) return ''
    return email
      .split('@')[0]
      .split(/[._-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  const googleName = $derived(user?.displayName || nameFromEmail(user?.email))

  let loading = $state(true)
  let saving = $state(false)
  let uploading = $state(false)
  let saved = $state(false)
  let error = $state('')
  let hasCustomFoto = $state(false)
  let avatarUrl = $state('')
  let fileInput = $state(null)

  let nombre = $state('')
  let titulo = $state('')
  let bio = $state('')
  let linkGithub = $state('')
  let linkLinkedin = $state('')
  let linkPortafolio = $state('')

  /* ---- GitHub: vincular después del login y traer repos ---- */
  let ghConnected = $state(false)
  let ghUser = $state('')
  let ghConnecting = $state(false)
  let ghRepos = $state([])
  let ghReposLoading = $state(false)
  let ghReposOpen = $state(false)
  let ghError = $state('')
  let ghDisconnecting = $state(false)

  async function connectGithub() {
    ghConnecting = true
    ghError = ''
    try {
      const { username, accessToken } = await linkGithubAccount()
      if (username) {
        ghUser = username
        linkGithub = `github.com/${username}`
        await connectGithubApi(username, accessToken)
        ghConnected = true
        pushToast('success', 'GitHub conectado', `@${username} — ya puedes ver tus repositorios.`)
        loadRepos()
      } else {
        pushToast('info', 'GitHub conectado', 'Escribe tu usuario si no aparece automáticamente.')
      }
    } catch (e) {
      ghError = e.message || 'No se pudo conectar GitHub'
    } finally {
      ghConnecting = false
    }
  }

  async function disconnectGithub() {
    ghDisconnecting = true
    ghError = ''
    try {
      await disconnectGithubApi().catch(() => {})
      await unlinkGithubAccount().catch(() => {})
      ghConnected = false
      ghUser = ''
      ghRepos = []
      ghReposOpen = false
      pushToast('info', 'GitHub desconectado', 'Puedes volver a conectarlo cuando quieras.')
    } catch (e) {
      ghError = e.message || 'No se pudo desconectar GitHub'
    } finally {
      ghDisconnecting = false
    }
  }

  /* ---- LinkedIn: conexión de identidad (popup propio, sin login) ---- */
  let liConnected = $state(false)
  let liName = $state('')
  let liConnecting = $state(false)
  let liDisconnecting = $state(false)

  async function connectLinkedin() {
    liConnecting = true
    ghError = ''
    try {
      const st = await connectLinkedIn()
      liConnected = st.connected
      liName = st.name
      pushToast('success', 'LinkedIn conectado', liName ? `Verificado: ${liName}.` : 'Identidad verificada.')
    } catch (e) {
      ghError = e.message || 'No se pudo conectar LinkedIn'
    } finally {
      liConnecting = false
    }
  }

  async function disconnectLinkedin() {
    liDisconnecting = true
    ghError = ''
    try {
      await disconnectLinkedinApi().catch(() => {})
      liConnected = false
      liName = ''
      pushToast('info', 'LinkedIn desconectado', 'Puedes volver a conectarlo cuando quieras.')
    } catch (e) {
      ghError = e.message || 'No se pudo desconectar LinkedIn'
    } finally {
      liDisconnecting = false
    }
  }

  async function loadRepos() {
    ghReposLoading = true
    ghError = ''
    try {
      ghRepos = await listGithubRepos()
    } catch (e) {
      ghError = e.message || 'No se pudieron cargar los repositorios'
      ghRepos = []
    } finally {
      ghReposLoading = false
    }
  }

  function toggleRepos() {
    ghReposOpen = !ghReposOpen
    if (ghReposOpen && ghRepos.length === 0) loadRepos()
  }

  const avatarSrc = $derived(avatarUrl || (hasCustomFoto ? '' : user?.photoURL || ''))

  function revokeAvatar() {
    if (avatarUrl) URL.revokeObjectURL(avatarUrl)
    avatarUrl = ''
  }

  async function loadAvatar() {
    revokeAvatar()
    if (hasCustomFoto) avatarUrl = (await fetchProfilePhotoUrl()) || ''
  }

  onMount(async () => {
    try {
      const p = await getProfile()
      hasCustomFoto = p.foto === CUSTOM_FOTO
      nombre = p.nombre || googleName || ''
      titulo = p.titulo || ''
      bio = p.bio || ''
      linkGithub = p.links?.github || ''
      linkLinkedin = p.links?.linkedin || ''
      linkPortafolio = p.links?.portafolio || ''
      await loadAvatar()

      // ¿GitHub ya conectado en una sesión previa?
      getGithubState()
        .then((g) => {
          ghConnected = g.connected
          ghUser = g.username
          if (g.connected && g.username) linkGithub = `github.com/${g.username}`
        })
        .catch(() => {})

      // ¿LinkedIn ya conectado en una sesión previa?
      getLinkedinState()
        .then((l) => {
          liConnected = l.connected
          liName = l.name
        })
        .catch(() => {})

      if (!p.nombre && nombre) {
        saveProfile({ nombre, titulo: '', bio: '', links: {} }).catch(() => {})
      }
    } catch (e) {
      error = e.message || 'No se pudo cargar el perfil'
    } finally {
      loading = false
    }
  })

  onDestroy(revokeAvatar)

  function pickPhoto() {
    fileInput?.click()
  }

  async function onPhotoSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      error = 'Elige una imagen (JPG, PNG o WebP).'
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      error = 'La imagen pesa demasiado. El máximo es 5 MB.'
      return
    }
    uploading = true
    error = ''
    try {
      revokeAvatar()
      avatarUrl = URL.createObjectURL(file)
      await uploadProfilePhoto(file)
      hasCustomFoto = true
      pushToast('success', 'Foto actualizada', 'Ya aparece en tu perfil.')
    } catch (err) {
      avatarUrl = ''
      error = err.message || 'No se pudo subir la foto. Inténtalo de nuevo.'
      await loadAvatar()
    } finally {
      uploading = false
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    saving = true
    saved = false
    error = ''
    try {
      const links = {}
      if (linkGithub.trim()) links.github = linkGithub.trim()
      if (linkLinkedin.trim()) links.linkedin = linkLinkedin.trim()
      if (linkPortafolio.trim()) links.portafolio = linkPortafolio.trim()
      await saveProfile({
        nombre: nombre.trim(),
        titulo: titulo.trim(),
        bio: bio.trim(),
        links,
      })
      saved = true
      pushToast('success', 'Perfil guardado', 'Ya se ve en tu identidad.')
      setTimeout(() => (saved = false), 2400)
    } catch (err) {
      error = err.message || 'No se pudo guardar. Revisa los campos e inténtalo otra vez.'
    } finally {
      saving = false
    }
  }
</script>

{#if loading}
  <div class="pf-skel" aria-hidden="true">
    <div class="pf-skel-row"><span class="sk sk-av"></span><span class="sk sk-lines"></span></div>
    <span class="sk sk-block"></span>
    <span class="sk sk-block short"></span>
  </div>
{:else}
  <form class="pf" onsubmit={onSubmit}>
    <!-- avatar -->
    <div class="pf-top">
      <div class="pf-avatar-wrap">
        {#if avatarSrc}
          <img class="pf-avatar" src={avatarSrc} alt="" referrerpolicy="no-referrer" />
        {:else}
          <span class="pf-avatar pf-fallback" aria-hidden="true">{initial}</span>
        {/if}
      </div>
      <div class="pf-top-text">
        <p class="pf-top-name">{nombre || 'Completa tu perfil'}</p>
        <p class="pf-top-mail">{user?.email ?? ''}</p>
        <button type="button" class="pf-photo-btn" onclick={pickPhoto} disabled={uploading}>
          {#if uploading}
            <span class="mini-spinner" aria-hidden="true"></span> Subiendo…
          {:else}
            Cambiar foto
          {/if}
        </button>
      </div>
      <input bind:this={fileInput} type="file" accept="image/*" hidden onchange={onPhotoSelected} />
    </div>

    <!-- datos -->
    <fieldset class="pf-card">
      <legend class="pf-legend">Tus datos</legend>
      <div class="pf-row">
        <label class="pf-field">
          <span>Nombre completo</span>
          <input name="nombre" bind:value={nombre} required placeholder="Tu nombre" autocomplete="name" />
        </label>
        <label class="pf-field">
          <span>¿A qué te dedicas?</span>
          <input name="titulo" bind:value={titulo} placeholder="Ej. Desarrollo de software" />
        </label>
      </div>
      <label class="pf-field">
        <span>Sobre ti</span>
        <textarea name="bio" bind:value={bio} rows="3" placeholder="En qué te destacas y qué te gustaría demostrar."></textarea>
      </label>
    </fieldset>

    <!-- enlaces -->
    <fieldset class="pf-card">
      <legend class="pf-legend">Enlaces <em>(opcionales)</em></legend>
      <div class="pf-row">
        <div class="pf-field">
          <span>GitHub</span>
          {#if ghConnected}
            <div class="pf-gh-row">
              <span class="pf-gh-value">github.com/{ghUser}</span>
              <button
                type="button"
                class="pf-connect pf-disconnect"
                onclick={disconnectGithub}
                disabled={ghDisconnecting}
                aria-label="Desconectar GitHub"
                title="Desconectar GitHub"
              >
                {ghDisconnecting ? '…' : '✕'}
              </button>
            </div>
          {:else if linkGithub}
            <div class="pf-gh-row">
              <span class="pf-gh-value">{linkGithub}</span>
              <button type="button" class="pf-connect" onclick={connectGithub} disabled={ghConnecting}>
                {ghConnecting ? 'Conectando…' : 'Conectar'}
              </button>
            </div>
          {:else}
            <div class="pf-gh-row">
              <button type="button" class="pf-connect" onclick={connectGithub} disabled={ghConnecting}>
                {ghConnecting ? 'Conectando…' : 'Conectar con GitHub'}
              </button>
            </div>
          {/if}
        </div>
        <div class="pf-field">
          <span>LinkedIn</span>
          {#if liConnected}
            <div class="pf-gh-row">
              <span class="pf-li-ok" title={liName}>✓ {liName || 'Conectado'}</span>
              <button
                type="button"
                class="pf-connect pf-disconnect"
                onclick={disconnectLinkedin}
                disabled={liDisconnecting}
                aria-label="Desconectar LinkedIn"
                title="Desconectar LinkedIn"
              >
                {liDisconnecting ? '…' : '✕'}
              </button>
            </div>
          {:else}
            <div class="pf-gh-row">
              <input bind:value={linkLinkedin} placeholder="linkedin.com/in/…" inputmode="url" />
              <button type="button" class="pf-connect" onclick={connectLinkedin} disabled={liConnecting}>
                {liConnecting ? 'Conectando…' : 'Conectar'}
              </button>
            </div>
          {/if}
        </div>
      </div>
      <label class="pf-field">
        <span>Portafolio</span>
        <input bind:value={linkPortafolio} placeholder="tusitio.com" inputmode="url" />
      </label>

      {#if ghConnected}
        <div class="pf-repo-bar">
          <button type="button" class="pf-repo-toggle" onclick={toggleRepos} aria-expanded={ghReposOpen}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
            </svg>
            Mis repositorios {ghReposOpen ? '▲' : '▼'}
          </button>
          <span class="pf-gh-as">@{ghUser}</span>
        </div>

        {#if ghReposOpen}
          {#if ghReposLoading}
            <p class="pf-repo-hint">Cargando repositorios…</p>
          {:else if ghRepos.length === 0}
            <p class="pf-repo-hint">No se encontraron repositorios públicos.</p>
          {:else}
            <ul class="pf-repos">
              {#each ghRepos as r (r.full_name)}
                <li class="pf-repo">
                  <a href={r.html_url} target="_blank" rel="noopener noreferrer" class="pf-repo-name">
                    {#if r.private}🔒 {/if}{r.name}
                  </a>
                  <span class="pf-repo-meta">
                    {#if r.language}{r.language} · {/if}⭐ {r.stargazers_count}
                  </span>
                  {#if r.description}
                    <p class="pf-repo-desc">{r.description}</p>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        {/if}
      {/if}
    </fieldset>

    {#if error}
      <StatusMessage tone="error" message={error} />
    {/if}

    {#if ghError}
      <StatusMessage tone="error" message={ghError} />
    {/if}

    <div class="pf-actions">
      <button type="submit" class="btn" disabled={saving}>
        {#if saving}
          <span class="mini-spinner" aria-hidden="true"></span> Guardando…
        {:else if saved}
          Guardado <span aria-hidden="true">✓</span>
        {:else}
          Guardar cambios
        {/if}
      </button>
    </div>
  </form>
{/if}

<style>
  .pf {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  /* ---- avatar ---- */
  .pf-top {
    display: flex;
    align-items: center;
    gap: 16px;
    padding-bottom: 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }

  .pf-avatar {
    display: block;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: #1c1c21;
  }

  .pf-fallback {
    display: grid;
    place-items: center;
    font-size: 1.5rem;
    font-weight: 650;
    color: #e8e8ec;
    background: #232328;
  }

  .pf-top-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .pf-top-name {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 650;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .pf-top-mail {
    margin: 0 0 8px;
    font-size: 0.78rem;
    color: #8a8a96;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .pf-photo-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.04);
    color: #d8d8de;
    font-family: inherit;
    font-size: 0.74rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .pf-photo-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.26);
    color: #fff;
  }

  .pf-photo-btn:disabled {
    opacity: 0.55;
    cursor: wait;
  }

  .pf-photo-btn:focus-visible {
    outline: 2px solid #e8e8ec;
    outline-offset: 2px;
  }

  /* ---- tarjetas de sección ---- */
  .pf-card {
    margin: 0;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .pf-legend {
    padding: 0 4px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #9b9ba6;
  }

  .pf-legend em {
    font-style: normal;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
    color: #6e6e7a;
  }

  .pf-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .pf-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .pf-field > span {
    font-size: 0.78rem;
    font-weight: 550;
    color: #b8b8c2;
  }

  /* ---- conectar GitHub + repos ---- */
  .pf-gh-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .pf-gh-row input {
    flex: 1;
    min-width: 0;
  }

  .pf-gh-value {
    flex: 1;
    min-width: 0;
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.03);
    color: #b8b8c2;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pf-gh-row > .pf-connect:only-child {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .pf-connect {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 42px;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.05);
    color: #e8e8ec;
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .pf-connect:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.32);
  }

  .pf-connect:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .pf-disconnect {
    min-width: 42px;
    padding: 0;
    color: #8a8a96;
  }

  .pf-disconnect:hover:not(:disabled) {
    color: #e8e8ec;
  }

  .pf-li-ok {
    flex: 1;
    min-width: 0;
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid rgba(110, 231, 183, 0.35);
    background: rgba(110, 231, 183, 0.08);
    color: #6ee7b7;
    font-size: 0.78rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pf-repo-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .pf-repo-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: #d8d8de;
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
  }

  .pf-repo-toggle:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.24);
    color: #fff;
  }

  .pf-gh-as {
    font-family: var(--font-mono, monospace);
    font-size: 0.74rem;
    color: #6ee7b7;
  }

  .pf-repo-hint {
    margin: 0;
    font-size: 0.8rem;
    color: #8a8a96;
  }

  .pf-repos {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 260px;
    overflow-y: auto;
  }

  .pf-repo {
    padding: 10px 12px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
  }

  .pf-repo-name {
    font-family: var(--font-mono, monospace);
    font-size: 0.82rem;
    font-weight: 650;
    color: #e8e8ec;
    text-decoration: none;
  }

  .pf-repo-name:hover {
    color: #a78bfa;
    text-decoration: underline;
  }

  .pf-repo-meta {
    float: right;
    font-size: 0.72rem;
    color: #6e6e7a;
  }

  .pf-repo-desc {
    margin: 4px 0 0;
    font-size: 0.78rem;
    color: #9b9ba6;
    line-height: 1.4;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* inputs del modal: sans, neutros, modernos */
  .pf :global(input),
  .pf :global(textarea) {
    width: 100%;
    min-height: 42px;
    padding: 0 12px;
    background: #101014;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: #fff;
    font-family: var(--font-body, 'Geist Sans', system-ui, sans-serif);
    font-size: 0.88rem;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .pf :global(textarea) {
    padding: 10px 12px;
    min-height: 84px;
    resize: vertical;
    line-height: 1.5;
  }

  .pf :global(input::placeholder),
  .pf :global(textarea::placeholder) {
    color: #5c5c68;
    font-family: inherit;
  }

  .pf :global(input:hover),
  .pf :global(textarea:hover) {
    border-color: rgba(255, 255, 255, 0.18);
  }

  .pf :global(input:focus),
  .pf :global(textarea:focus) {
    outline: none;
    border-color: rgba(255, 255, 255, 0.35);
    background: #141419;
  }

  /* ---- guardar ---- */
  .pf-actions {
    display: flex;
    justify-content: flex-end;
  }

  .pf-actions :global(.btn) {
    min-width: 160px;
  }

  /* skeleton */
  .pf-skel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .pf-skel-row {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .sk {
    display: block;
    border-radius: 10px;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 75%);
    background-size: 200% 100%;
    animation: sk-shimmer 1.3s ease-in-out infinite;
  }

  .sk-av {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    flex: none;
  }

  .sk-lines {
    flex: 1;
    height: 44px;
  }

  .sk-block {
    height: 120px;
  }

  .sk-block.short {
    height: 72px;
  }

  @keyframes sk-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .sk { animation: none; }
  }

  @media (max-width: 640px) {
    .pf-row {
      grid-template-columns: 1fr;
    }
  }
</style>
