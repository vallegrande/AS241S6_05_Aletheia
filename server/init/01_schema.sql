CREATE TABLE IF NOT EXISTS users (
  uid        TEXT PRIMARY KEY,
  nombre     TEXT NOT NULL DEFAULT '',
  titulo     TEXT NOT NULL DEFAULT '',
  bio        TEXT NOT NULL DEFAULT '',
  links      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidencias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid         TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('proyecto', 'certificacion', 'logro', 'portafolio')),
  titulo      TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  enlace      TEXT NOT NULL DEFAULT '',
  tags        JSONB NOT NULL DEFAULT '[]'::jsonb,
  fecha       DATE,
  file_name   TEXT,
  mime        TEXT,
  file_data   BYTEA,
  hash        TEXT,
  cert_status TEXT NOT NULL DEFAULT 'pending' CHECK (cert_status IN ('pending', 'hashed', 'onchain')),
  tx_hash     TEXT,
  chain_id    INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidencias_uid ON evidencias (uid);
CREATE INDEX IF NOT EXISTS idx_evidencias_hash ON evidencias (hash);
