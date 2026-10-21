import { Router } from 'express'
import multer from 'multer'
import { query, withTransaction } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const MAX_FILES = 20 // por evidencia
const MAX_TOTAL = 40 * 1024 * 1024 // suma de todos los adjuntos de una evidencia

const LIST_COLS =
  'id, uid, tipo, titulo, descripcion, enlace, tags, fecha, file_name, mime, hash, cert_status, tx_hash, chain_id, certified_at, created_at'
/** Igual, pero con alias de tabla, para las consultas con subconsulta. */
const LIST_Q = LIST_COLS.split(', ').map((c) => `e.${c}`).join(', ')
/** Cuántos archivos adjuntos lleva la evidencia. */
const COUNT_Q =
  '(SELECT count(*) FROM evidencia_adjuntos a WHERE a.evidencia_id = e.id)::int AS file_count'

function sendFile(res, r) {
  res.setHeader('Content-Type', r.mime || 'application/octet-stream')
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(r.file_name)}"`)
  res.send(r.file_data)
}

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
      `SELECT ${LIST_Q}, ${COUNT_Q} FROM evidencias e WHERE e.uid = $1 ORDER BY e.created_at DESC`,
      [req.uid]
    )
    res.json(rows.map(rowToJson))
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, upload.array('file', MAX_FILES), async (req, res, next) => {
  try {
    const { tipo, titulo, descripcion = '', enlace = '', tags = '[]', fecha = null } = req.body
    if (!['proyecto', 'certificacion', 'logro', 'portafolio'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido' })
    }
    if (!titulo || !String(titulo).trim()) return res.status(400).json({ error: 'El título es obligatorio' })
    let tagsArr = []
    try { tagsArr = JSON.parse(tags) } catch { tagsArr = [] }

    const files = Array.isArray(req.files) ? req.files : []
    const total = files.reduce((a, f) => a + f.size, 0)
    if (total > MAX_TOTAL) {
      return res.status(413).json({ error: 'Los archivos suman más de 40 MB. Elige menos archivos.' })
    }

    // La evidencia y sus adjuntos se crean juntos: o todo o nada
    const creada = await withTransaction(async ({ query: q }) => {
      const first = files[0] || null
      const { rows } = await q(
        `INSERT INTO evidencias (uid, tipo, titulo, descripcion, enlace, tags, fecha, file_name, mime, file_data)
         VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7,'')::date,$8,$9,$10)
         RETURNING ${LIST_COLS}`,
        [
          req.uid, tipo, String(titulo).trim(), String(descripcion), String(enlace),
          JSON.stringify(tagsArr), fecha || '', first ? first.originalname : null,
          first ? first.mimetype : null, null,
        ]
      )
      const ev = rows[0]
      for (const f of files) {
        await q(
          `INSERT INTO evidencia_adjuntos (evidencia_id, file_name, mime, file_data)
           VALUES ($1, $2, $3, $4)`,
          [ev.id, f.originalname, f.mimetype, f.buffer]
        )
      }
      return ev
    })
    console.log(
      `[evidences] crear uid=${req.uid} archivos=${files.length}${files.length ? ` (${total}b)` : ''}`
    )
    res.status(201).json(rowToJson({ ...creada, file_count: files.length }))
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${LIST_Q}, ${COUNT_Q} FROM evidencias e WHERE e.id = $1 AND e.uid = $2`,
      [req.params.id, req.uid]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Evidencia no encontrada' })
    res.json(rowToJson(rows[0]))
  } catch (e) {
    next(e)
  }
})

router.put('/:id', requireAuth, upload.array('file', MAX_FILES), async (req, res, next) => {
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
    const files = Array.isArray(req.files) ? req.files : []
    const f = files[0] || null
    const total = files.reduce((a, x) => a + x.size, 0)
    if (total > MAX_TOTAL) {
      return res.status(413).json({ error: 'Los archivos suman más de 40 MB. Elige menos archivos.' })
    }
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
         certified_at = CASE WHEN $10 = 'onchain' THEN now() ELSE certified_at END,
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
        f ? f.originalname : null, f ? f.mimetype : null, null,
      ]
    )
    // La petición trae tx_hash → es un registro on-chain nuevo: va al historial.
    // El UNIQUE (evidencia_id, tx_hash) evita duplicar la misma tx.
    if (b.tx_hash) {
      await query(
        `INSERT INTO transacciones (uid, evidencia_id, tx_hash, chain_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (evidencia_id, tx_hash) DO NOTHING`,
        [req.uid, req.params.id, rows[0].tx_hash, rows[0].chain_id]
      )
    }
    // si llegaron archivos, se sustituyen los adjuntos por los nuevos
    if (files.length) {
      await withTransaction(async ({ query: q }) => {
        await q('DELETE FROM evidencia_adjuntos WHERE evidencia_id = $1', [req.params.id])
        for (const x of files) {
          await q(
            `INSERT INTO evidencia_adjuntos (evidencia_id, file_name, mime, file_data)
             VALUES ($1, $2, $3, $4)`,
            [req.params.id, x.originalname, x.mimetype, x.buffer]
          )
        }
      })
    }
    res.json(rowToJson({ ...rows[0], file_count: files.length }))
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

/** Primer archivo de la evidencia: adjunto nuevo o archivo legado único. */
router.get('/:id/file', requireAuth, async (req, res, next) => {
  try {
    const { rows: own } = await query(
      'SELECT id FROM evidencias WHERE id = $1 AND uid = $2',
      [req.params.id, req.uid]
    )
    if (!own[0]) return res.status(404).json({ error: 'Evidencia no encontrada' })

    const { rows } = await query(
      `SELECT id, file_name, mime, file_data FROM evidencia_adjuntos
       WHERE evidencia_id = $1 ORDER BY created_at ASC, file_name ASC LIMIT 1`,
      [req.params.id]
    )
    if (rows[0]) return sendFile(res, rows[0])

    const { rows: legacy } = await query(
      'SELECT file_name, mime, file_data FROM evidencias WHERE id = $1 AND uid = $2',
      [req.params.id, req.uid]
    )
    const r = legacy[0]
    if (!r || !r.file_data) return res.status(404).json({ error: 'Sin archivo' })
    sendFile(res, r)
  } catch (e) {
    next(e)
  }
})

/** Lista de adjuntos de una evidencia (nombre, tipo y peso; sin el contenido). */
router.get('/:id/adjuntos', requireAuth, async (req, res, next) => {
  try {
    const { rows: own } = await query(
      'SELECT id FROM evidencias WHERE id = $1 AND uid = $2',
      [req.params.id, req.uid]
    )
    if (!own[0]) return res.status(404).json({ error: 'Evidencia no encontrada' })

    const { rows } = await query(
      `SELECT a.id, a.file_name, a.mime, octet_length(a.file_data)::int AS size
       FROM evidencia_adjuntos a
       WHERE a.evidencia_id = $1
       ORDER BY a.created_at ASC, a.file_name ASC`,
      [req.params.id]
    )
    res.json(rows)
  } catch (e) {
    next(e)
  }
})

/** Descarga de un adjunto concreto de la evidencia. */
router.get('/:id/adjuntos/:attId', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT a.id, a.file_name, a.mime, a.file_data
       FROM evidencia_adjuntos a
       JOIN evidencias e ON e.id = a.evidencia_id
       WHERE a.id = $1 AND a.evidencia_id = $2 AND e.uid = $3`,
      [req.params.attId, req.params.id, req.uid]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Archivo no encontrado' })
    sendFile(res, rows[0])
  } catch (e) {
    next(e)
  }
})

export default router
