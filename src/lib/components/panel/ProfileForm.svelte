<script>
  /**
   * ProfileForm — perfil profesional real (Postgres vía API).
   * La foto de Google es solo lectura; para cambiarla se sube un archivo
   * al backend (POST /api/profile/photo) y la ruta queda en la BD.
   */
  import { onMount, onDestroy } from 'svelte'
  import { getProfile, saveProfile, uploadProfilePhoto, fetchProfilePhotoUrl } from '../../api/client'
  import { auth } from '../../stores/auth'
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
          <input name="titulo" bind:value={titulo} placeholder="Ej. Desarrolladora de software" />
        </label>
      </div>
      <label class="pf-field">
        <span>Sobre ti</span>
        <textarea name="bio" bind:value={bio} rows="3" placeholder="Cuéntale al mundo en qué eres buena y qué puedes demostrar."></textarea>
      </label>
    </fieldset>

    <!-- enlaces -->
    <fieldset class="pf-card">
      <legend class="pf-legend">Enlaces <em>(opcionales)</em></legend>
      <div class="pf-row pf-row-3">
        <label class="pf-field">
          <span>GitHub</span>
          <input bind:value={linkGithub} placeholder="github.com/usuario" inputmode="url" />
        </label>
        <label class="pf-field">
          <span>LinkedIn</span>
          <input bind:value={linkLinkedin} placeholder="linkedin.com/in/usuario" inputmode="url" />
        </label>
        <label class="pf-field">
          <span>Portafolio</span>
          <input bind:value={linkPortafolio} placeholder="tusitio.com" inputmode="url" />
        </label>
      </div>
    </fieldset>

    {#if error}
      <StatusMessage tone="error" message={error} />
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

  .pf-row-3 {
    grid-template-columns: 1fr 1fr 1fr;
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
    .pf-row,
    .pf-row-3 {
      grid-template-columns: 1fr;
    }
  }
</style>
