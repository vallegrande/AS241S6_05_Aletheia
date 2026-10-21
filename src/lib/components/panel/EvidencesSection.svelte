<script>
  /**
   * EvidencesSection — CRUD de evidencias (proyectos, certificaciones,
   * logros, portafolios) con subida opcional de archivo (máx. 10 MB).
   */
  import { onMount } from 'svelte'
  import {
    listEvidences,
    createEvidence,
    updateEvidence,
    deleteEvidence,
    evidenceFileUrl,
  } from '../../api/client'
  import { pushToast } from '../../stores/toast'
  import { OPEN_EVIDENCE_FORM } from '../../stores/panelBus'
  import FormField from '../dapp/FormField.svelte'
  import StatusMessage from '../dapp/StatusMessage.svelte'
  import Icon from '../Icon.svelte'
  import { fly } from 'svelte/transition'

  const TIPOS = [
    { id: 'proyecto', label: 'Proyecto' },
    { id: 'certificacion', label: 'Certificación' },
    { id: 'logro', label: 'Logro' },
    { id: 'portafolio', label: 'Portafolio' },
  ]

  let items = $state([])
  let loading = $state(true)
  let error = $state('')
  let formOpen = $state(false)
  let editingId = $state(null)
  let saving = $state(false)
  let deletingId = $state(null)

  let fTipo = $state('proyecto')
  let fTitulo = $state('')
  let fDescripcion = $state('')
  let fEnlace = $state('')
  let fTags = $state('')
  let fFecha = $state('')
  let fFile = $state(null)
  let fFileInput = $state(null)

  async function refresh() {
    error = ''
    try {
      items = await listEvidences()
    } catch (e) {
      error = e.message || 'No se pudieron cargar las evidencias'
    } finally {
      loading = false
    }
  }

  onMount(() => {
    refresh()
    const openForm = () => openNew()
    window.addEventListener(OPEN_EVIDENCE_FORM, openForm)
    return () => window.removeEventListener(OPEN_EVIDENCE_FORM, openForm)
  })

  function resetForm() {
    fTipo = 'proyecto'
    fTitulo = ''
    fDescripcion = ''
    fEnlace = ''
    fTags = ''
    fFecha = ''
    fFile = null
    if (fFileInput) fFileInput.value = ''
    editingId = null
  }

  function openNew() {
    resetForm()
    formOpen = true
  }

  function openEdit(ev) {
    editingId = ev.id
    fTipo = ev.tipo
    fTitulo = ev.titulo
    fDescripcion = ev.descripcion || ''
    fEnlace = ev.enlace || ''
    fTags = (ev.tags || []).join(', ')
    fFecha = ev.fecha ? ev.fecha.slice(0, 10) : ''
    fFile = null
    if (fFileInput) fFileInput.value = ''
    formOpen = true
  }

  function closeForm() {
    formOpen = false
    resetForm()
  }

  async function onSubmit(e) {
    e.preventDefault()
    saving = true
    error = ''
    const tags = fTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    try {
      const payload = {
        tipo: fTipo,
        titulo: fTitulo.trim(),
        descripcion: fDescripcion.trim(),
        enlace: fEnlace.trim(),
        tags,
        fecha: fFecha || null,
        file: fFile,
      }
      if (editingId) {
        await updateEvidence(editingId, payload)
        pushToast('success', 'Evidencia actualizada', payload.titulo)
      } else {
        await createEvidence(payload)
        pushToast('success', 'Evidencia creada', payload.titulo)
      }
      closeForm()
      await refresh()
    } catch (err) {
      error = err.message || 'No se pudo guardar la evidencia'
    } finally {
      saving = false
    }
  }

  async function onDelete(ev) {
    if (!confirm(`¿Eliminar la evidencia "${ev.titulo}"?`)) return
    deletingId = ev.id
    try {
      await deleteEvidence(ev.id)
      pushToast('info', 'Evidencia eliminada', ev.titulo)
      await refresh()
    } catch (err) {
      pushToast('error', 'No se pudo eliminar', err.message)
    } finally {
      deletingId = null
    }
  }

  function onFileChange(e) {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > 10 * 1024 * 1024) {
      pushToast('error', 'Archivo demasiado grande', 'El máximo son 10 MB.')
      e.target.value = ''
      fFile = null
      return
    }
    fFile = f
  }

  const tipoLabel = (id) => TIPOS.find((t) => t.id === id)?.label ?? id
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '—')
</script>

<section class="dapp-section" aria-label="Evidencias">
  <div class="ev-top">
    <p class="ev-count">{items.length} evidencia{items.length === 1 ? '' : 's'}</p>
    <button type="button" class="btn btn-sm" onclick={openNew} disabled={formOpen}>
      <Icon name="plus" size={14} /> Nueva evidencia
    </button>
  </div>

  {#if formOpen}
    <form class="ev-form" onsubmit={onSubmit}>
      <p class="ev-form-title">{editingId ? 'Editar evidencia' : 'Nueva evidencia'}</p>
      <div class="ev-grid">
        <FormField label="Tipo" for="ev-tipo">
          <select id="ev-tipo" bind:value={fTipo}>
            {#each TIPOS as t (t.id)}
              <option value={t.id}>{t.label}</option>
            {/each}
          </select>
        </FormField>
        <FormField label="Título" for="ev-titulo">
          <input id="ev-titulo" bind:value={fTitulo} required placeholder="Nombre del proyecto o certificación" />
        </FormField>
        <FormField label="Fecha" for="ev-fecha">
          <input id="ev-fecha" type="date" bind:value={fFecha} />
        </FormField>
      </div>
      <FormField label="Descripción" for="ev-desc">
        <textarea id="ev-desc" bind:value={fDescripcion} rows="3" placeholder="Qué demuestra esta evidencia…"></textarea>
      </FormField>
      <div class="ev-grid">
        <FormField label="Enlace" for="ev-enlace">
          <input id="ev-enlace" bind:value={fEnlace} placeholder="https://…" inputmode="url" />
        </FormField>
        <FormField label="Etiquetas (separadas por coma)" for="ev-tags">
          <input id="ev-tags" bind:value={fTags} placeholder="javascript, react, diseño" />
        </FormField>
      </div>
      <FormField label="Archivo (opcional, máx. 10 MB)" for="ev-file" help="PDF, imagen o ZIP. Se guarda en la base de datos, fuera de la cadena.">
        <input id="ev-file" type="file" bind:this={fFileInput} onchange={onFileChange} accept=".pdf,.png,.jpg,.jpeg,.webp,.zip,.txt,.json" />
      </FormField>
      {#if error}
        <StatusMessage tone="error" message={error} />
      {/if}
      <div class="ev-actions">
        <button type="submit" class="btn" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" class="btn btn-sm" onclick={closeForm} disabled={saving}>Cancelar</button>
      </div>
    </form>
  {/if}

  {#if loading}
    <ul class="ev-list" aria-hidden="true">
      {#each [0, 1, 2] as i (i)}
        <li class="ev-item ev-skel"><span class="ev-skel-bar"></span><span class="ev-skel-bar short"></span></li>
      {/each}
    </ul>
  {:else if error && !formOpen}
    <StatusMessage tone="error" message={error} />
  {:else if items.length === 0 && !formOpen}
    <StatusMessage tone="muted" message="Aún no tienes evidencias. Crea la primera para empezar a construir tu reputación." />
  {:else}
    <ul class="ev-list">
      {#each items as ev, i (ev.id)}
        <li class="ev-item" in:fly={{ y: 10, duration: 240, delay: Math.min(i * 40, 200) }}>
          <div class="ev-item-main">
            <div class="ev-item-head">
              <span class="dapp-chip info">{tipoLabel(ev.tipo)}</span>
              <h3 class="ev-item-title">{ev.titulo}</h3>
              {#if ev.cert_status === 'onchain'}
                <span class="dapp-chip ok">certificada</span>
              {:else if ev.cert_status === 'hashed'}
                <span class="dapp-chip warn">huella</span>
              {/if}
            </div>
            {#if ev.descripcion}
              <p class="ev-item-desc">{ev.descripcion}</p>
            {/if}
            <div class="ev-item-meta">
              {#if ev.fecha}<span>{fmtDate(ev.fecha)}</span>{/if}
              {#if ev.enlace}<a href={ev.enlace} target="_blank" rel="noopener noreferrer">enlace ↗</a>{/if}
              {#if ev.has_file}<a href={evidenceFileUrl(ev.id)} target="_blank" rel="noopener noreferrer">{ev.file_name} ↗</a>{/if}
              {#each ev.tags || [] as tag (tag)}<span class="ev-tag">{tag}</span>{/each}
            </div>
          </div>
          <div class="ev-item-actions">
            <button type="button" class="btn btn-sm" onclick={() => openEdit(ev)}>Editar</button>
            <button
              type="button"
              class="btn btn-sm ev-del"
              onclick={() => onDelete(ev)}
              disabled={deletingId === ev.id}
              aria-label={`Eliminar ${ev.titulo}`}
            >
              {deletingId === ev.id ? '…' : 'Eliminar'}
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .ev-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-2);
    margin-bottom: var(--s-3, 16px);
  }

  .ev-count {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--gray-400);
  }

  .ev-form {
    display: flex;
    flex-direction: column;
    gap: var(--s-3, 16px);
    padding: var(--s-4, 20px);
    margin-bottom: var(--s-4, 24px);
    border: 1px solid rgba(196, 181, 253, 0.16);
    border-radius: var(--radius, 14px);
    background: rgba(10, 7, 22, 0.55);
  }

  .ev-form-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--white);
  }

  .ev-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--s-3, 16px);
  }

  .ev-actions {
    display: flex;
    gap: var(--s-2);
  }

  .ev-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .ev-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--s-3);
    padding: var(--s-3, 16px);
    border: 1px solid rgba(196, 181, 253, 0.12);
    border-radius: 12px;
    background: rgba(8, 5, 18, 0.5);
  }

  .ev-item-main {
    min-width: 0;
    flex: 1;
  }

  .ev-item-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ev-item-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--white);
  }

  .ev-item-desc {
    margin: 6px 0 0;
    font-size: 0.82rem;
    color: var(--gray-400);
    line-height: 1.45;
  }

  .ev-item-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 8px;
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .ev-item-meta a {
    color: var(--purple-300);
    text-decoration: none;
  }

  .ev-item-meta a:hover {
    text-decoration: underline;
  }

  .ev-tag {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid rgba(196, 181, 253, 0.18);
    color: var(--purple-300);
  }

  .ev-item-actions {
    display: flex;
    gap: 6px;
    flex: none;
  }

  .ev-del {
    color: #fca5a5;
    border-color: rgba(248, 113, 113, 0.3);
  }

  .ev-skel {
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }

  .ev-skel-bar {
    display: block;
    height: 12px;
    width: 42%;
    border-radius: 6px;
    background: linear-gradient(90deg, rgba(196, 181, 253, 0.06) 25%, rgba(196, 181, 253, 0.12) 50%, rgba(196, 181, 253, 0.06) 75%);
    background-size: 200% 100%;
    animation: ev-shimmer 1.3s ease-in-out infinite;
  }

  .ev-skel-bar.short {
    width: 70%;
    height: 10px;
  }

  @keyframes ev-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .ev-skel-bar { animation: none; }
  }

  textarea {
    width: 100%;
    min-height: 72px;
    padding: 10px 12px;
    font-size: 0.88rem;
    font-family: inherit;
    resize: vertical;
  }

  input[type='file'] {
    padding: 8px 10px;
    font-size: 0.8rem;
  }

  @media (max-width: 640px) {
    .ev-item {
      flex-direction: column;
    }

    .ev-item-actions {
      width: 100%;
    }

    .ev-item-actions .btn {
      flex: 1;
    }
  }
</style>
