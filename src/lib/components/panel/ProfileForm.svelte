<script>
  /**
   * ProfileForm — perfil profesional real (Postgres vía API).
   * En la primera visita se prellena con los datos de Google
   * (nombre, foto, email como referencia).
   */
  import { onMount } from 'svelte'
  import { getProfile, saveProfile } from '../../api/client'
  import { auth } from '../../stores/auth'
  import { pushToast } from '../../stores/toast'
  import FormField from '../dapp/FormField.svelte'
  import StatusMessage from '../dapp/StatusMessage.svelte'

  const user = $derived($auth.user)
  const initial = $derived((user?.displayName ?? user?.email ?? 'A').trim().charAt(0).toUpperCase())

  /** Nombre legible a partir del email si Google no envía displayName. */
  function nameFromEmail(email) {
    if (!email) return ''
    const local = email.split('@')[0]
    return local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  const googleName = $derived(user?.displayName || nameFromEmail(user?.email))

  let loading = $state(true)
  let saving = $state(false)
  let saved = $state(false)
  let error = $state('')

  let nombre = $state('')
  let titulo = $state('')
  let bio = $state('')
  let foto = $state('')
  let linkGithub = $state('')
  let linkLinkedin = $state('')
  let linkPortafolio = $state('')

  onMount(async () => {
    try {
      const p = await getProfile()
      const prefilledNombre = p.nombre || googleName || ''
      const prefilledFoto = p.foto || user?.photoURL || ''
      nombre = prefilledNombre
      titulo = p.titulo || ''
      bio = p.bio || ''
      foto = prefilledFoto
      linkGithub = p.links?.github || ''
      linkLinkedin = p.links?.linkedin || ''
      linkPortafolio = p.links?.portafolio || ''

      // Primera visita sin datos guardados: persiste el prellenado de
      // Google en segundo plano para que el perfil nunca quede vacío.
      if (!p.nombre && prefilledNombre) {
        saveProfile({
          nombre: prefilledNombre,
          titulo: '',
          bio: '',
          foto: prefilledFoto,
          links: {},
        }).catch(() => {})
      }
    } catch (e) {
      error = e.message || 'No se pudo cargar el perfil'
    } finally {
      loading = false
    }
  })

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
        foto: foto || user?.photoURL || '',
        links,
      })
      saved = true
      pushToast('success', 'Perfil guardado', 'Tu identidad profesional se actualizó.')
      setTimeout(() => (saved = false), 2400)
    } catch (err) {
      error = err.message || 'No se pudo guardar el perfil'
    } finally {
      saving = false
    }
  }
</script>

<section class="dapp-section" aria-label="Perfil profesional">
  {#if loading}
    <div class="pf-skel">
      <div class="pf-skel-row"><span class="sk sk-av"></span><span class="sk sk-lines"></span></div>
      <span class="sk sk-block"></span>
      <span class="sk sk-block"></span>
      <span class="sk sk-block short"></span>
    </div>
  {:else}
    <div class="pf-hero">
      <div class="pf-avatar-wrap">
        {#if foto || user?.photoURL}
          <img class="pf-avatar" src={foto || user?.photoURL} alt="" referrerpolicy="no-referrer" />
        {:else}
          <span class="pf-avatar pf-fallback" aria-hidden="true">{initial}</span>
        {/if}
        <span class="pf-avatar-dot" class:ready={Boolean(nombre)} aria-hidden="true"></span>
      </div>
      <div class="pf-hero-text">
        <p class="pf-eyebrow">Tu identidad en Aletheia</p>
        <h2 class="pf-name">{nombre || 'Completa tu perfil'}</h2>
        {#if user?.email}
          <p class="pf-email">
            <span class="pf-email-tag">Google</span>
            {user.email}
          </p>
        {/if}
      </div>
    </div>

    <form class="id-form" onsubmit={onSubmit}>
      <div class="id-grid">
        <FormField label="Nombre completo" for="pf-nombre" help="Importado de tu cuenta de Google; edítalo cuando quieras.">
          <input id="pf-nombre" name="nombre" bind:value={nombre} required placeholder={googleName || 'Tu nombre'} autocomplete="name" />
        </FormField>
        <FormField label="Título profesional" for="pf-titulo">
          <input id="pf-titulo" name="titulo" bind:value={titulo} placeholder="Ej. Desarrollador full-stack" />
        </FormField>
      </div>

      <FormField label="Foto de perfil (URL)" for="pf-foto" help="Se importó desde Google. Puedes cambiarla por cualquier imagen pública.">
        <input id="pf-foto" bind:value={foto} placeholder="https://…" inputmode="url" />
      </FormField>

      <FormField label="Bio" for="pf-bio" help="Breve descripción de lo que haces y qué evidencias puedes demostrar.">
        <textarea id="pf-bio" name="bio" bind:value={bio} rows="4" placeholder="Cuéntale al mundo tu historia profesional…"></textarea>
      </FormField>

      <p class="id-sub">Enlaces</p>
      <div class="id-grid">
        <FormField label="GitHub" for="pf-gh">
          <input id="pf-gh" bind:value={linkGithub} placeholder="https://github.com/usuario" inputmode="url" />
        </FormField>
        <FormField label="LinkedIn" for="pf-li">
          <input id="pf-li" bind:value={linkLinkedin} placeholder="https://linkedin.com/in/usuario" inputmode="url" />
        </FormField>
        <FormField label="Portafolio" for="pf-pf">
          <input id="pf-pf" bind:value={linkPortafolio} placeholder="https://tusitio.com" inputmode="url" />
        </FormField>
      </div>

      {#if error}
        <StatusMessage tone="error" message={error} />
      {/if}

      <div class="id-actions">
        <button type="submit" class="btn" disabled={saving}>
          {#if saving}
            <span class="mini-spinner" aria-hidden="true"></span> Guardando…
          {:else if saved}
            Guardado <span aria-hidden="true">✓</span>
          {:else}
            Guardar perfil
          {/if}
        </button>
      </div>
    </form>
  {/if}
</section>

<style>
  .pf-hero {
    display: flex;
    align-items: center;
    gap: var(--s-4, 24px);
    margin-bottom: var(--s-5, 32px);
    padding-bottom: var(--s-4, 24px);
    border-bottom: 1px solid rgba(196, 181, 253, 0.1);
  }

  .pf-avatar-wrap {
    position: relative;
    flex: none;
  }

  .pf-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(196, 181, 253, 0.35);
    box-shadow: 0 0 28px rgba(124, 58, 237, 0.25);
  }

  .pf-fallback {
    display: grid;
    place-items: center;
    font-size: 1.6rem;
    font-weight: 650;
    color: var(--purple-300);
    background: linear-gradient(160deg, rgba(52, 40, 96, 0.9), rgba(26, 18, 52, 0.95));
  }

  .pf-avatar-dot {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--gray-600);
    border: 2px solid var(--black-900, #0a0710);
  }

  .pf-avatar-dot.ready {
    background: var(--ok, #6ee7b7);
  }

  .pf-hero-text {
    min-width: 0;
  }

  .pf-eyebrow {
    margin: 0 0 4px;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--purple-300);
  }

  .pf-name {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 650;
    letter-spacing: -0.02em;
    color: var(--white);
    text-wrap: balance;
  }

  .pf-email {
    margin: 6px 0 0;
    font-size: 0.8rem;
    color: var(--gray-400);
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .pf-email-tag {
    flex: none;
    font-family: var(--font-mono);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 2px 7px;
    border-radius: 999px;
    border: 1px solid rgba(196, 181, 253, 0.25);
    color: var(--purple-300);
  }

  .id-form {
    display: flex;
    flex-direction: column;
    gap: var(--s-4, 20px);
    max-width: 860px;
  }

  .id-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--s-3, 16px);
  }

  .id-sub {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--gray-400);
  }

  .id-actions {
    display: flex;
    gap: var(--s-2);
  }

  textarea {
    width: 100%;
    min-height: 96px;
    padding: 10px 12px;
    font-size: 0.88rem;
    font-family: inherit;
    resize: vertical;
  }

  /* skeleton */
  .pf-skel {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    max-width: 640px;
  }

  .pf-skel-row {
    display: flex;
    gap: var(--s-3);
    align-items: center;
  }

  .sk {
    display: block;
    border-radius: 10px;
    background: linear-gradient(90deg, rgba(196, 181, 253, 0.06) 25%, rgba(196, 181, 253, 0.12) 50%, rgba(196, 181, 253, 0.06) 75%);
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
    height: 48px;
  }

  .sk-block {
    height: 64px;
  }

  .sk-block.short {
    height: 40px;
    width: 40%;
  }

  @keyframes sk-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .sk { animation: none; }
  }

  @media (max-width: 560px) {
    .pf-hero {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--s-3);
    }
  }
</style>
