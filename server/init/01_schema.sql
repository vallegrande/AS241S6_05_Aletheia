CREATE TABLE IF NOT EXISTS users (
  uid        TEXT PRIMARY KEY,
  nombre     TEXT NOT NULL DEFAULT '',
  titulo     TEXT NOT NULL DEFAULT '',
  bio        TEXT NOT NULL DEFAULT '',
  foto       TEXT NOT NULL DEFAULT '',
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
  certified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidencias_uid ON evidencias (uid);
CREATE INDEX IF NOT EXISTS idx_evidencias_hash ON evidencias (hash);

-- Adjuntos de una evidencia: una misma evidencia puede llevar varios archivos
-- (p. ej. todos los archivos de un repositorio de GitHub). La columna
-- evidencias.file_name / file_data sigue siendo el archivo único legado.
CREATE TABLE IF NOT EXISTS evidencia_adjuntos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidencia_id UUID NOT NULL REFERENCES evidencias(id) ON DELETE CASCADE,
  file_name    TEXT NOT NULL,
  mime         TEXT,
  file_data    BYTEA NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adjuntos_evidencia ON evidencia_adjuntos (evidencia_id);

-- Historial de transacciones on-chain: una fila por cada registro de huella
-- en ProofRegistry. Guarda todas (incluidas re-certificaciones), a diferencia
-- de evidencias.tx_hash, que solo conserva la última.
CREATE TABLE IF NOT EXISTS transacciones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid          TEXT NOT NULL,
  evidencia_id UUID NOT NULL REFERENCES evidencias(id) ON DELETE CASCADE,
  tx_hash      TEXT NOT NULL,
  chain_id     INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evidencia_id, tx_hash)
);

CREATE INDEX IF NOT EXISTS idx_transacciones_uid ON transacciones (uid);
