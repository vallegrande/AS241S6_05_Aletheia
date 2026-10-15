<script>
  /**
   * ProfileForm — perfil profesional real (Firestore no: Postgres vía API).
   * Carga el perfil al montar y guarda con PUT /api/profile.
   */
  import { onMount } from 'svelte'
  import { getProfile, saveProfile } from '../../api/client'
  import { pushToast } from '../../stores/toast'
  import FormField from '../dapp/FormField.svelte'
  import StatusMessage from '../dapp/StatusMessage.svelte'

  let loading = $state(true)
  let saving = $state(false)
  let error = $state('')

  let nombre = $state('')
  let titulo = $state('')
  let bio = $state('')
  let linkGithub = $state('')
  let linkLinkedin = $state('')
  let linkPortafolio = $state('')

  onMount(async () => {
    try {
      const p = await getProfile()
      nombre = p.nombre || ''
      titulo = p.titulo || ''
      bio = p.bio || ''
      linkGithub = p.links?.github || ''
      linkLinkedin = p.links?.linkedin || ''
      linkPortafolio = p.links?.portafolio || ''
    } catch (e) {
      error = e.message || 'No se pudo cargar el perfil'
    } finally {
      loading = false
    }
  })

  async function onSubmit(e) {
    e.preventDefault()
    saving = true
    error = ''
    try {
      const links = {}
      if (linkGithub.trim()) links.github = linkGithub.trim()
      if (linkLinkedin.trim()) links.linkedin = linkLinkedin.trim()
      if (linkPortafolio.trim()) links.portafolio = linkPortafolio.trim()
      await saveProfile({ nombre: nombre.trim(), titulo: titulo.trim(), bio: bio.trim(), links })
      pushToast('success', 'Perfil guardado', 'Tu identidad profesional se actualizó correctamente.')
    } catch (err) {
      error = err.message || 'No se pudo guardar el perfil'
    } finally {
      saving = false
    }
  }
</script>

<section class="dapp-section" aria-label="Perfil profesional">
  {#if loading}
    <StatusMessage tone="muted" spin message="Cargando perfil…" />
  {:else}
    <form class="id-form" onsubmit={onSubmit}>
      <div class="id-grid">
        <FormField label="Nombre completo" for="pf-nombre">
          <input id="pf-nombre" name="nombre" bind:value={nombre} required placeholder="Tu nombre" autocomplete="name" />
        </FormField>
        <FormField label="Título profesional" for="pf-titulo">
          <input id="pf-titulo" name="titulo" bind:value={titulo} placeholder="Ej. Desarrollador full-stack" />
        </FormField>
      </div>

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
          {saving ? 'Guardando…' : 'Guardar perfil'}
        </button>
      </div>
    </form>
  {/if}
</section>

<style>
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
</style>
