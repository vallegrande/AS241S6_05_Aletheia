/** client.ts — Cliente HTTP para la API de Aletheia (Express + Postgres). */
import { getIdToken } from '../stores/auth'

const BASE = '/api'

export type Profile = {
  uid: string
  nombre: string
  titulo: string
  bio: string
  foto: string
  links: Record<string, string>
  updated_at?: string
}

export type EvidenceTipo = 'proyecto' | 'certificacion' | 'logro' | 'portafolio'
export type CertStatus = 'pending' | 'hashed' | 'onchain'

export type Evidence = {
  id: string
  uid: string
  tipo: EvidenceTipo
  titulo: string
  descripcion: string
  enlace: string
  tags: string[]
  fecha: string | null
  file_name: string | null
  mime: string | null
  hash: string | null
  cert_status: CertStatus
  tx_hash: string | null
  chain_id: number | null
  created_at: string
  /** Fecha del registro on-chain (null si aún no está certificada). */
  certified_at: string | null
  has_file: boolean
  /** Archivos adjuntos de la evidencia (puede haber varios). */
  file_count?: number
}

export type VerifyResult =
  | { found: false }
  | {
      found: true
      evidence: {
        id: string
        tipo: EvidenceTipo
        titulo: string
        descripcion: string
        fecha: string | null
        hash: string
        cert_status: CertStatus
        tx_hash: string | null
        chain_id: number | null
        created_at: string
        file_name: string | null
      }
    }

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken()
  if (!token) throw new Error('Sesión requerida')
  return { Authorization: `Bearer ${token}` }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`)
  return body as T
}

/* ---------------- Perfil ---------------- */

export async function getProfile(): Promise<Profile> {
  const res = await fetch(`${BASE}/profile`, { headers: await authHeaders() })
  return handle<Profile>(res)
}

export async function saveProfile(p: Pick<Profile, 'nombre' | 'titulo' | 'bio' | 'links'>): Promise<Profile> {
  const res = await fetch(`${BASE}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(p),
  })
  return handle<Profile>(res)
}

/** Sube la foto de perfil al backend (Postgres). Devuelve la ruta guardada. */
export async function uploadProfilePhoto(file: File): Promise<{ foto: string }> {
  const fd = new FormData()
  fd.append('foto', file)
  const res = await fetch(`${BASE}/profile/photo`, { method: 'POST', headers: await authHeaders(), body: fd })
  return handle<{ foto: string }>(res)
}

/** Descarga la foto personalizada como object URL (requiere sesión). */
export async function fetchProfilePhotoUrl(): Promise<string | null> {
  const res = await fetch(`${BASE}/profile/photo`, { headers: await authHeaders() })
  if (!res.ok) return null
  return URL.createObjectURL(await res.blob())
}

/* ---------------- GitHub ---------------- */

export type GithubRepo = {
  name: string
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  fork: boolean
  private: boolean
  updated_at: string
}

/** Guarda la vinculación de GitHub (usuario + token de acceso). */
export async function connectGithub(username: string, accessToken: string | null): Promise<{ username: string }> {
  const res = await fetch(`${BASE}/profile/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ username, access_token: accessToken }),
  })
  return handle<{ username: string }>(res)
}

/** Estado de la conexión de GitHub. */
export async function getGithubState(): Promise<{ username: string; connected: boolean }> {
  const res = await fetch(`${BASE}/profile/github`, { headers: await authHeaders() })
  return handle<{ username: string; connected: boolean }>(res)
}

/** Desvincula GitHub en el backend (el deslinke de Firebase lo hace auth.ts). */
export async function disconnectGithub(): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/profile/github`, { method: 'DELETE', headers: await authHeaders() })
  return handle<{ ok: boolean }>(res)
}

/** Trae los repositorios de GitHub del usuario. */
export async function listGithubRepos(): Promise<GithubRepo[]> {
  const res = await fetch(`${BASE}/profile/github/repos`, { headers: await authHeaders() })
  return handle<GithubRepo[]>(res)
}

export type GithubRepoFile = { path: string; name: string; size: number }
export type GithubReposTree = { branch: string; total: number; truncated: boolean; files: GithubRepoFile[] }

/** Lista los archivos de un repositorio (rama por defecto). */
export async function listGithubRepoFiles(owner: string, repo: string): Promise<GithubReposTree> {
  const res = await fetch(
    `${BASE}/profile/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tree`,
    { headers: await authHeaders() },
  )
  return handle<GithubReposTree>(res)
}

export type GithubFilePayload = { path: string; name: string; size: number; base64: string }

/** Trae el contenido de un archivo del repositorio (base64) para adjuntarlo. */
export async function getGithubRepoFile(owner: string, repo: string, path: string): Promise<GithubFilePayload> {
  const url = `${BASE}/profile/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/file?path=${encodeURIComponent(path)}`
  const res = await fetch(url, { headers: await authHeaders() })
  return handle<GithubFilePayload>(res)
}

/* ---------------- LinkedIn ---------------- */

export type LinkedinState = { connected: boolean; name: string; picture: string }

/** Estado de la conexión de LinkedIn (identidad: nombre y foto). */
export async function getLinkedinState(): Promise<LinkedinState> {
  const res = await fetch(`${BASE}/profile/linkedin`, { headers: await authHeaders() })
  return handle<LinkedinState>(res)
}

/** Devuelve la URL de autorización de LinkedIn (para abrir el popup). */
export async function startLinkedinConnect(): Promise<{ url: string }> {
  const res = await fetch(`${BASE}/profile/linkedin/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ origin: window.location.origin }),
  })
  return handle<{ url: string }>(res)
}

/** Desvincula LinkedIn en el backend. */
export async function disconnectLinkedin(): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/profile/linkedin`, { method: 'DELETE', headers: await authHeaders() })
  return handle<{ ok: boolean }>(res)
}

/* ---------------- Evidencias ---------------- */

export async function listEvidences(): Promise<Evidence[]> {
  const res = await fetch(`${BASE}/evidences`, { headers: await authHeaders() })
  return handle<Evidence[]>(res)
}

export type EvidenceInput = {
  tipo: EvidenceTipo
  titulo: string
  descripcion?: string
  enlace?: string
  tags?: string[]
  fecha?: string | null
  /** Un solo archivo (formato antiguo). */
  file?: File | null
  /** Varios archivos adjuntos en la misma evidencia. */
  files?: File[]
}

export async function createEvidence(input: EvidenceInput): Promise<Evidence> {
  const fd = new FormData()
  fd.append('tipo', input.tipo)
  fd.append('titulo', input.titulo)
  fd.append('descripcion', input.descripcion ?? '')
  fd.append('enlace', input.enlace ?? '')
  fd.append('tags', JSON.stringify(input.tags ?? []))
  fd.append('fecha', input.fecha ?? '')
  if (input.file) fd.append('file', input.file)
  for (const f of input.files ?? []) fd.append('file', f)
  const res = await fetch(`${BASE}/evidences`, { method: 'POST', headers: await authHeaders(), body: fd })
  return handle<Evidence>(res)
}

export type EvidencePatch = Partial<Omit<EvidenceInput, 'file'>> & {
  file?: File | null
  hash?: string | null
  cert_status?: CertStatus
  tx_hash?: string | null
  chain_id?: number | null
}

export async function updateEvidence(id: string, patch: EvidencePatch): Promise<Evidence> {
  const fd = new FormData()
  if (patch.tipo !== undefined) fd.append('tipo', patch.tipo)
  if (patch.titulo !== undefined) fd.append('titulo', patch.titulo)
  if (patch.descripcion !== undefined) fd.append('descripcion', patch.descripcion)
  if (patch.enlace !== undefined) fd.append('enlace', patch.enlace)
  if (patch.tags !== undefined) fd.append('tags', JSON.stringify(patch.tags))
  if (patch.fecha !== undefined) fd.append('fecha', patch.fecha ?? '')
  if (patch.hash !== undefined && patch.hash !== null) fd.append('hash', patch.hash)
  if (patch.cert_status !== undefined) fd.append('cert_status', patch.cert_status)
  if (patch.tx_hash !== undefined && patch.tx_hash !== null) fd.append('tx_hash', patch.tx_hash)
  if (patch.chain_id !== undefined && patch.chain_id !== null) fd.append('chain_id', String(patch.chain_id))
  if (patch.file) fd.append('file', patch.file)
  const res = await fetch(`${BASE}/evidences/${id}`, { method: 'PUT', headers: await authHeaders(), body: fd })
  return handle<Evidence>(res)
}

export async function deleteEvidence(id: string): Promise<void> {
  const res = await fetch(`${BASE}/evidences/${id}`, { method: 'DELETE', headers: await authHeaders() })
  await handle<void>(res)
}

export function evidenceFileUrl(id: string): string {
  return `${BASE}/evidences/${id}/file`
}

export function evidenceAttachmentUrl(id: string, attId: string): string {
  return `${BASE}/evidences/${id}/adjuntos/${attId}`
}

export type EvidenceAttachment = {
  id: string
  file_name: string
  mime: string | null
  size: number
}

/** Adjuntos de una evidencia (nombre y peso, sin el contenido). */
export async function listEvidenceAttachments(id: string): Promise<EvidenceAttachment[]> {
  const res = await fetch(`${BASE}/evidences/${id}/adjuntos`, { headers: await authHeaders() })
  return handle<EvidenceAttachment[]>(res)
}

/* ---------------- Transacciones ---------------- */

export type Transaction = {
  id: string
  evidencia_id: string
  tx_hash: string
  chain_id: number | null
  created_at: string
  titulo: string
  tipo: EvidenceTipo
  hash: string | null
  cert_status: CertStatus
}

/** Historial de registros on-chain del usuario (todas, incluidas re-certificaciones). */
export async function listTransactions(): Promise<Transaction[]> {
  const res = await fetch(`${BASE}/transactions`, { headers: await authHeaders() })
  return handle<Transaction[]>(res)
}

/* ---------------- Verificación pública ---------------- */

export async function verifyHash(hash: string): Promise<VerifyResult> {
  const res = await fetch(`${BASE}/verify/${encodeURIComponent(hash.trim())}`)
  return handle<VerifyResult>(res)
}
