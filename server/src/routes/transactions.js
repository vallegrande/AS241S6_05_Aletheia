import { Router } from 'express'
import { query } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

/**
 * Historial de transacciones on-chain del usuario: una fila por cada registro
 * de huella en ProofRegistry, incluidas re-certificaciones de la misma evidencia.
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    // Filtro opcional por red actual conectada: ?chain_id=80002
    const chainId = Number(req.query.chain_id)
    const where = Number.isInteger(chainId) ? 'AND t.chain_id = $2' : ''
    const args = [req.uid]
    if (where) args.push(chainId)
    const { rows } = await query(
      `SELECT t.id, t.evidencia_id, t.tx_hash, t.chain_id, t.created_at,
              e.titulo, e.tipo, e.hash, e.cert_status
       FROM transacciones t
       JOIN evidencias e ON e.id = t.evidencia_id
       WHERE t.uid = $1 ${where}
       ORDER BY t.created_at DESC`,
      args
    )
    res.json(rows)
  } catch (e) {
    next(e)
  }
})

export default router
