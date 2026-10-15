import { Router } from 'express'
import { query } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT uid, nombre, titulo, bio, links, updated_at FROM users WHERE uid = $1',
      [req.uid]
    )
    res.json(rows[0] || { uid: req.uid, nombre: '', titulo: '', bio: '', links: {} })
  } catch (e) {
    next(e)
  }
})

router.put('/', requireAuth, async (req, res, next) => {
  try {
    const { nombre = '', titulo = '', bio = '', links = {} } = req.body || {}
    const { rows } = await query(
      `INSERT INTO users (uid, nombre, titulo, bio, links, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (uid) DO UPDATE
         SET nombre = EXCLUDED.nombre, titulo = EXCLUDED.titulo,
             bio = EXCLUDED.bio, links = EXCLUDED.links, updated_at = now()
       RETURNING uid, nombre, titulo, bio, links, updated_at`,
      [req.uid, String(nombre), String(titulo), String(bio), JSON.stringify(links)]
    )
    res.json(rows[0])
  } catch (e) {
    next(e)
  }
})

export default router
