import { Router } from 'express'
import multer from 'multer'
import { query } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

const LIST_COLS =
  'id, uid, tipo, titulo, descripcion, enlace, tags, fecha, file_name, mime, hash, cert_status, tx_hash, chain_id, created_at'

function rowToJson(r) {
  let tags = r.tags
  if (typeof tags === 'string') {
    try { tags = JSON.parse(tags) } catch { tags = [] }
  }
  return { ...r, tags, has_file: !!(r.file_name) }
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${LIST_COLS} FROM evidencias WHERE uid = $1 ORDER BY created_at DESC`,
      [req.uid]
    )
    res.json(rows.map(rowToJson))
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const { tipo, titulo, descripcion = '', enlace = '', tags = '[]', fecha = null } = req.body
    if (!['proyecto', 'certificacion', 'logro', 'portafolio'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido' })
    }
    if (!titulo || !String(titulo).trim()) return res.status(400).json({ error: 'El título es obligatorio' })
    let tagsArr = []
    try { tagsArr = JSON.parse(tags) } catch { tagsArr = [] }
    const f = req.file
    const { rows } = await query(
      `INSERT INTO evidencias (uid, tipo, titulo, descripcion, enlace, tags, fecha, file_name, mime, file_data)
       VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7,'')::date,$8,$9,$10)
       RETURNING ${LIST_COLS}`,
      [
        req.uid, tipo, String(titulo).trim(), String(descripcion), String(enlace),
        JSON.stringify(tagsArr), fecha || '', f ? f.originalname : null,
        f ? f.mimetype : null, f ? f.buffer : null,
      ]
    )
    res.status(201).json(rowToJson(rows[0]))
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${LIST_COLS} FROM evidencias WHERE id = $1 AND uid = $2`,
      [req.params.id, req.uid]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Evidencia no encontrada' })
    res.json(rowToJson(rows[0]))
  } catch (e) {
    next(e)
  }
})

router.put('/:id', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const { rows: existing } = await query(
      'SELECT id FROM evidencias WHERE id = $1 AND uid = $2',
      [req.params.id, req.uid]
    )
    if (!existing[0]) return res.status(404).json({ error: 'Evidencia no encontrada' })

    const b = req.body || {}
    const tipo = b.tipo
    if (tipo && !['proyecto', 'certificacion', 'logro', 'portafolio'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido' })
    }
    let tagsArr
    if (b.tags !== undefined) {
      try { tagsArr = JSON.parse(b.tags) } catch { tagsArr = [] }
    }
    const f = req.file
    const { rows } = await query(
      `UPDATE evidencias SET
         tipo = COALESCE($3, tipo),
         titulo = COALESCE(NULLIF($4,''), titulo),
         descripcion = COALESCE($5, descripcion),
         enlace = COALESCE($6, enlace),
         tags = COALESCE($7, tags),
         fecha = COALESCE(NULLIF($8,'')::date, fecha),
         hash = COALESCE($9, hash),
         cert_status = COALESCE($10, cert_status),
         tx_hash = COALESCE($11, tx_hash),
         chain_id = COALESCE($12, chain_id),
         file_name = COALESCE($13, file_name),
         mime = COALESCE($14, mime),
         file_data = COALESCE($15, file_data)
       WHERE id = $1 AND uid = $2
       RETURNING ${LIST_COLS}`,
      [
        req.params.id, req.uid,
        tipo ?? null, b.titulo ?? '', b.descripcion ?? null, b.enlace ?? null,
        tagsArr !== undefined ? JSON.stringify(tagsArr) : null,
        b.fecha ?? '', b.hash ?? null, b.cert_status ?? null,
        b.tx_hash ?? null, b.chain_id != null ? Number(b.chain_id) : null,
        f ? f.originalname : null, f ? f.mimetype : null, f ? f.buffer : null,
      ]
    )
    res.json(rowToJson(rows[0]))
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM evidencias WHERE id = $1 AND uid = $2',
      [req.params.id, req.uid]
    )
    if (!rowCount) return res.status(404).json({ error: 'Evidencia no encontrada' })
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

router.get('/:id/file', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT file_name, mime, file_data FROM evidencias WHERE id = $1 AND uid = $2',
      [req.params.id, req.uid]
    )
    const r = rows[0]
    if (!r || !r.file_data) return res.status(404).json({ error: 'Sin archivo' })
    res.setHeader('Content-Type', r.mime || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(r.file_name)}"`)
    res.send(r.file_data)
  } catch (e) {
    next(e)
  }
})

export default router
