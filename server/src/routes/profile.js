import { Router } from 'express'
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

export default router
