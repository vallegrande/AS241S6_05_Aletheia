/** client.ts — Cliente HTTP para la API de Aletheia (Express + Postgres). */
import { getIdToken } from '../stores/auth'

const BASE = '/api'

export type Profile = {
  uid: string
  nombre: string
  titulo: string
  bio: string
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
  has_file: boolean
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
  file?: File | null
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

/* ---------------- Verificación pública ---------------- */

export async function verifyHash(hash: string): Promise<VerifyResult> {
  const res = await fetch(`${BASE}/verify/${encodeURIComponent(hash.trim())}`)
  return handle<VerifyResult>(res)
}
