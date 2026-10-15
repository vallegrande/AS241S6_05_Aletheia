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
 * Huella de una evidencia: del archivo si existe; si no, de los metadatos
 * (tipo|titulo|descripcion|enlace|fecha) para que siempre haya algo que certificar.
 */
export async function evidenceFingerprint(ev: {
  tipo: string
  titulo: string
  descripcion?: string
  enlace?: string
  fecha?: string | null
  has_file?: boolean
  file?: Blob | null
}): Promise<string> {
  if (ev.file) return sha256Hex(ev.file)
  const meta = [ev.tipo, ev.titulo, ev.descripcion ?? '', ev.enlace ?? '', ev.fecha ?? ''].join('|')
  return sha256HexOfString(meta)
}
