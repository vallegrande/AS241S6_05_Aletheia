/** hash.ts — SHA-256 con WebCrypto para huellas de evidencias. */

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** SHA-256 en hex de un Blob (archivo). */
export async function sha256Hex(data: Blob | ArrayBuffer | Uint8Array): Promise<string> {
  let bytes: Uint8Array
  if (data instanceof Uint8Array) {
    bytes = new Uint8Array(data)
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data)
  } else {
    bytes = new Uint8Array(await data.arrayBuffer())
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource)
  return bufToHex(digest)
}

/** SHA-256 en hex de un texto (metadatos de la evidencia). */
export async function sha256HexOfString(text: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(text))
}

/**
 * Huella de una evidencia: de los archivos si existen; si no, de los metadatos
 * (tipo|titulo|descripcion|enlace|fecha) para que siempre haya algo que certificar.
 *
 * Con un solo archivo se conserva el cálculo antiguo (solo el contenido), así
 * las huellas ya emitidas siguen siendo válidas. Con varios, la huella cubre
 * metadatos + nombre y contenido de cada archivo, en orden.
 */
export async function evidenceFingerprint(ev: {
  tipo: string
  titulo: string
  descripcion?: string
  enlace?: string
  fecha?: string | null
  has_file?: boolean
  file?: Blob | null
  files?: File[]
}): Promise<string> {
  const meta = [ev.tipo, ev.titulo, ev.descripcion ?? '', ev.enlace ?? '', ev.fecha ?? ''].join('|')
  const files: Array<Blob & { name?: string }> = (ev.files ?? (ev.file ? [ev.file] : [])).filter(Boolean)
  if (files.length === 1) return sha256Hex(files[0])
  if (files.length === 0) return sha256HexOfString(meta)

  const enc = new TextEncoder()
  const parts: Uint8Array[] = [enc.encode(meta + '\n')]
  for (const f of files) {
    parts.push(enc.encode(`${f.name ?? 'archivo'}\n`))
    parts.push(new Uint8Array(await f.arrayBuffer()))
  }
  const total = parts.reduce((n, p) => n + p.length, 0)
  const bundle = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    bundle.set(p, offset)
    offset += p.length
  }
  return sha256Hex(bundle)
}
