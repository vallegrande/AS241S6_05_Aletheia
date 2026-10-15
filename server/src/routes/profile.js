import { Router } from 'express'
import { query } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT uid, nombre, titulo, bio, foto, links, updated_at FROM users WHERE uid = $1',
      [req.uid]
    )
    if (rows[0]) return res.json(rows[0])
    // Primera visita: crea la fila vacía y la devuelve (el cliente la
    // prellena con los datos de Google antes de guardar).
    const { rows: created } = await query(
      'INSERT INTO users (uid) VALUES ($1) RETURNING uid, nombre, titulo, bio, foto, links, updated_at',
      [req.uid]
    )
    res.json(created[0])
  } catch (e) {
    next(e)
  }
})

router.put('/', requireAuth, async (req, res, next) => {
  try {
    const { nombre = '', titulo = '', bio = '', foto = '', links = {} } = req.body || {}
    const { rows } = await query(
      `INSERT INTO users (uid, nombre, titulo, bio, foto, links, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (uid) DO UPDATE
         SET nombre = EXCLUDED.nombre, titulo = EXCLUDED.titulo,
             bio = EXCLUDED.bio, foto = EXCLUDED.foto,
             links = EXCLUDED.links, updated_at = now()
       RETURNING uid, nombre, titulo, bio, foto, links, updated_at`,
      [req.uid, String(nombre), String(titulo), String(bio), String(foto), JSON.stringify(links)]
    )
    res.json(rows[0])
  } catch (e) {
    next(e)
  }
})

export default router
