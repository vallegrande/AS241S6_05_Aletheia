import express from 'express'
import profileRouter from './routes/profile.js'
import evidencesRouter from './routes/evidences.js'
import verifyRouter from './routes/verify.js'
import transactionsRouter from './routes/transactions.js'
import { query } from './db.js'

// Migración ligera para volúmenes ya existentes (init SQL solo corre en BD nueva).
await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS foto TEXT NOT NULL DEFAULT ''").catch(() => {})
await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_data BYTEA').catch(() => {})
await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_mime TEXT').catch(() => {})
await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS github_user TEXT NOT NULL DEFAULT ''").catch(() => {})
await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS github_token TEXT').catch(() => {})
await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_sub TEXT NOT NULL DEFAULT ''").catch(() => {})
await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_name TEXT NOT NULL DEFAULT ''").catch(() => {})
await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_picture TEXT NOT NULL DEFAULT ''").catch(() => {})
// Las URLs de Google guardadas antes ya no se usan: la foto se sube al backend.
await query("UPDATE users SET foto = '' WHERE foto LIKE 'http%'").catch(() => {})

// Migración ligera: una evidencia puede llevar varios archivos adjuntos
await query(`CREATE TABLE IF NOT EXISTS evidencia_adjuntos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidencia_id UUID NOT NULL REFERENCES evidencias(id) ON DELETE CASCADE,
  file_name    TEXT NOT NULL,
  mime         TEXT,
  file_data    BYTEA NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
)`).catch(() => {})
await query('CREATE INDEX IF NOT EXISTS idx_adjuntos_evidencia ON evidencia_adjuntos (evidencia_id)').catch(() => {})

// Migración ligera: historial de transacciones on-chain. Una fila por cada
// registro de huella en ProofRegistry (evidencias.tx_hash solo guarda la última).
await query('ALTER TABLE evidencias ADD COLUMN IF NOT EXISTS certified_at TIMESTAMPTZ').catch(() => {})
await query(`CREATE TABLE IF NOT EXISTS transacciones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid          TEXT NOT NULL,
  evidencia_id UUID NOT NULL REFERENCES evidencias(id) ON DELETE CASCADE,
  tx_hash      TEXT NOT NULL,
  chain_id     INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evidencia_id, tx_hash)
)`).catch(() => {})
await query('CREATE INDEX IF NOT EXISTS idx_transacciones_uid ON transacciones (uid)').catch(() => {})
// Backfill: evidencias certificadas antes de esta migración. La fecha real del
// registro on-chain no se guardaba, así que se aproxima con created_at.
await query(`UPDATE evidencias SET certified_at = created_at
  WHERE certified_at IS NULL AND tx_hash IS NOT NULL AND cert_status = 'onchain'`).catch(() => {})
await query(`INSERT INTO transacciones (uid, evidencia_id, tx_hash, chain_id, created_at)
  SELECT e.uid, e.id, e.tx_hash, e.chain_id, COALESCE(e.certified_at, e.created_at)
  FROM evidencias e
  WHERE e.tx_hash IS NOT NULL
  ON CONFLICT (evidencia_id, tx_hash) DO NOTHING`).catch(() => {})

const app = express()
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1')
    res.json({ ok: true })
  } catch {
    res.status(503).json({ ok: false })
  }
})

app.use('/api/profile', profileRouter)
app.use('/api/evidences', evidencesRouter)
app.use('/api/verify', verifyRouter)
app.use('/api/transactions', transactionsRouter)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Error interno' })
})

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`Aletheia API escuchando en :${port}`))
