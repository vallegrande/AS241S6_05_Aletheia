<script>
  /**
   * OnboardingModal — asistente a PANTALLA COMPLETA tras el primer login.
   *  1) Perfil  2) Primera evidencia  3) Huella SHA-256  4) On-chain (opcional)
   * Stepper de proceso arriba; el usuario no necesita ir al dashboard.
   */
  import { fade } from 'svelte/transition'
  import { auth, linkGithubAccount, unlinkGithubAccount } from '../stores/auth'
  import { wallet, connectWallet } from '../stores/wallet'
  import { getProfile, saveProfile, uploadProfilePhoto, createEvidence, updateEvidence, connectGithub as connectGithubApi, disconnectGithub as disconnectGithubApi, getGithubState, listGithubRepos, listGithubRepoFiles, getGithubRepoFile, getLinkedinState, disconnectLinkedin as disconnectLinkedinApi } from '../api/client'
  import { connectLinkedIn } from '../linkedin'
  import { evidenceFingerprint } from '../crypto/hash'
  import { PROOF_REGISTRY_ADDRESS, PROOF_CHAIN_ID, registerHashOnChain } from '../web3/proof-registry'
  import { pushToast } from '../stores/toast'
  import StatusMessage from './dapp/StatusMessage.svelte'

  let { onClose, onFinish } = $props()

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

  const STEPS = [
    { n: 1, label: 'Tu perfil', desc: 'Cómo te presentas' },
    { n: 2, label: 'Evidencia', desc: 'Tu primer logro' },
    { n: 3, label: 'Huella', desc: 'SHA-256 único' },
    { n: 4, label: 'Blockchain', desc: 'Sello en Amoy' },
  ]

  let step = $state(1)
  let busy = $state(false)
  let error = $state('')

  /* progreso persistente: recargar en #/configurar retoma el paso */
  const PROGRESS_KEY = 'aletheia:onboarding-progress'

  function loadProgress() {
    try {
      const raw = sessionStorage.getItem(PROGRESS_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (typeof d.step === 'number') step = Math.min(Math.max(1, d.step), 4)
      if (d.nombre) nombre = d.nombre
      if (d.titulo) titulo = d.titulo
      if (d.bio) bio = d.bio
      if (d.linkGithub) linkGithub = d.linkGithub
      if (d.linkLinkedin) linkLinkedin = d.linkLinkedin
      if (d.linkPortafolio) linkPortafolio = d.linkPortafolio
      if (d.evTipo) evTipo = d.evTipo
      if (d.evTitulo) evTitulo = d.evTitulo
      if (d.evDescripcion) evDescripcion = d.evDescripcion
      if (d.evEnlace) evEnlace = d.evEnlace
      if (d.evOrigen) evOrigen = d.evOrigen
      if (typeof d.repoPick === 'string') repoPick = d.repoPick
      else if (Array.isArray(d.repoPicks) && d.repoPicks[0]) repoPick = d.repoPicks[0] // progreso antiguo
      if (Array.isArray(d.created)) created = d.created.map((c) => ({ ...c, files: [] }))
      // si se retoma en el paso 2 con GitHub, el selector necesita los repos
      if (evOrigen === 'github') loadGhRepos()
    } catch {
      /* progreso corrupto: empieza de cero */
    }
  }

  function saveProgress() {
    try {
      sessionStorage.setItem(
        PROGRESS_KEY,
        JSON.stringify({
          step,
          nombre,
          titulo,
          bio,
          linkGithub,
          linkLinkedin,
          linkPortafolio,
          evTipo,
          evTitulo,
          evDescripcion,
          evEnlace,
          evOrigen,
          repoPick,
          created: created.map((c) => ({
            id: c.id,
            titulo: c.titulo,
            tipo: c.tipo,
            descripcion: c.descripcion,
            enlace: c.enlace,
            hash: c.hash,
            tx: c.tx,
          })),
        }),
      )
    } catch {
      /* sin sessionStorage: no pasa nada */
    }
  }

  // (la restauración del progreso ocurre más abajo, tras declarar todo el estado)

  // cada cambio de estado relevante se guarda
  $effect(() => {
    // leer todas las dependencias
    void [
      step,
      nombre,
      titulo,
      bio,
      linkGithub,
      linkLinkedin,
      linkPortafolio,
      evTipo,
      evTitulo,
      evDescripcion,
      evEnlace,
      evOrigen,
      repoPick,
      created.length,
      ...created.flatMap((c) => [c.id, c.hash, c.tx]),
    ]
    saveProgress()
  })

  /* ---- paso 1: perfil ---- */
  let nombre = $state('')
  let titulo = $state('')
  let bio = $state('')
  let linkGithub = $state('')
  let linkLinkedin = $state('')
  let linkPortafolio = $state('')
  let fotoFile = $state(null)
  let fotoInput = $state(null)
  let fotoPreview = $state('')
  let connecting = $state(false)

  /** Vincula GitHub (popup de Firebase) y autocompleta el enlace del perfil. */
  async function connectGithub() {
    connecting = true
    error = ''
    try {
      const { username, accessToken } = await linkGithubAccount()
      if (username) {
        linkGithub = `github.com/${username}`
        ghUser = username
        ghConnected = true
        ghLoaded = false
        // guarda en backend para poder traer repos cuando quieras
        await connectGithubApi(username, accessToken).catch(() => {})
        await loadGhRepos(true) // el selector debe traer repos ya al conectar
        pushToast('success', 'GitHub conectado', `@${username} — tus repos ya están disponibles.`)
      } else {
        pushToast('info', 'GitHub conectado', 'Escribe tu usuario si no aparece automáticamente.')
      }
    } catch (e) {
      error = e.message || 'No se pudo conectar GitHub'
    } finally {
      connecting = false
    }
  }

  $effect.pre(() => {
    if (!nombre && user) nombre = user.displayName || nameFromEmail(user.email) || ''
  })

  /* ---- paso 2: evidencia ---- */
  let evTipo = $state('proyecto')
  let evTitulo = $state('')
  let evDescripcion = $state('')
  let evEnlace = $state('')
  let evFiles = $state([]) // archivos adjuntos de la evidencia (puede haber varios)
  let evFilesFrom = $state('') // '' | 'local' | 'github'
  let evFileInput = $state(null)
  let busyLabel = $state('') // texto mientras se descarga/sube algo largo
  let created = $state([]) // evidencias creadas: { id, titulo, tipo, descripcion, enlace, file, hash, tx }

  /* origen de la evidencia: elegir de dónde viene */
  let evOrigen = $state('manual') // 'github' | 'linkedin' | 'manual'
  let ghLoaded = $state(false)
  let ghLoading = $state(false)
  let ghRepos = $state([])
  let ghUser = $state('')
  let ghConnected = $state(false)
  let ghDisconnecting = $state(false)
  let repoPick = $state('') // full_name del repo elegido como evidencia

  /* LinkedIn: conexión de identidad (nombre/foto), no login */
  let liConnected = $state(false)
  let liName = $state('')
  let liPicture = $state('')
  let liConnecting = $state(false)
  let liDisconnecting = $state(false)

  async function loadGhRepos(force = false) {
    if (ghLoading) return
    if (ghLoaded && ghRepos.length > 0 && !force) return
    if (force) {
      ghLoaded = false
      ghRepos = []
    }
    // sin cuenta vinculada no hay nada que pedir: se muestra "Conectar" y punto
    const st = await getGithubState().catch(() => ({ username: '', connected: false }))
    ghUser = st.username
    if (!st.connected) {
      ghConnected = false
      ghRepos = []
      ghLoaded = true
      return
    }
    ghConnected = true
    ghLoading = true
    error = ''
    try {
      ghRepos = await listGithubRepos()
      ghLoaded = true
    } catch (e) {
      ghLoaded = true
      ghRepos = []
      error = e.message || 'No se pudieron cargar tus repositorios'
    } finally {
      ghLoading = false
    }
  }

  /** Marca un repo como evidencia: rellena título, descripción y enlace del formulario. */
  function pickRepo(r) {
    evTipo = 'proyecto'
    evTitulo = r.name
    evDescripcion = r.description || ''
    evEnlace = r.html_url
  }

  function setOrigen(o) {
    evOrigen = o
    if (o !== 'github') repoClose()
    if (o === 'github') loadGhRepos()
    if (o === 'linkedin') {
      evEnlace = ''
      if (!evTitulo.trim()) evTitulo = ''
      // refresca si se conectó en otra pestaña o desde el panel
      if (!liConnected) loadLinkedinState()
    }
  }

  /* ---- paso 2: selector de repos (dropdown propio con buscador) ---- */
  let repoOpen = $state(false)
  let repoQuery = $state('')
  let repoBox = $state(null) // contenedor para detectar clics fuera

  /* archivos del repositorio elegido (contenido real de GitHub) */
  let repoView = $state('repos') // 'repos' | 'files'
  let repoFiles = $state([])
  let repoFilesFor = $state('') // repo cuyos archivos ya están cargados
  let repoTruncated = $state(false)
  let filesLoading = $state(false)
  let fileQuery = $state('')
  let fileFetching = $state('') // ruta del archivo que se está trayendo
  let filePicks = $state([]) // rutas de los archivos del repo elegidos (aún sin descargar)

  /** Repos filtrados por el buscador (nombre, descripción o lenguaje). */
  const repoFiltered = $derived.by(() => {
    const q = repoQuery.trim().toLowerCase()
    if (!q) return ghRepos
    return ghRepos.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        (r.language ?? '').toLowerCase().includes(q),
    )
  })

  /** Archivos del repo filtrados por el buscador. */
  const repoFilesFiltered = $derived.by(() => {
    const q = fileQuery.trim().toLowerCase()
    if (!q) return repoFiles
    return repoFiles.filter((f) => f.path.toLowerCase().includes(q))
  })

  /** Repo elegido (solo uno a la vez). */
  const repoSelected = $derived(ghRepos.find((r) => r.full_name === repoPick) ?? null)

  /** Posición del desplegable (overlay fijo): no altera la altura del paso. */
  let repoMenuPos = $state({ top: '0px', left: '0px', width: '0px' })

  /**
   * Ancla el panel al trigger (overlay fijo). Devuelve false si el trigger ya
   * no está en pantalla, que es el único caso en el que se cierra.
   */
  function placeRepoMenu() {
    const trigger = repoBox?.querySelector('.repo-trigger')
    if (!trigger) return false
    const r = trigger.getBoundingClientRect()
    if (r.bottom < 0 || r.top > window.innerHeight) return false
    const panelH = 340 // alto máximo estimado del panel
    const below = r.bottom + 6
    const top = below + panelH > window.innerHeight && r.top > panelH ? r.top - panelH - 6 : below
    repoMenuPos = { top: `${Math.max(8, top)}px`, left: `${r.left}px`, width: `${r.width}px` }
    return true
  }

  function repoToggle(open = !repoOpen) {
    if (open) {
      // siempre se abre en la lista de repos: cambiar de repo debe ser directo
      repoView = 'repos'
      placeRepoMenu()
    }
    repoOpen = open
    if (open) requestAnimationFrame(() => repoBox?.querySelector('.rp-search input')?.focus())
  }

  function repoClose() {
    repoOpen = false
    repoQuery = ''
    fileQuery = ''
  }

  /** Archivos del repositorio según la rama por defecto de GitHub. */
  async function loadRepoFiles(fullName) {
    const [owner, repo] = fullName.split('/')
    filesLoading = true
    error = ''
    try {
      const data = await listGithubRepoFiles(owner, repo)
      repoFiles = data.files
      repoTruncated = data.truncated
    } catch (e) {
      repoFiles = []
      error = e.message || 'No se pudieron listar los archivos del repositorio'
    } finally {
      repoFilesFor = fullName
      filesLoading = false
    }
  }

  /** Abre la vista de archivos del repo elegido (carga si hace falta). */
  async function openRepoFiles() {
    if (!repoPick) return
    repoView = 'files'
    fileQuery = ''
    if (repoFilesFor !== repoPick) await loadRepoFiles(repoPick)
  }

  /** Elige un repo (uno solo): prellena el formulario y muestra sus archivos. */
  async function selectRepo(r) {
    if (repoPick !== r.full_name && evFilesFrom === 'github') clearEvFile() // los archivos eran de otro repo
    repoPick = r.full_name
    pickRepo(r)
    repoQuery = ''
    await openRepoFiles()
  }

  /**
   * Clic fuera del dropdown: se cierra. Se mira la ruta del evento y no el DOM
   * vivo: al pasar a la vista de archivos el botón pulsado ya se desmontó, y
   * `contains` daría falso y cerraría el panel sin querer.
   */
  function onDocClick(e) {
    if (!repoOpen || !repoBox) return
    const path = typeof e.composedPath === 'function' ? e.composedPath() : []
    const dentro =
      path.includes(repoBox) ||
      path.some((n) => n instanceof Element && n.classList?.contains('repo-panel'))
    if (!dentro) repoClose()
  }

  // el panel es overlay fijo: al hacer scroll sigue al trigger en vez de cerrarse
  $effect(() => {
    if (!repoOpen) return
    let raf = 0
    const follow = (e) => {
      // el scroll de la propia lista del panel no mueve el ancla
      if (e?.target instanceof Element && e.target.closest('.repo-panel')) return
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (!placeRepoMenu()) repoClose()
      })
    }
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  })

  /* ---- paso 3: huella ---- */
  const hashShort = (h) => (h ? h.slice(0, 12) + '…' + h.slice(-6) : '')

  /* ---- paso 4: on-chain ---- */
  let certIdx = $state(-1)
  let certPhase = $state('') // 'wallet' mientras espera la wallet | 'tx' mientras firma
  let certList = $state(null)
  const allAnchored = $derived(created.length > 0 && created.every((c) => c.tx))

  /** Mantiene visible la fila que se está sellando dentro de la lista. */
  $effect(() => {
    if (!busy || certIdx < 0 || !certList) return
    const row = certList.children[certIdx]
    if (!row) return
    const listRect = certList.getBoundingClientRect()
    const rowRect = row.getBoundingClientRect()
    const top = certList.scrollTop + (rowRect.top - listRect.top) - certList.clientHeight / 2 + rowRect.height / 2
    certList.scrollTo({ top, behavior: 'smooth' })
  })

  // restaurar una vez al montar (los archivos no se pueden persistir)
  loadProgress()

  /**
   * Estado de GitHub al entrar: si ya estaba conectado en una sesión previa,
   * el botón debe decir "Conectado" y no "Conectar".
   */
  async function loadGithubState() {
    const st = await getGithubState().catch(() => ({ username: '', connected: false }))
    ghUser = st.username
    if (st.connected) {
      ghConnected = true
      if (!linkGithub.trim() && st.username) linkGithub = `github.com/${st.username}`
    }
  }
  loadGithubState()

  /** Desvincula GitHub (Firebase + backend) y limpia el paso. */
  async function disconnectGithub() {
    ghDisconnecting = true
    error = ''
    try {
      await disconnectGithubApi().catch(() => {})
      await unlinkGithubAccount().catch(() => {})
      ghConnected = false
      ghUser = ''
      ghRepos = []
      ghLoaded = false
      repoPick = ''
      repoFiles = []
      repoFilesFor = ''
      if (evFilesFrom === 'github') clearEvFile()
      linkGithub = ''
      pushToast('info', 'GitHub desconectado', 'Puedes volver a conectarlo cuando quieras.')
    } catch (e) {
      error = e.message || 'No se pudo desconectar GitHub'
    } finally {
      ghDisconnecting = false
    }
  }

  /* ---- LinkedIn: conectar/desconectar (popup propio, sin login) ---- */

  async function loadLinkedinState() {
    const st = await getLinkedinState().catch(() => ({ connected: false, name: '', picture: '' }))
    liConnected = st.connected
    liName = st.name
    liPicture = st.picture
  }
  loadLinkedinState()

  async function connectLinkedin() {
    liConnecting = true
    error = ''
    try {
      const st = await connectLinkedIn()
      liConnected = st.connected
      liName = st.name
      liPicture = st.picture
      pushToast('success', 'LinkedIn conectado', liName ? `Verificado: ${liName}.` : 'Identidad verificada.')
    } catch (e) {
      error = e.message || 'No se pudo conectar LinkedIn'
    } finally {
      liConnecting = false
    }
  }

  async function disconnectLinkedin() {
    liDisconnecting = true
    error = ''
    try {
      await disconnectLinkedinApi().catch(() => {})
      liConnected = false
      liName = ''
      liPicture = ''
      pushToast('info', 'LinkedIn desconectado', 'Puedes volver a conectarlo cuando quieras.')
    } catch (e) {
      error = e.message || 'No se pudo desconectar LinkedIn'
    } finally {
      liDisconnecting = false
    }
  }

  const contractReady = Boolean(PROOF_REGISTRY_ADDRESS)

  function onKey(e) {
    if (e.key === 'Escape') {
      if (repoOpen) repoClose()
      else onClose?.()
    }
  }

  function pickFoto() {
    fotoInput?.click()
  }

  function onFoto(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !f.type.startsWith('image/')) return
    if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    fotoFile = f
    fotoPreview = URL.createObjectURL(f)
  }

  function pickEvFile() {
    evFileInput?.click()
  }

  function onEvFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) {
      evFiles = [f]
      evFilesFrom = 'local'
      filePicks = []
    }
  }

  function clearEvFile() {
    evFiles = []
    evFilesFrom = ''
    filePicks = []
  }

  /* ---- archivos del repo de GitHub (contenido real, sin subirlo a mano) ---- */

  const MIME_BY_EXT = {
    md: 'text/markdown',
    txt: 'text/plain',
    json: 'application/json',
    js: 'text/javascript',
    mjs: 'text/javascript',
    ts: 'text/plain',
    jsx: 'text/plain',
    tsx: 'text/plain',
    svelte: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    py: 'text/x-python',
    java: 'text/x-java-source',
    kt: 'text/plain',
    go: 'text/plain',
    rs: 'text/plain',
    rb: 'text/plain',
    php: 'text/plain',
    c: 'text/plain',
    cpp: 'text/plain',
    cs: 'text/plain',
    sql: 'application/sql',
    yml: 'text/yaml',
    yaml: 'text/yaml',
    toml: 'text/plain',
    xml: 'text/xml',
    csv: 'text/csv',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    zip: 'application/zip',
    ipynb: 'application/json',
  }

  function fileMime(name) {
    const ext = String(name).split('.').pop()?.toLowerCase() ?? ''
    return MIME_BY_EXT[ext] ?? 'application/octet-stream'
  }

  /** base64 → File, para adjuntarlo como si se hubiera elegido localmente. */
  function base64ToFile(b64, name) {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new File([bytes], name, { type: fileMime(name) })
  }

  const humanSize = (n) =>
    n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`

  const dirOf = (p) => {
    const i = p.lastIndexOf('/')
    return i === -1 ? '' : p.slice(0, i + 1)
  }

  /** Marca/desmarca un archivo del repo: se descarga al continuar. */
  function toggleRepoFile(f) {
    filePicks = filePicks.includes(f.path) ? filePicks.filter((p) => p !== f.path) : [...filePicks, f.path]
  }

  const allFilesPicked = $derived(repoFiles.length > 0 && filePicks.length === repoFiles.length)

  function toggleAllRepoFiles() {
    filePicks = allFilesPicked ? [] : repoFiles.map((f) => f.path)
  }

  const pickedFilesMeta = $derived(repoFiles.filter((f) => filePicks.includes(f.path)))

  /**
   * Descarga el contenido de los archivos marcados y los adjunta a la
   * evidencia. Se hace aquí y no al marcar: pueden ser decenas de archivos.
   */
  async function fetchPickedFiles() {
    const [owner, repo] = repoPick.split('/')
    const paths = [...filePicks]
    const out = []
    for (let i = 0; i < paths.length; i++) {
      busyLabel = `Descargando ${i + 1}/${paths.length}…`
      fileFetching = paths[i]
      const data = await getGithubRepoFile(owner, repo, paths[i])
      out.push(base64ToFile(data.base64, data.name))
    }
    fileFetching = ''
    busyLabel = ''
    return out
  }

  async function nextFromPerfil() {
    if (!nombre.trim()) {
      error = 'Escribe tu nombre completo'
      return
    }
    if (!titulo.trim()) {
      error = 'Cuéntanos a qué te dedicas'
      return
    }
    if (!bio.trim()) {
      error = 'Escribe unas líneas sobre ti'
      return
    }
    busy = true
    error = ''
    try {
      const links = {}
      if (linkGithub.trim()) links.github = linkGithub.trim()
      if (linkLinkedin.trim()) links.linkedin = linkLinkedin.trim()
      if (linkPortafolio.trim()) links.portafolio = linkPortafolio.trim()
      await saveProfile({ nombre: nombre.trim(), titulo: titulo.trim(), bio: bio.trim(), links })
      if (fotoFile) await uploadProfilePhoto(fotoFile)
      step = 2
      // si ya conectaste GitHub en el paso 1, ese origen queda listo
      getGithubState()
        .then((g) => {
          if (g.connected && evOrigen === 'manual') {
            evOrigen = 'github'
            loadGhRepos()
          }
        })
        .catch(() => {})
    } catch (e) {
      error = e.message || 'No se pudo guardar el perfil'
    } finally {
      busy = false
    }
  }

  async function nextFromEvidencia() {
    if (!evTitulo.trim()) {
      error = 'Ponle un título a tu evidencia'
      return
    }
    if (evOrigen === 'linkedin' && !evEnlace.trim()) {
      error = 'Pega el enlace de tu publicación de LinkedIn'
      return
    }
    busy = true
    error = ''
    try {
      let files = evFiles
      // archivos marcados en el repo: se descargan aquí, de una sola vez
      if (filePicks.length) {
        if (filePicks.length > 20) {
          error = 'Un máximo de 20 archivos por evidencia'
          busy = false
          return
        }
        const total = pickedFilesMeta.reduce((a, f) => a + (f.size || 0), 0)
        if (total > 40 * 1024 * 1024) {
          error = 'Los archivos marcados suman más de 40 MB. Desmarca algunos.'
          busy = false
          return
        }
        files = await fetchPickedFiles()
        evFiles = files
        evFilesFrom = 'github'
      }
      const ev = await createEvidence({
        tipo: evTipo,
        titulo: evTitulo.trim(),
        descripcion: evDescripcion.trim(),
        enlace: evEnlace.trim(),
        files,
      })
      created = [
        {
          id: ev.id,
          titulo: evTitulo.trim(),
          tipo: evTipo,
          descripcion: evDescripcion.trim(),
          enlace: evEnlace.trim(),
          files,
          hash: '',
          tx: '',
        },
      ]
      step = 3
    } catch (e) {
      error = e.message || 'No se pudo crear la evidencia'
    } finally {
      busy = false
      busyLabel = ''
    }
  }

  async function makeHash() {
    if (!created.length) return
    busy = true
    error = ''
    try {
      for (const ev of created) {
        ev.hash = await evidenceFingerprint({
          tipo: ev.tipo,
          titulo: ev.titulo,
          descripcion: ev.descripcion,
          enlace: ev.enlace,
          files: ev.files,
        })
        await updateEvidence(ev.id, { hash: ev.hash, cert_status: 'hashed' })
      }
      step = 4
    } catch (e) {
      error = e.message || 'No se pudo generar la huella'
    } finally {
      busy = false
    }
  }

  async function certify() {
    busy = true
    certPhase = 'wallet'
    error = ''
    try {
      if (!$wallet.connected) {
        try {
          await connectWallet()
        } catch {
          error = 'Conecta Pali Wallet (en red Polygon Amoy) para certificar.'
          busy = false
          certPhase = ''
          return
        }
      }
      certPhase = 'tx'
      for (let i = 0; i < created.length; i++) {
        certIdx = i
        const ev = created[i]
        ev.tx = await registerHashOnChain(ev.hash)
        await updateEvidence(ev.id, {
          cert_status: 'onchain',
          tx_hash: ev.tx,
          chain_id: PROOF_CHAIN_ID,
        })
      }
      pushToast(
        'success',
        created.length > 1 ? '¡Evidencias certificadas!' : '¡Certificada en blockchain!',
        created.length > 1 ? 'Tus evidencias ya son verificables.' : 'Tu evidencia ya es verifiable.',
      )
    } catch (e) {
      error = e.message || 'No se pudo certificar on-chain'
    } finally {
      certIdx = -1
      certPhase = ''
      busy = false
    }
  }

  function goBack() {
    if (step > 1 && step < 4) step -= 1
    else if (step === 4 && !allAnchored) step = 3
  }

  function finish() {
    onClose?.()
    onFinish?.()
  }
</script>

<svelte:window onkeydown={onKey} onclick={onDocClick} />

<div class="ob-page" transition:fade={{ duration: 220 }} role="dialog" aria-modal="true" aria-label="Configura tu identidad">
  <!-- fondo sutil -->
  <div class="ob-bg" aria-hidden="true"></div>
  <!-- filo de luz: 1px en el borde superior de la página -->
  <span class="ob-topline" aria-hidden="true"></span>

  <div class="ob-shell">
    <!-- cabecera móvil (escritorio usa la sidebar) -->
    <header class="ob-mhead">
      <div class="ob-brand">
        <span class="ob-logo">
          <img src="/aletheia-logo.png" alt="" width="22" height="26" />
        </span>
        <span class="ob-brand-name">Aletheia</span>
      </div>
      <button type="button" class="ob-exit" onclick={finish}>Salir ✕</button>
    </header>

    <!-- mini progreso móvil: etiqueta + barra segmentada -->
    <div class="ob-mini">
      <span class="mini-label">{step} · {STEPS[step - 1].label}</span>
      <div class="mini-bar" aria-hidden="true">
        {#each STEPS as s (s.n)}
          <span class="mini-seg" class:done={step > s.n} class:now={step === s.n}></span>
        {/each}
      </div>
    </div>

    <aside class="ob-side">
      <div class="ob-brand">
        <span class="ob-logo">
          <img src="/aletheia-logo.png" alt="" width="22" height="26" />
        </span>
        <div class="ob-brand-txt">
          <span class="ob-brand-name">Aletheia</span>
          <span class="ob-brand-sub">Configura tu identidad</span>
        </div>
      </div>

      <!-- stepper vertical de proceso -->
      <ol class="stepper" aria-label="Progreso del asistente">
        {#each STEPS as s (s.n)}
          <li
            class="st"
            class:done={step > s.n || (s.n === 4 && allAnchored)}
            class:now={step === s.n && !(s.n === 4 && allAnchored)}
            aria-current={step === s.n ? 'step' : undefined}
          >
            <div class="st-rail">
              <span class="st-dot">
                {#if step > s.n || (s.n === 4 && allAnchored)}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                {:else}
                  {s.n}
                {/if}
              </span>
              {#if s.n < 4}
                <span class="st-line" class:fill={step > s.n}></span>
              {/if}
            </div>
            <div class="st-text">
              <p class="st-label">{s.label}</p>
              <p class="st-desc">{s.desc}</p>
            </div>
          </li>
        {/each}
      </ol>

      <div class="ob-side-foot">
        <span class="ob-step-count">Paso {step} de 4</span>
        <button type="button" class="ob-exit" onclick={finish}>Salir ✕</button>
      </div>
    </aside>

    <main class="ob-main">
      <!-- en escritorio todo cabe: este scroll solo aparece en móvil o pantallas muy bajas -->
      <div class="ob-body">
      {#if error}
        <StatusMessage tone="error" message={error} />
    {/if}

    <!-- paso 1: perfil -->
    {#if step === 1}
      <section class="pane" aria-label="Tu perfil">
        <p class="pane-eyebrow"><span class="pe-dot" aria-hidden="true"></span>Perfil</p>
        <h2 class="pane-title">Empecemos por ti</h2>
        <p class="pane-lead">Así te verá el mundo cuando comparta tu identidad verificable.</p>

        <div class="fotos">
          <div class="av-wrap">
            {#if fotoPreview || user?.photoURL}
              <img class="av" src={fotoPreview || user?.photoURL} alt="" referrerpolicy="no-referrer" />
            {:else}
              <span class="av av-fb" aria-hidden="true">{initial}</span>
            {/if}
            <button type="button" class="av-btn" onclick={pickFoto} aria-label="Cambiar foto">+</button>
            <input bind:this={fotoInput} type="file" accept="image/*" hidden onchange={onFoto} />
          </div>
          <div class="fotos-text">
            <p class="fotos-title">Tu foto</p>
            <p class="fotos-hint">JPG, PNG o WebP · máx. 5 MB</p>
          </div>
        </div>

        <div class="grid-2">
          <label class="field">
            <span>Nombre completo <em class="req" aria-hidden="true">*</em></span>
            <input bind:value={nombre} required placeholder="Tu nombre" autocomplete="name" />
          </label>
          <label class="field">
            <span>¿A qué te dedicas? <em class="req" aria-hidden="true">*</em></span>
            <input bind:value={titulo} required placeholder="Ej. Desarrollo de software" />
          </label>
        </div>

        <label class="field">
          <span>Sobre ti <em class="req" aria-hidden="true">*</em></span>
          <textarea bind:value={bio} rows="3" required placeholder="En qué te destacas y qué te gustaría demostrar."></textarea>
        </label>

        <p class="section-tag">Enlaces <em>(opcionales)</em></p>

        <!-- GitHub y LinkedIn lado a lado -->
        <div class="grid-2">
          <div class="field">
            <span class="field-label">
              <svg class="net-ic" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/>
              </svg>
              GitHub
            </span>
            <div class="link-row">
              {#if ghConnected}
                <span class="gh-ok">✓ <strong>@{ghUser}</strong></span>
                <button
                  type="button"
                  class="connect-btn ghost"
                  onclick={disconnectGithub}
                  disabled={ghDisconnecting}
                  aria-label="Desconectar GitHub"
                  title="Desconectar GitHub"
                >
                  {ghDisconnecting ? '…' : '✕'}
                </button>
              {:else}
                <button type="button" class="connect-btn wide" onclick={connectGithub} disabled={connecting}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/>
                  </svg>
                  {connecting ? 'Conectando…' : 'Conectar'}
                </button>
              {/if}
            </div>
          </div>

          <div class="field">
            <span class="field-label">
              <svg class="net-ic" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
              </svg>
              LinkedIn
            </span>
            <div class="link-row">
              {#if liConnected}
                <span class="li-ok">✓ {liName ? liName.split(' ')[0] : 'Conectado'}</span>
                <button
                  type="button"
                  class="connect-btn ghost"
                  onclick={disconnectLinkedin}
                  disabled={liDisconnecting}
                  aria-label="Desconectar LinkedIn"
                  title="Desconectar LinkedIn"
                >
                  {liDisconnecting ? '…' : '✕'}
                </button>
              {:else}
                <button type="button" class="connect-btn wide" onclick={connectLinkedin} disabled={liConnecting}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
                  </svg>
                  {liConnecting ? 'Conectando…' : 'Conectar'}
                </button>
              {/if}
            </div>
          </div>
        </div>

        <div class="actions">
          <button type="button" class="btn-go" onclick={nextFromPerfil} disabled={busy || !nombre.trim() || !titulo.trim() || !bio.trim()}>
            {busy ? 'Guardando…' : 'Continuar'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </section>

      <!-- paso 2: evidencia -->
    {:else if step === 2}
      <section class="pane pane-ev" aria-label="Tu primera evidencia">
        <p class="pane-eyebrow"><span class="pe-dot" aria-hidden="true"></span>Evidencia</p>
        <h2 class="pane-title">Tu primer logro</h2>
        <p class="pane-lead">Elige de dónde viene tu evidencia. Certificaremos algo real, no una afirmación vacía.</p>

        <!-- selector de origen -->
        <div class="origen" role="radiogroup" aria-label="Origen de la evidencia">
          <button
            type="button"
            class="origen-card"
            class:sel={evOrigen === 'github'}
            onclick={() => setOrigen('github')}
            aria-pressed={evOrigen === 'github'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/>
            </svg>
            <span class="origen-name">GitHub</span>
            <span class="origen-desc">Un repositorio tuyo</span>
          </button>

          <button
            type="button"
            class="origen-card"
            class:sel={evOrigen === 'linkedin'}
            onclick={() => setOrigen('linkedin')}
            aria-pressed={evOrigen === 'linkedin'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
            </svg>
            <span class="origen-name">LinkedIn</span>
            <span class="origen-desc">Una publicación tuya</span>
          </button>

          <button
            type="button"
            class="origen-card"
            class:sel={evOrigen === 'manual'}
            onclick={() => setOrigen('manual')}
            aria-pressed={evOrigen === 'manual'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
            </svg>
            <span class="origen-name">A mano</span>
            <span class="origen-desc">Lo escribes tú</span>
          </button>
        </div>

        <!-- contenido variable: scroll propio para que la altura del paso no baile -->
        <div class="ev-scroll">
        <!-- origen: GitHub -->
        {#if evOrigen === 'github'}
          {#if ghLoading}
            <div class="repo-loading">
              <span class="spin" aria-hidden="true"></span>
              Cargando tus repositorios…
            </div>
          {:else if ghRepos.length > 0}
            <div class="repo-pick" bind:this={repoBox}>
              <span class="rp-label">Elige un repositorio <em class="opt">(uno a la vez)</em></span>

              <button
                type="button"
                class="repo-trigger"
                class:filled={Boolean(repoSelected)}
                onclick={() => repoToggle()}
                aria-expanded={repoOpen}
              >
                {#if repoSelected}
                  {#if repoSelected.private}
                    <svg class="rt-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  {:else}
                    <svg class="rt-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3h6l1.5 2H21v14a2 2 0 0 1-2 2H3z"/></svg>
                  {/if}
                  <span class="rt-txt">
                    <span class="rt-name">{repoSelected.name}</span>
                    <span class="rt-owner">
                      {filePicks.length ? `${filePicks.length} archivo${filePicks.length > 1 ? 's' : ''} · ${repoSelected.full_name}` : repoSelected.full_name}
                    </span>
                  </span>
                  {#if repoSelected.language || repoSelected.stargazers_count > 0}
                    <span class="rt-meta">{repoSelected.language ?? ''}{repoSelected.language && repoSelected.stargazers_count > 0 ? ' · ' : ''}{repoSelected.stargazers_count > 0 ? `★ ${repoSelected.stargazers_count}` : ''}</span>
                  {/if}
                {:else}
                  <span class="rt-ph">— Selecciona un repositorio —</span>
                {/if}
                <svg class="rt-chev" class:open={repoOpen} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
              </button>

              {#if repoOpen}
                <div
                  class="repo-panel"
                  aria-label={repoView === 'files' ? `Archivos de ${repoPick}` : 'Tus repositorios'}
                  style="top: {repoMenuPos.top}; left: {repoMenuPos.left}; width: {repoMenuPos.width};"
                >
                  <div class="rp-head">
                    {#if repoView === 'files'}
                      <button
                        type="button"
                        class="rp-back"
                        onclick={() => {
                          repoView = 'repos'
                          fileQuery = ''
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
                        Repositorios
                      </button>
                    {/if}
                    <span class="rp-head-txt">
                      {#if repoView === 'files'}
                        <strong>{repoPick}</strong>
                        <em>{filesLoading ? 'leyendo…' : `${repoFiles.length}${repoTruncated ? '+' : ''} archivos`}</em>
                      {:else}
                        <strong>{repoPick ? 'Cambiar de repositorio' : 'Repositorios'}</strong>
                        <em>{ghRepos.length} disponibles</em>
                      {/if}
                    </span>
                  </div>

                  {#if repoView === 'repos'}
                    <div class="rp-search">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                      <input
                        bind:value={repoQuery}
                        type="text"
                        placeholder="Buscar repositorio…"
                        aria-label="Buscar repositorio"
                      />
                      {#if repoQuery.trim()}
                        <span class="rp-count">{repoFiltered.length}/{ghRepos.length}</span>
                      {/if}
                    </div>

                    <ul class="rp-list" aria-label="Tus repositorios">
                      {#each repoFiltered as r (r.full_name)}
                        <li>
                          <button
                            type="button"
                            class="rp-item"
                            class:selected={repoPick === r.full_name}
                            onclick={() => selectRepo(r)}
                            aria-pressed={repoPick === r.full_name}
                          >
                            <span class="rp-ic" aria-hidden="true">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                            </span>
                            <span class="rp-txt">
                              <span class="rp-name">
                                {r.name}
                                {#if r.private}<span class="rp-tag">privado</span>{/if}
                                {#if repoPick === r.full_name}<span class="rp-tag rp-tag-ok">elegido</span>{/if}
                              </span>
                              {#if r.description}
                                <span class="rp-desc">{r.description}</span>
                              {/if}
                            </span>
                            {#if r.language}
                              <span class="rp-meta">{r.language}</span>
                            {/if}
                            <svg class="rp-go" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
                          </button>
                        </li>
                      {:else}
                        <li class="rp-empty">Sin resultados para “{repoQuery.trim()}”</li>
                      {/each}
                    </ul>
                  {:else}
                    <div class="rp-search">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                      <input
                        bind:value={fileQuery}
                        type="text"
                        placeholder="Buscar archivo… (README.md, src/index.js)"
                        aria-label="Buscar archivo del repositorio"
                      />
                      {#if fileQuery.trim()}
                        <span class="rp-count">{repoFilesFiltered.length}/{repoFiles.length}</span>
                      {/if}
                    </div>

                    {#if filesLoading}
                      <div class="rp-loading"><span class="spin" aria-hidden="true"></span>Leyendo archivos del repo…</div>
                    {:else if repoFiles.length === 0}
                      <div class="rp-empty">No pudimos leer los archivos de este repositorio.</div>
                    {:else}
                      <ul class="rp-list" aria-label="Archivos del repositorio">
                        <li>
                          <button type="button" class="rp-item rp-all" onclick={toggleAllRepoFiles} aria-pressed={allFilesPicked}>
                            <span class="rp-check" class:on={allFilesPicked} aria-hidden="true">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                            </span>
                            <span class="rp-txt"><span class="rp-name">{allFilesPicked ? 'Quitar todos' : 'Seleccionar todos'}</span></span>
                            <span class="rp-meta">{repoFiles.length}</span>
                          </button>
                        </li>
                        {#each repoFilesFiltered as f (f.path)}
                          <li>
                            <button
                              type="button"
                              class="rp-item"
                              class:selected={filePicks.includes(f.path)}
                              onclick={() => toggleRepoFile(f)}
                              aria-pressed={filePicks.includes(f.path)}
                            >
                              <span class="rp-check" class:on={filePicks.includes(f.path)} aria-hidden="true">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                              </span>
                              <span class="rp-txt">
                                <span class="rp-name">{f.name}</span>
                                {#if dirOf(f.path)}<span class="rp-desc">{dirOf(f.path)}</span>{/if}
                              </span>
                              {#if fileFetching === f.path}
                                <span class="spin" aria-hidden="true"></span>
                              {:else}
                                <span class="rp-meta">{humanSize(f.size)}</span>
                              {/if}
                            </button>
                          </li>
                        {:else}
                          <li class="rp-empty">Sin resultados para “{fileQuery.trim()}”</li>
                        {/each}
                      </ul>
                    {/if}
                  {/if}
                </div>
              {/if}
            </div>
            {#if ghUser}
              <p class="origen-note">Conectado como <strong>@{ghUser}</strong></p>
            {/if}
          {:else if ghConnected}
            <div class="connect-inline">
              <span>Sin repositorios públicos en {ghUser ? `@${ghUser}` : 'tu cuenta'}</span>
              <button type="button" class="connect-btn" onclick={() => loadGhRepos(true)} disabled={ghLoading}>
                {ghLoading ? 'Buscando…' : 'Volver a buscar'}
              </button>
            </div>
          {:else}
            <div class="connect-inline">
              <span>Conecta GitHub para elegir un repositorio</span>
              <button type="button" class="connect-btn" onclick={connectGithub} disabled={connecting}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/>
                </svg>
                {connecting ? 'Conectando…' : 'Conectar'}
              </button>
            </div>
          {/if}

          <!-- origen: LinkedIn -->
        {:else if evOrigen === 'linkedin'}
          {#if liConnected}
            <p class="origen-note">Conectado como <strong>{liName || 'LinkedIn'}</strong> · identidad verificada</p>
          {:else}
            <div class="connect-inline">
              <span>Verifica tu identidad con LinkedIn</span>
              <button type="button" class="connect-btn" onclick={connectLinkedin} disabled={liConnecting}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
                </svg>
                {liConnecting ? 'Conectando…' : 'Conectar'}
              </button>
            </div>
          {/if}
          <label class="field">
            <span>Enlace de tu publicación</span>
            <input bind:value={evEnlace} placeholder="https://www.linkedin.com/posts/…" inputmode="url" />
          </label>
          <label class="field">
            <span>Título</span>
            <input bind:value={evTitulo} required placeholder="Ej. Certificación en UX Design" />
          </label>

          <!-- origen: manual -->
        {:else}
          <label class="field">
            <span>Enlace (opcional)</span>
            <input bind:value={evEnlace} placeholder="https://…" />
          </label>
        {/if}

        {#if evOrigen !== 'linkedin'}
          <label class="field">
            <span>Título</span>
            <input bind:value={evTitulo} required placeholder="Ej. App de gestión de tareas" />
          </label>
        {/if}

          <div class="grid-2">
            <label class="field">
              <span>Tipo</span>
              <select bind:value={evTipo}>
                <option value="proyecto">Proyecto</option>
                <option value="certificacion">Certificación</option>
                <option value="logro">Logro</option>
                <option value="portafolio">Portafolio</option>
              </select>
            </label>
            <div class="field">
              <span>Archivo <em class="opt">{evFilesFrom === 'github' ? '(desde GitHub)' : '(opcional)'}</em></span>
              <div class="file-row">
                <button type="button" class="file-btn" onclick={pickEvFile}>
                  {#if filePicks.length === 1}
                    📎 {filePicks[0].split('/').pop()}
                  {:else if filePicks.length > 1}
                    📎 {filePicks.length} archivos
                  {:else if evFiles.length === 1}
                    📎 {evFiles[0].name}
                  {:else if evFiles.length > 1}
                    📎 {evFiles.length} archivos
                  {:else}
                    Elegir archivo…
                  {/if}
                </button>
                {#if evFiles.length || filePicks.length}
                  <button type="button" class="file-clear" onclick={clearEvFile} aria-label="Quitar archivo" title="Quitar archivo">✕</button>
                {/if}
              </div>
              {#if evFilesFrom === 'github' && filePicks.length}
                <em class="file-from">{repoPick} · {filePicks.slice(0, 2).join(', ')}{filePicks.length > 2 ? ` +${filePicks.length - 2}` : ''}</em>
              {:else if evFilesFrom === 'github' && evFiles.length}
                <em class="file-from">{repoPick}</em>
              {/if}
              <input bind:this={evFileInput} type="file" hidden onchange={onEvFile} />
            </div>
          </div>

          <label class="field">
            <span>Descripción</span>
            <textarea bind:value={evDescripcion} rows="3" placeholder="Qué hiciste, con qué tecnologías, qué lograste…"></textarea>
          </label>
        </div>

        <div class="actions">
          <button type="button" class="btn-back" onclick={goBack} aria-label="Volver">←</button>
          <button type="button" class="btn-go" onclick={nextFromEvidencia} disabled={busy || !evTitulo.trim()}>
            {busy ? busyLabel || 'Creando…' : 'Continuar'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </section>

      <!-- paso 3: huella -->
    {:else if step === 3}
      <section class="pane pane-center" aria-label="Huella digital">
        <div class="big-ic" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <p class="pane-eyebrow"><span class="pe-dot" aria-hidden="true"></span>Huella SHA-256</p>
        <h2 class="pane-title">Huella digital SHA-256</h2>
        <p class="pane-lead pane-lead-c">
          Calcularemos una firma única e irreversible de tu evidencia. Demuestra que existió hoy.
          Es gratis, local y el primer sello de tu reputación.
        </p>

        {#if created.length > 1}
          <div class="ev-list ev-list-scroll">
            {#each created as ev (ev.id)}
              <div class="ev-row">
                <span class="ev-row-txt">
                  <span class="ev-row-name">{ev.titulo}</span>
                  <span class="ev-row-sub">{ev.tipo}</span>
                </span>
              </div>
            {/each}
          </div>
        {:else}
          <div class="quote">
            <p class="quote-title">“{created[0]?.titulo ?? ''}”</p>
            <p class="quote-meta">{created[0]?.tipo ?? ''}{created[0]?.file ? ` · ${created[0].file.name}` : ''}</p>
          </div>
        {/if}

        <div class="actions actions-center">
          <button type="button" class="btn-back" onclick={goBack} aria-label="Volver">←</button>
          <button type="button" class="btn-go" onclick={makeHash} disabled={busy}>
            {busy ? 'Calculando…' : created.length > 1 ? `Generar ${created.length} huellas SHA-256` : 'Generar huella SHA-256'}
          </button>
          <button type="button" class="btn-skip" onclick={finish}>Omitir</button>
        </div>
      </section>

      <!-- paso 4: blockchain -->
    {:else if allAnchored}
      <section class="pane pane-center" aria-label="Certificada">
        <div class="big-ic ok" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <p class="pane-eyebrow"><span class="pe-dot ok" aria-hidden="true"></span>Blockchain</p>
        <h2 class="pane-title">{created.length > 1 ? '¡Tus evidencias están certificadas!' : '¡Tu evidencia está certificada!'}</h2>
        <p class="pane-lead pane-lead-c">{created.length > 1 ? 'Quedaron registradas en Polygon Amoy. Cualquiera puede verificarlas con su huella.' : 'Quedó registrada en Polygon Amoy. Cualquiera puede verificarla con su huella.'}</p>
        {#if created.length > 1}
          <div class="ev-list ev-list-scroll">
            {#each created as ev (ev.id)}
              <div class="ev-row">
                <span class="ev-row-txt">
                  <span class="ev-row-name">{ev.titulo}</span>
                  <span class="ev-row-sub">tx {ev.tx.slice(0, 12)}…{ev.tx.slice(-6)}</span>
                </span>
                <svg class="ev-ok" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
            {/each}
          </div>
        {:else}
          <p class="tx">tx {created[0]?.tx.slice(0, 14)}…{created[0]?.tx.slice(-8)}</p>
        {/if}
        <div class="actions actions-center">
          <button type="button" class="btn-go" onclick={finish}>Ir a mi panel</button>
        </div>
      </section>
    {:else}
      <section class="pane pane-center" aria-label="Blockchain">
        <div class="big-ic" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </div>
        <p class="pane-eyebrow"><span class="pe-dot" aria-hidden="true"></span>Blockchain</p>
        <h2 class="pane-title">Sello en la blockchain</h2>
        <p class="pane-lead pane-lead-c">
          Registra la huella en <strong>Polygon Amoy</strong>. Tu wallet Pali firmará la transacción
          (paga unos centavos de POL de prueba).
        </p>

        {#if created.length > 1}
          <div class="ev-list ev-list-scroll" bind:this={certList}>
            {#each created as ev, i (ev.id)}
              <div class="ev-row">
                <span class="ev-row-txt">
                  <span class="ev-row-name">{ev.titulo}</span>
                  <span class="ev-row-sub hash">{hashShort(ev.hash)}</span>
                </span>
                {#if busy && i === certIdx}
                  <span class="spin" aria-hidden="true"></span>
                {:else if ev.tx}
                  <svg class="ev-ok" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                {:else if busy}
                  <span class="ev-dot" aria-hidden="true"></span>
                {/if}
              </div>
            {/each}
          </div>
          {#if !contractReady}
            <p class="warn">Contrato sin configurar. Puedes terminar más tarde desde Certificados.</p>
          {/if}
        {:else}
          <div class="quote">
            <p class="quote-title">Huella a registrar</p>
            <p class="hash">{hashShort(created[0]?.hash ?? '')}</p>
            {#if !contractReady}
              <p class="warn">Contrato sin configurar. Puedes terminar más tarde desde Certificados.</p>
            {/if}
          </div>
        {/if}

        <div class="actions actions-center">
          <button type="button" class="btn-back" onclick={goBack} aria-label="Volver">←</button>
          {#if contractReady}
            <button type="button" class="btn-go" onclick={certify} disabled={busy}>
              {busy ? (certIdx < 0 ? 'Confirma en tu wallet…' : created.length > 1 ? `Certificando ${certIdx + 1}/${created.length}…` : 'Certificando…') : created.length > 1 ? 'Certificar las evidencias' : 'Certificar en blockchain'}
            </button>
          {/if}
          <button type="button" class="btn-skip" onclick={finish}>Terminar más tarde</button>
        </div>
      </section>
    {/if}
      </div>
    </main>
  </div>
</div>

<style>
  /* ---- página completa ---- */
  .ob-page {
    position: fixed;
    inset: 0;
    z-index: 900;
    display: flex;
    flex-direction: column;
    background: #0b0b10;
    overflow: hidden; /* la página nunca tiene scroll: solo el área de contenido */
  }

  .ob-bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(46% 42% at 8% -8%, rgba(139, 92, 246, 0.12), transparent 60%),
      radial-gradient(50% 36% at 100% 104%, rgba(139, 92, 246, 0.05), transparent 60%);
  }

  /* filo de luz: 1px en el borde superior de la página */
  .ob-topline {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    z-index: 2;
    background: linear-gradient(90deg, transparent, rgba(196, 181, 253, 0.35), transparent);
  }

  /* ---- split: sidebar con el proceso + zona de formulario ---- */
  .ob-shell {
    position: relative;
    z-index: 1;
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
  }

  .ob-side {
    width: 272px;
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 26px;
    padding: 26px 22px 22px;
    border-right: 1px solid rgba(255, 255, 255, 0.055);
    background: linear-gradient(180deg, rgba(139, 92, 246, 0.055), rgba(139, 92, 246, 0.012) 38%, transparent 72%);
  }

  .ob-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: none;
  }

  /* la marca vive en una tesela, como un sello */
  .ob-logo {
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

  .ob-logo img {
    display: block;
  }

  .ob-brand-name {
    display: block;
    font-size: 1.02rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: #fff;
    line-height: 1.1;
  }

  .ob-brand-sub {
    display: block;
    margin-top: 3px;
    font-size: 0.72rem;
    color: #6e6e7a;
  }

  .ob-side-foot {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .ob-step-count {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.05em;
    color: #6e6e7a;
  }

  .ob-exit {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.03);
    color: #9b9ba6;
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 550;
    height: 34px;
    padding: 0 14px;
    border-radius: 999px;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  }

  .ob-exit:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.22);
    background: rgba(255, 255, 255, 0.06);
  }

  /* ---- cabecera y mini-progreso (solo móvil) ---- */
  .ob-mhead,
  .ob-mini {
    display: none;
  }

  .ob-main {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    padding: 20px clamp(20px, 4.5vw, 72px);
  }

  /* scroll solo como red de seguridad: en escritorio todo cabe */
  .ob-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.14) transparent;
  }

  .ob-body::-webkit-scrollbar {
    width: 8px;
  }

  .ob-body::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.14);
    border-radius: 999px;
  }

  /* ---- stepper vertical (sidebar) ---- */
  .stepper {
    list-style: none;
    margin: 0;
    padding: 6px 0 14px;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .st {
    flex: 1;
    display: flex;
    gap: 13px;
    min-height: 0;
  }

  .st-rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: none;
  }

  .st-dot {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    flex: none;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 255, 255, 0.12);
    background: #131318;
    color: #6e6e7a;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 700;
    transition: border-color 0.25s ease, background 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;
  }

  .st-line {
    width: 2px;
    flex: 1 1 0;
    min-height: 20px;
    margin: 5px 0;
    border-radius: 1px;
    background: rgba(255, 255, 255, 0.08);
    position: relative;
    overflow: hidden;
  }

  .st-line::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, #6ee7b7, rgba(110, 231, 183, 0.55));
    transform: scaleY(0);
    transform-origin: top;
    transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .st-line.fill::after {
    transform: scaleY(1);
  }

  .st-text {
    flex: 1;
    min-width: 0;
    padding-top: 5px;
  }

  .st-label {
    margin: 0;
    font-size: 0.84rem;
    font-weight: 650;
    color: #6e6e7a;
    transition: color 0.2s ease;
  }

  .st-desc {
    margin: 2px 0 0;
    font-size: 0.7rem;
    color: #4e4e5a;
    line-height: 1.35;
  }

  .st.now .st-dot {
    border-color: #a78bfa;
    background: rgba(139, 92, 246, 0.16);
    color: #e8e8ec;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.11);
  }

  .st.now .st-label {
    color: #e8e8ec;
  }

  .st.done .st-dot {
    border-color: rgba(110, 231, 183, 0.55);
    background: rgba(110, 231, 183, 0.14);
    color: #6ee7b7;
  }

  .st.done .st-label {
    color: #9b9ba6;
  }

  .st.done .st-desc {
    color: #4e4e5a;
  }

  /* ---- panel de contenido ---- */
  .pane {
    width: 100%;
    max-width: 580px;
    margin: auto 0; /* centrado vertical cuando cabe; sin recorte cuando no */
    display: flex;
    flex-direction: column;
    gap: 15px;
    animation: pane-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pane-center {
    align-items: center;
    text-align: center;
    max-width: 520px;
    padding-top: 12px;
  }

  .pane-ev {
    /* ocupa todo el alto disponible: cambiar de pestaña no la mueve y no hay scroll */
    height: 100%;
    min-height: 0;
  }

  /* la zona variable hace su propio scroll: tarjetas y acciones no se mueven */
  .ev-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-right: 4px;
    margin-right: -4px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.14) transparent;
  }

  .ev-scroll::-webkit-scrollbar {
    width: 8px;
  }

  .ev-scroll::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.14);
    border-radius: 999px;
  }

  @keyframes pane-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .pane-title {
    margin: 0;
    font-size: 1.6rem;
    font-weight: 700;
    letter-spacing: -0.028em;
    color: #fff;
  }

  /* micro-etiqueta de sección: ritmo editorial por paso */
  .pane-eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 8px;
    font-size: 0.68rem;
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #8a8a96;
  }

  .pane-center .pane-eyebrow {
    justify-content: center;
  }

  .pe-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #fcd34d;
    box-shadow: 0 0 7px rgba(252, 211, 77, 0.55);
    animation: pe-pulse 2.8s ease-in-out infinite;
  }

  .pe-dot.ok {
    background: #6ee7b7;
    box-shadow: 0 0 7px rgba(110, 231, 183, 0.55);
  }

  @keyframes pe-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }

  .pane-lead {
    margin: -8px 0 4px;
    font-size: 0.92rem;
    color: #8a8a96;
    line-height: 1.55;
    max-width: 52ch;
  }

  .pane-lead-c {
    margin: -8px auto 8px;
  }

  .big-ic {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    border-radius: 18px;
    border: 1px solid rgba(167, 139, 250, 0.28);
    background: rgba(139, 92, 246, 0.12);
    color: #a78bfa;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
    margin-bottom: 4px;
  }

  .big-ic.ok {
    border-color: rgba(110, 231, 183, 0.3);
    background: rgba(110, 231, 183, 0.12);
    color: #6ee7b7;
  }

  /* ---- foto ---- */
  .fotos {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.02);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .av-wrap {
    position: relative;
    flex: none;
  }

  .av {
    display: block;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .av-fb {
    display: grid;
    place-items: center;
    font-size: 1.5rem;
    font-weight: 650;
    color: #e8e8ec;
    background: #232328;
  }

  .av-btn {
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid #0b0b10;
    background: #fff;
    color: #0c0c10;
    font-size: 1rem;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    display: grid;
    place-items: center;
  }

  .av-btn:hover {
    opacity: 0.88;
  }

  .fotos-title {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 650;
    color: #fff;
  }

  .fotos-hint {
    margin: 3px 0 0;
    font-size: 0.76rem;
    color: #6e6e7a;
  }

  /* ---- campos ---- */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .field > span {
    font-size: 0.8rem;
    font-weight: 550;
    color: #b8b8c2;
  }

  .pane input,
  .pane textarea,
  .pane select {
    width: 100%;
    min-height: 44px;
    padding: 0 14px;
    background: #121217;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #fff;
    font-family: inherit;
    font-size: 0.92rem;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .pane textarea {
    padding: 12px 14px;
    min-height: 84px;
    resize: none;
    line-height: 1.5;
  }

  .pane input:hover,
  .pane textarea:hover,
  .pane select:hover {
    border-color: rgba(255, 255, 255, 0.18);
  }

  .pane input:focus,
  .pane textarea:focus,
  .pane select:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.35);
    background: #16161c;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.06);
  }

  .pane input::placeholder,
  .pane textarea::placeholder {
    color: #5c5c68;
  }

  .section-tag {
    margin: 4px 0 -4px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #8a8a96;
  }

  .section-tag em {
    font-style: normal;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
    color: #5c5c68;
  }

  /* botón de archivo + quitar, en la misma línea */
  .file-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .file-row .file-btn {
    flex: 1;
    min-width: 0;
  }

  .file-clear {
    flex: none;
    width: 34px;
    height: 34px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.03);
    color: #9b9ba6;
    font-size: 0.78rem;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;
  }

  .file-clear:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.26);
  }

  /* ruta del archivo traído de GitHub */
  .file-from {
    margin-top: 1px;
    font-family: var(--font-mono);
    font-size: 0.62rem;
    font-style: normal;
    color: #6ee7b7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px dashed rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.03);
    color: #c9c5d6;
    font-family: inherit;
    font-size: 0.86rem;
    cursor: pointer;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-btn:hover {
    border-color: rgba(255, 255, 255, 0.32);
    color: #fff;
  }

  /* ---- enlace con botón "Conectar" (GitHub) ---- */
  .link-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .connect-btn {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    text-align: center;
    min-height: 44px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.05);
    color: #e8e8ec;
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .connect-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.32);
  }

  .connect-btn:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .connect-btn.wide {
    flex: 1;
    width: 100%;
  }

  .gh-ok {
    flex: 1;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px solid rgba(110, 231, 183, 0.35);
    background: rgba(110, 231, 183, 0.08);
    color: #6ee7b7;
    font-size: 0.82rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gh-ok strong {
    font-family: var(--font-mono);
    font-weight: 650;
  }

  .li-ok {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px solid rgba(110, 231, 183, 0.35);
    background: rgba(110, 231, 183, 0.08);
    color: #6ee7b7;
    font-size: 0.82rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .connect-btn.ghost {
    min-width: 44px;
    padding: 0;
    color: #8a8a96;
  }

  .connect-btn.ghost:hover:not(:disabled) {
    color: #e8e8ec;
    border-color: rgba(255, 255, 255, 0.32);
    background: rgba(255, 255, 255, 0.09);
  }

  /* label con ícono de red */
  .field-label {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 0.8rem;
    font-weight: 550;
    color: #b8b8c2;
  }

  .net-ic {
    color: #8a8a96;
    flex: none;
  }

  .opt {
    font-style: normal;
    font-weight: 500;
    color: #5c5c68;
    text-transform: none;
    letter-spacing: 0;
  }

  .req {
    font-style: normal;
    font-weight: 500;
    color: #fcd34d;
    margin-left: 1px;
  }

  /* ---- selector de origen (paso 2) ---- */
  .origen {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    width: 100%;
  }

  .origen-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 14px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.09);
    background: rgba(255, 255, 255, 0.025);
    color: #9b9ba6;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
  }

  .origen-card:hover {
    border-color: rgba(255, 255, 255, 0.22);
    background: rgba(255, 255, 255, 0.05);
    color: #d8d8de;
  }

  .origen-card.sel {
    border-color: rgba(167, 139, 250, 0.5);
    background: rgba(139, 92, 246, 0.11);
    color: #e8e8ec;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .origen-name {
    font-size: 0.9rem;
    font-weight: 650;
    color: #fff;
  }

  .origen-desc {
    font-size: 0.72rem;
    color: #6e6e7a;
    line-height: 1.35;
  }

  .origen-card.sel .origen-desc {
    color: #a798c9;
  }

  .origen-note {
    margin: -4px 0 0;
    font-size: 0.78rem;
    color: #6ee7b7;
  }

  .origen-note strong {
    font-family: var(--font-mono);
    font-weight: 650;
  }

  /* ---- selector de repos: dropdown propio con buscador ---- */
  .repo-pick {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .rp-label {
    font-size: 0.8rem;
    font-weight: 550;
    color: #b8b8c2;
  }

  .repo-trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 54px;
    padding: 0 14px;
    background: #121217;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 13px;
    color: #fff;
    font-family: inherit;
    font-size: 0.9rem;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .repo-trigger:hover {
    border-color: rgba(255, 255, 255, 0.18);
  }

  .repo-trigger:focus-visible {
    outline: none;
    border-color: rgba(255, 255, 255, 0.35);
    background: #16161c;
  }

  .rt-ic,
  .rt-chev {
    flex: none;
    color: #6e6e7a;
  }

  .rt-txt {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }

  .rt-name {
    font-size: 0.9rem;
    font-weight: 620;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rt-owner {
    margin-top: 2px;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    color: #6e6e7a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rt-meta {
    flex: none;
    font-family: var(--font-mono);
    font-size: 0.64rem;
    color: #6e6e7a;
    white-space: nowrap;
  }

  .rt-ph {
    flex: 1;
    text-align: left;
    color: #5c5c68;
    font-size: 0.9rem;
  }

  .rt-chev {
    transition: transform 0.2s ease;
  }

  .rt-chev.open {
    transform: rotate(180deg);
  }

  /* overlay anclado al trigger: no recorta el scroll ni cambia la altura del paso */
  .repo-panel {
    position: fixed;
    z-index: 60;
    padding: 10px;
    background: #17171f;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 16px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    transform-origin: top;
    animation: rp-in 0.16s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* cabecera del panel: repos ⇄ archivos */
  .rp-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 4px 9px;
  }

  .rp-back {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: none;
    height: 28px;
    padding: 0 10px 0 7px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    color: #b8b8c2;
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  }

  .rp-back:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.26);
    background: rgba(255, 255, 255, 0.07);
  }

  .rp-head-txt {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }

  .rp-head-txt strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.78rem;
    font-weight: 620;
    color: #e8e8ec;
  }

  .rp-head-txt em {
    flex: none;
    font-family: var(--font-mono);
    font-style: normal;
    font-size: 0.6rem;
    letter-spacing: 0.02em;
    color: #6e6e7a;
  }

  @keyframes rp-in {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.99);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .rp-search {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 10px;
    margin-bottom: 6px;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 10px;
    background: #0f0f15;
    color: #6e6e7a;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  /* el foco se marca en el contenedor, no en el input (evita la doble caja) */
  .rp-search:focus-within {
    border-color: rgba(255, 255, 255, 0.24);
    background: #12121a;
  }

  /*
   * El panel es overlay dentro de .pane, así que sin esto el input hereda las
   * reglas de formulario (.pane input): min-height 44px, padding 14px,
   * background #121217 y el box-shadow de foco → "input mal formado".
   */
  .pane .repo-panel input,
  .pane .repo-panel input:hover,
  .pane .repo-panel input:focus {
    min-height: 0;
    height: 100%;
    width: auto;
    flex: 1;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    color: #fff;
    font-size: 0.8rem;
    outline: none;
  }

  .rp-search input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: none;
    background: transparent;
    color: #fff;
    font-family: inherit;
    font-size: 0.8rem;
    outline: none;
  }

  .rp-search input::placeholder {
    color: #5c5c68;
  }

  .rp-count {
    flex: none;
    font-family: var(--font-mono);
    font-size: 0.62rem;
    color: #6e6e7a;
    white-space: nowrap;
  }

  .rp-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 208px;
    overflow-y: auto;
    overscroll-behavior: contain;
    /* sin barra visible: el corte inferior hace de indicador */
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .rp-list::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .rp-item {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 8px 9px;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: inherit;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease;
  }

  .rp-item:hover {
    background: rgba(255, 255, 255, 0.045);
  }

  /* selección neutra: nada de barras de color a los costados */
  .rp-item.selected {
    background: rgba(255, 255, 255, 0.08);
  }

  .rp-item.selected .rp-name {
    color: #fff;
  }

  /* ficha neutra del repo (icono) */
  .rp-ic {
    display: grid;
    place-items: center;
    flex: none;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.055);
    color: #8a8a96;
    transition: background 0.12s ease, color 0.12s ease;
  }

  .rp-item:hover .rp-ic {
    background: rgba(255, 255, 255, 0.09);
    color: #cfcfd6;
  }

  .rp-item.selected .rp-ic {
    background: rgba(255, 255, 255, 0.13);
    color: #fff;
  }

  .rp-item:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  /* "privado" junto al nombre del repo */
  .rp-tag {
    margin-left: 6px;
    padding: 1px 5px;
    border: 1px solid rgba(217, 192, 106, 0.35);
    border-radius: 999px;
    font-family: var(--font-mono);
    font-size: 0.55rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: #d9c06a;
    vertical-align: 1px;
  }

  .rp-tag-ok {
    border-color: rgba(255, 255, 255, 0.28);
    background: rgba(255, 255, 255, 0.07);
    color: #dcdce2;
  }

  /* flecha: "entrar a este repo" */
  .rp-go {
    flex: none;
    color: #5c5c68;
    transition: color 0.15s ease, transform 0.15s ease;
  }

  .rp-item:hover .rp-go {
    color: #b8b8c2;
    transform: translateX(2px);
  }

  .rp-loading {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 16px 10px;
    font-size: 0.8rem;
    color: #8a8a96;
  }

  /* casilla de selección de archivos (se pueden adjuntar varios) */
  .rp-check {
    display: grid;
    place-items: center;
    flex: none;
    width: 16px;
    height: 16px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.03);
    color: transparent;
    transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
  }

  .rp-check.on {
    border-color: #e8e8ec;
    background: #e8e8ec;
    color: #14141b;
  }

  /* fila "Seleccionar todos", separada del resto de archivos */
  .rp-item.rp-all {
    margin-bottom: 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }

  .rp-item.rp-all .rp-name {
    font-weight: 560;
  }

  .rp-txt {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .rp-name {
    font-size: 0.84rem;
    font-weight: 600;
    color: #e8e8ec;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rp-desc {
    font-size: 0.7rem;
    color: #8a8a96;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rp-meta {
    flex: none;
    font-family: var(--font-mono);
    font-size: 0.62rem;
    color: #6e6e7a;
    white-space: nowrap;
  }

  .rp-empty {
    padding: 18px 10px;
    border-radius: 9px;
    text-align: center;
    font-size: 0.8rem;
    color: #6e6e7a;
  }

  /* ---- listas de evidencias (multi-repo) ---- */
  .ev-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 4px 0;
    text-align: left;
  }

  .ev-list-scroll {
    max-height: 218px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.14) transparent;
  }

  .ev-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    background: #121218;
  }

  .ev-row-txt {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .ev-row-name {
    font-size: 0.86rem;
    font-weight: 620;
    color: #ececf1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ev-row-sub {
    font-size: 0.72rem;
    color: #8a8a96;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ev-ok {
    flex: none;
    color: #6ee7b7;
  }

  .ev-dot {
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.16);
  }

  /* conectar (GitHub / LinkedIn): una sola fila, el botón nunca salta abajo */
  .connect-inline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px 8px 12px;
    border: 1px dashed rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.02);
    color: #9b9ba6;
    font-size: 0.8rem;
  }

  .connect-inline > span {
    flex: 1;
    min-width: 0;
  }

  .connect-inline .connect-btn {
    min-height: 34px;
    padding: 0 12px;
    border-radius: 9px;
    font-size: 0.78rem;
  }

  .repo-loading {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.02);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    font-size: 0.85rem;
    color: #8a8a96;
  }

  .spin {
    width: 16px;
    height: 16px;
    flex: none;
    border: 2px solid rgba(255, 255, 255, 0.18);
    border-top-color: #a78bfa;
    border-radius: 50%;
    animation: ob-spin 0.8s linear infinite;
  }

  @keyframes ob-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spin {
      animation: none;
    }

    .repo-panel {
      animation: none;
    }
  }

  /* ---- quote / hash ---- */
  .quote {
    width: 100%;
    padding: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.02);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    text-align: left;
  }

  .quote-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 650;
    color: #fff;
  }

  .quote-meta {
    margin: 4px 0 0;
    font-size: 0.78rem;
    color: #6e6e7a;
    text-transform: capitalize;
  }

  .hash {
    margin: 8px 0 0;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: #6ee7b7;
    word-break: break-all;
  }

  .warn {
    margin: 10px 0 0;
    font-size: 0.78rem;
    color: #fb7185;
  }

  .tx {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: #8a8a96;
  }

  /* ---- acciones ---- */
  .actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    width: 100%;
  }

  .actions-center {
    justify-content: center;
  }

  .btn-go {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 46px;
    padding: 0 22px;
    border: none;
    border-radius: 12px;
    background: #fff;
    color: #0c0c10;
    font-family: inherit;
    font-size: 0.92rem;
    font-weight: 650;
    cursor: pointer;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.45),
      0 12px 28px -14px rgba(0, 0, 0, 0.8);
    transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.2s ease;
  }

  .btn-go:hover:not(:disabled) {
    background: #f0f0f4;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.45),
      0 14px 32px -14px rgba(0, 0, 0, 0.9);
  }

  .btn-go:active:not(:disabled) {
    transform: scale(0.98);
  }

  .btn-go:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .btn-go:focus-visible {
    outline: 2px solid #e8e8ec;
    outline-offset: 2px;
  }

  .btn-back {
    width: 46px;
    height: 46px;
    flex: none;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.03);
    color: #c9c5d6;
    font-size: 1rem;
    cursor: pointer;
  }

  .btn-back:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.25);
  }

  .btn-skip {
    margin-left: auto;
    border: none;
    background: none;
    color: #6e6e7a;
    font-family: inherit;
    font-size: 0.84rem;
    cursor: pointer;
    padding: 10px 4px;
  }

  .actions-center .btn-skip {
    margin-left: 0;
  }

  .btn-skip:hover {
    color: #b8b8c2;
    text-decoration: underline;
  }

  /* ---- foco visible coherente en todo el asistente ---- */
  .connect-btn:focus-visible,
  .file-btn:focus-visible,
  .origen-card:focus-visible,
  .repo-trigger:focus-visible,
  .btn-back:focus-visible,
  .btn-skip:focus-visible,
  .rp-item:focus-visible,
  .ob-exit:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.45);
    outline-offset: 2px;
  }

  /* ---- pantallas de altura media: comprimir vertical sin perder aire ---- */
  @media (max-height: 799px) {
    .ob-side {
      width: 252px;
      padding: 20px 20px 18px;
      gap: 20px;
    }

    .stepper {
      padding: 2px 0 8px;
    }

    .st-text {
      padding-top: 4px;
    }

    .ob-main {
      padding: 16px clamp(18px, 4vw, 56px);
    }

    .pane {
      gap: 12px;
    }

    .pane-title {
      font-size: 1.32rem;
    }

    .pane-lead {
      font-size: 0.85rem;
    }

    .big-ic {
      width: 54px;
      height: 54px;
      border-radius: 16px;
    }

    .pane textarea {
      min-height: 52px;
    }

    .fotos {
      padding: 12px 14px;
      gap: 14px;
    }

    .av {
      width: 62px;
      height: 62px;
    }

    .rp-list {
      max-height: 168px;
    }

    .actions {
      margin-top: 4px;
    }
  }

  /* ---- pantallas bajas: modo compacto real ---- */
  @media (max-height: 699px) {
    .ob-side {
      width: 224px;
      gap: 14px;
      padding: 16px 16px 14px;
    }

    .ob-brand-sub {
      display: none;
    }

    .stepper {
      padding: 0 0 6px;
    }

    .st {
      gap: 11px;
    }

    .st-dot {
      width: 26px;
      height: 26px;
      font-size: 0.7rem;
    }

    .st-label {
      font-size: 0.8rem;
    }

    .st-desc {
      font-size: 0.66rem;
    }

    .ob-main {
      padding: 12px clamp(16px, 3.5vw, 48px);
    }

    .pane {
      gap: 10px;
    }

    .pane-title {
      font-size: 1.22rem;
    }

    .pane-lead {
      font-size: 0.82rem;
      margin: -6px 0 2px;
    }

    /* pantallas muy bajas: el paso 2 no puede permitirse scroll */
    .pane-ev .pane-lead {
      display: none;
    }

    .ev-scroll {
      gap: 10px;
    }

    .connect-inline {
      padding: 6px 8px 6px 10px;
    }

    .big-ic {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      margin-bottom: 2px;
    }

    .pane textarea {
      min-height: 46px;
    }

    .pane input,
    .pane textarea,
    .pane select {
      min-height: 40px;
    }

    .btn-go,
    .btn-back {
      min-height: 42px;
      height: 42px;
    }

    .fotos {
      padding: 10px 12px;
    }

    .av {
      width: 54px;
      height: 54px;
    }

    .av-fb {
      font-size: 1.2rem;
    }

    .quote {
      padding: 12px 14px;
    }

    .rp-list {
      max-height: 140px;
    }
  }

  /* ---- móvil: sidebar fuera, cabecera + mini barra de progreso ---- */
  @media (max-width: 879px) {
    .ob-shell {
      flex-direction: column;
    }

    .ob-side {
      display: none;
    }

    .ob-mhead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px 10px;
      flex: none;
    }

    .ob-mini {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 18px 12px;
      flex: none;
    }

    .mini-label {
      font-size: 0.78rem;
      font-weight: 650;
      color: #b8b8c2;
      white-space: nowrap;
    }

    .mini-bar {
      flex: 1;
      display: flex;
      gap: 6px;
    }

    .mini-seg {
      height: 4px;
      flex: 1;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.1);
      transition: background 0.25s ease, box-shadow 0.25s ease;
    }

    .mini-seg.done {
      background: rgba(110, 231, 183, 0.45);
    }

    .mini-seg.now {
      background: #a78bfa;
    }

    .ob-main {
      padding: 10px 18px 0;
    }

    .pane {
      margin-top: 4px;
    }

    /* CTA siempre visible: barra pegada al fondo con fundido */
    .actions {
      position: sticky;
      bottom: 0;
      margin: 14px -18px 0;
      padding: 14px 18px 14px;
      background: linear-gradient(180deg, rgba(11, 11, 16, 0), #0b0b10 34%);
    }

    .grid-2 {
      grid-template-columns: 1fr;
    }

    .origen {
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .origen-card {
      align-items: center;
      text-align: center;
      padding: 12px 8px;
    }

    .origen-desc {
      display: none;
    }

    .rp-list {
      max-height: 280px;
    }

    .pane-title {
      font-size: 1.35rem;
    }
  }
</style>
