import express from 'express'
import profileRouter from './routes/profile.js'
import evidencesRouter from './routes/evidences.js'
import verifyRouter from './routes/verify.js'
import { query } from './db.js'

// Migración ligera para volúmenes ya existentes (init SQL solo corre en BD nueva).
await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS foto TEXT NOT NULL DEFAULT \'\'').catch(() => {})

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

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Error interno' })
})

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`Aletheia API escuchando en :${port}`))
