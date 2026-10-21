import { Router } from 'express'
import crypto from 'node:crypto'
import multer from 'multer'
import { query } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(Object.assign(new Error('Solo se permiten imágenes'), { status: 400 }))
  },
})

const COLS = 'uid, nombre, titulo, bio, foto, links, updated_at'

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT ${COLS} FROM users WHERE uid = $1`, [req.uid])
    if (rows[0]) return res.json(rows[0])
    const { rows: created } = await query(`INSERT INTO users (uid) VALUES ($1) RETURNING ${COLS}`, [req.uid])
    res.json(created[0])
  } catch (e) {
    next(e)
  }
})

router.put('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {}
    const { nombre = '', titulo = '', bio = '', links = {} } = body
    // La foto solo cambia vía POST /photo; aquí se preserva la existente.
    const { rows } = await query(
      `INSERT INTO users (uid, nombre, titulo, bio, links, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (uid) DO UPDATE
         SET nombre = EXCLUDED.nombre, titulo = EXCLUDED.titulo,
             bio = EXCLUDED.bio, links = EXCLUDED.links, updated_at = now()
       RETURNING ${COLS}`,
      [req.uid, String(nombre), String(titulo), String(bio), JSON.stringify(links)]
    )
    res.json(rows[0])
  } catch (e) {
    next(e)
  }
})

/** Sube (o reemplaza) la foto de perfil; se almacena en Postgres (bytea). */
router.post('/photo', requireAuth, upload.single('foto'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Falta el archivo (campo "foto")' })
    const { rows } = await query(
      `UPDATE users
         SET foto_data = $2, foto_mime = $3, foto = '/api/profile/photo', updated_at = now()
       WHERE uid = $1
       RETURNING uid, foto`,
      [req.uid, req.file.buffer, req.file.mimetype]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Perfil no encontrado' })
    res.json({ ok: true, foto: rows[0].foto })
  } catch (e) {
    next(e)
  }
})

/** Devuelve la foto subida del usuario autenticado (bytes crudos). */
router.get('/photo', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT foto_data, foto_mime FROM users WHERE uid = $1', [req.uid])
    const row = rows[0]
    if (!row?.foto_data) return res.status(404).json({ error: 'Sin foto personalizada' })
    res.set('Content-Type', row.foto_mime || 'image/png')
    res.set('Cache-Control', 'private, max-age=300')
    res.send(row.foto_data)
  } catch (e) {
    next(e)
  }
})

/* ---------------- GitHub (vinculado posterior al login con Google) ---------------- */

/** Guarda (o actualiza) la vinculación de GitHub: usuario + token de acceso. */
router.post('/github', requireAuth, async (req, res, next) => {
  try {
    const { username = '', access_token = '' } = req.body || {}
    if (!username) return res.status(400).json({ error: 'Falta el usuario de GitHub' })
    console.log(`[github] guardar uid=${req.uid} user=${username} token=${access_token ? 'sí' : 'NO (solo público)'}`)
    const { rows } = await query(
      `UPDATE users
         SET github_user = $2, github_token = $3, updated_at = now()
       WHERE uid = $1
       RETURNING github_user`,
      [req.uid, String(username), access_token ? String(access_token) : null]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Perfil no encontrado' })
    res.json({ ok: true, username: rows[0].github_user })
  } catch (e) {
    next(e)
  }
})

/** Estado de la conexión de GitHub (sin exponer el token). */
router.get('/github', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT github_user FROM users WHERE uid = $1', [req.uid])
    res.json({ username: rows[0]?.github_user || '', connected: Boolean(rows[0]?.github_user) })
  } catch (e) {
    next(e)
  }
})

/** Desvincula GitHub (borra usuario y token). */
router.delete('/github', requireAuth, async (req, res, next) => {
  try {
    await query("UPDATE users SET github_user = '', github_token = NULL, updated_at = now() WHERE uid = $1", [req.uid])
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

/** Cabeceras para la API de GitHub con el token guardado al vincular. */
async function githubAuth(uid) {
  const { rows } = await query('SELECT github_user, github_token FROM users WHERE uid = $1', [uid])
  const row = rows[0]
  if (!row?.github_user) return null
  return {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Aletheia',
      ...(row.github_token ? { Authorization: `Bearer ${row.github_token}` } : {}),
    },
  }
}

/** Tamaño máximo del archivo que se puede traer de GitHub (5 MB). */
const GH_FILE_MAX = 5 * 1024 * 1024

/** Trae los repositorios del usuario desde la API de GitHub usando el
 * token guardado al vincular. Si el token expiró, avisa con 401.
 */
router.get('/github/repos', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT github_user, github_token FROM users WHERE uid = $1', [req.uid])
    const row = rows[0]
    if (!row?.github_user) return res.status(400).json({ error: 'Conecta tu cuenta de GitHub primero' })

    const authHeader = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Aletheia',
      ...(row.github_token ? { Authorization: `Bearer ${row.github_token}` } : {}),
    }

    // 1) con token: repos propios (incluye privados); 2) sin token o token
    // caducado: repos públicos de la cuenta (basta para certificar).
    let ghRes = row.github_token
      ? await fetch('https://api.github.com/user/repos?per_page=30&sort=updated&affiliation=owner', {
          headers: authHeader,
        })
      : null

    if (ghRes && ghRes.status === 401) ghRes = null // token caducado → público
    if (!ghRes) {
      ghRes = await fetch(
        `https://api.github.com/users/${encodeURIComponent(row.github_user)}/repos?type=owner&sort=updated&per_page=30`,
        { headers: { Accept: authHeader.Accept, 'X-GitHub-Api-Version': authHeader['X-GitHub-Api-Version'], 'User-Agent': 'Aletheia' } }
      )
    }
    if (ghRes.status === 404) {
      return res.status(404).json({ error: 'No encontramos esa cuenta de GitHub.' })
    }
    if (!ghRes.ok) {
      return res.status(502).json({ error: 'GitHub no respondió. Inténtalo de nuevo.' })
    }
    const data = await ghRes.json()
    const list = (Array.isArray(data) ? data : []).map((r) => ({
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      html_url: r.html_url,
      language: r.language,
      stargazers_count: r.stargazers_count,
      fork: r.fork,
      private: r.private,
      updated_at: r.updated_at,
    }))
    console.log(
      `[github] repos uid=${req.uid} user=${row.github_user} token=${row.github_token ? 'sí' : 'NO'} → ${list.length}`
    )
    res.json(list)
  } catch (e) {
    next(e)
  }
})

/**
 * Árbol de archivos de un repositorio (rama por defecto). Se listan solo
 * blobs (archivos), aplanados por ruta, para elegir uno como contenido.
 */
router.get('/github/repos/:owner/:repo/tree', requireAuth, async (req, res, next) => {
  try {
    const auth = await githubAuth(req.uid)
    if (!auth) return res.status(400).json({ error: 'Conecta tu cuenta de GitHub primero' })

    const { owner, repo } = req.params
    const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`

    const infoRes = await fetch(base, { headers: auth.headers })
    if (infoRes.status === 404) return res.status(404).json({ error: 'No encontramos ese repositorio.' })
    if (!infoRes.ok) return res.status(502).json({ error: 'GitHub no respondió. Inténtalo de nuevo.' })
    const info = await infoRes.json()
    const branch = info.default_branch || 'main'

    const treeRes = await fetch(`${base}/git/trees/${encodeURIComponent(branch)}?recursive=1`, {
      headers: auth.headers,
    })
    if (!treeRes.ok) return res.status(502).json({ error: 'No se pudo leer el contenido del repositorio.' })
    const data = await treeRes.json()
    const LIMIT = 400
    const all = (Array.isArray(data.tree) ? data.tree : [])
      .filter((n) => n.type === 'blob')
      .map((n) => ({ path: n.path, name: n.path.split('/').pop(), size: n.size ?? 0 }))
    // primero lo que está en la raíz y los documentos típicos, luego el resto
    const peso = (f) => (f.path.includes('/') ? 1 : 0)
    all.sort((a, b) => peso(a) - peso(b) || a.path.localeCompare(b.path))
    res.json({ branch, total: all.length, truncated: all.length > LIMIT, files: all.slice(0, LIMIT) })
  } catch (e) {
    next(e)
  }
})

/**
 * Contenido crudo de un archivo del repositorio (base64), para adjuntarlo a la
 * evidencia como si se hubiera subido a mano.
 */
router.get('/github/repos/:owner/:repo/file', requireAuth, async (req, res, next) => {
  try {
    const auth = await githubAuth(req.uid)
    if (!auth) return res.status(400).json({ error: 'Conecta tu cuenta de GitHub primero' })

    const { owner, repo } = req.params
    const path = String(req.query.path || '').replace(/^\/+/, '')
    if (!path) return res.status(400).json({ error: 'Falta la ruta del archivo' })

    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`
    const ghRes = await fetch(url, { headers: { ...auth.headers, Accept: 'application/vnd.github.raw' } })
    if (ghRes.status === 404) return res.status(404).json({ error: 'No encontramos ese archivo.' })
    if (!ghRes.ok) return res.status(502).json({ error: 'GitHub no respondió. Inténtalo de nuevo.' })

    const buf = Buffer.from(await ghRes.arrayBuffer())
    if (buf.length > GH_FILE_MAX) {
      return res.status(413).json({ error: 'El archivo supera los 5 MB permitidos.' })
    }
    console.log(`[github] file uid=${req.uid} ${owner}/${repo}/${path} → ${buf.length}b`)
    res.json({ path, name: path.split('/').pop(), size: buf.length, base64: buf.toString('base64') })
  } catch (e) {
    next(e)
  }
})

/* ---------------- LinkedIn (Sign In with LinkedIn, OpenID Connect) ---------------- */
/**
 * El login es SOLO Google; LinkedIn se conecta después (igual que GitHub) para
 * verificar identidad: nombre, foto y correo del miembro. No lee publicaciones
 * (eso requiere convenio Community Management API con LinkedIn).
 *
 * Flujo: POST /linkedin/start → URL de autorización → popup →
 * GET /linkedin/callback (code → token → /v2/userinfo) → redirige al front
 * con ?li=ok, que avisa al opener por postMessage.
 */

const LI_ID = () => process.env.LINKEDIN_CLIENT_ID || ''
const LI_SECRET = () => process.env.LINKEDIN_CLIENT_SECRET || ''
const LI_REDIRECT = () =>
  process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/api/profile/linkedin/callback'

/** state → { uid, origin, expires } (TTL 10 min; una sola instancia de API) */
const liStates = new Map()

function allowedOrigin(raw) {
  try {
    const u = new URL(raw)
    if (u.origin !== raw) return false
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/** Estado de la conexión de LinkedIn (sin exponer nada sensible). */
router.get('/linkedin', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT linkedin_name, linkedin_picture FROM users WHERE uid = $1',
      [req.uid]
    )
    const r = rows[0]
    res.json({
      connected: Boolean(r?.linkedin_name),
      name: r?.linkedin_name || '',
      picture: r?.linkedin_picture || '',
    })
  } catch (e) {
    next(e)
  }
})

/** Genera el state y devuelve la URL de autorización de LinkedIn. */
router.post('/linkedin/start', requireAuth, async (req, res, next) => {
  try {
    if (!LI_ID() || !LI_SECRET()) {
      return res.status(503).json({
        error: 'LinkedIn no está configurado en el servidor (LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET).',
      })
    }
    const origin = String(req.body?.origin || '')
    if (!allowedOrigin(origin)) return res.status(400).json({ error: 'Origen no permitido' })

    const state = crypto.randomBytes(24).toString('hex')
    liStates.set(state, { uid: req.uid, origin, expires: Date.now() + 10 * 60 * 1000 })
    for (const [k, v] of liStates) if (v.expires < Date.now()) liStates.delete(k)

    const url =
      'https://www.linkedin.com/oauth/v2/authorization?' +
      new URLSearchParams({
        response_type: 'code',
        client_id: LI_ID(),
        redirect_uri: LI_REDIRECT(),
        scope: 'openid profile email',
        state,
      })
    res.json({ url })
  } catch (e) {
    next(e)
  }
})

/** Callback de LinkedIn (llega el popup, sin token): canjea code → userinfo. */
router.get('/linkedin/callback', async (req, res, next) => {
  const stateRaw = typeof req.query.state === 'string' ? req.query.state : ''
  const st = liStates.get(stateRaw)
  const back = (flag) => {
    const origin = st?.origin || process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(`${origin}/?li=${flag}`)
  }
  try {
    if (!st || st.expires < Date.now()) {
      liStates.delete(stateRaw)
      return back('expired')
    }
    liStates.delete(stateRaw)
    if (req.query.error) return back('error')
    const code = typeof req.query.code === 'string' ? req.query.code : ''
    if (!code) return back('error')

    const tokRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: LI_ID(),
        client_secret: LI_SECRET(),
        redirect_uri: LI_REDIRECT(),
      }),
    })
    if (!tokRes.ok) {
      console.log('[linkedin] accessToken fallo:', tokRes.status, (await tokRes.text()).slice(0, 300))
      return back('error')
    }
    const tok = await tokRes.json()

    const uiRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    })
    if (!uiRes.ok) {
      console.log('[linkedin] userinfo fallo:', uiRes.status, (await uiRes.text()).slice(0, 300))
      return back('error')
    }
    const ui = await uiRes.json()
    await query(
      `UPDATE users
          SET linkedin_sub = $2, linkedin_name = $3, linkedin_picture = $4, updated_at = now()
        WHERE uid = $1`,
      [st.uid, String(ui.sub || ''), String(ui.name || ''), String(ui.picture || '')]
    )
    console.log(`[linkedin] conectado uid=${st.uid} name=${ui.name || ''}`)
    back('ok')
  } catch (e) {
    console.error('[linkedin] callback:', e)
    back('error')
  }
})

/** Desvincula LinkedIn (borra sub/nombre/foto). */
router.delete('/linkedin', requireAuth, async (req, res, next) => {
  try {
    await query(
      `UPDATE users SET linkedin_sub = '', linkedin_name = '', linkedin_picture = '', updated_at = now()
        WHERE uid = $1`,
      [req.uid]
    )
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
