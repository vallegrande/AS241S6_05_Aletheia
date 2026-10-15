import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

router.get('/:hash', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, tipo, titulo, descripcion, fecha, hash, cert_status, tx_hash, chain_id, created_at, file_name
       FROM evidencias WHERE lower(hash) = lower($1) LIMIT 1`,
      [req.params.hash]
    )
    if (!rows[0]) return res.json({ found: false })
    res.json({ found: true, evidence: rows[0] })
  } catch (e) {
    next(e)
  }
})

export default router
