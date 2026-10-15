const API_KEY = () => process.env.FIREBASE_API_KEY
const LOOKUP_URL = () => `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY()}`

/**
 * Valida el ID token de Firebase contra Identity Toolkit.
 * Devuelve { uid, email, displayName, photoUrl } del usuario.
 */
export async function verifyIdToken(idToken) {
  if (!API_KEY()) {
    const err = new Error('FIREBASE_API_KEY no configurada en el servidor')
    err.status = 500
    throw err
  }
  const res = await fetch(LOOKUP_URL(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  if (!res.ok) {
    const err = new Error('Token inválido o expirado')
    err.status = 401
    throw err
  }
  const data = await res.json()
  const u = data?.users?.[0]
  if (!u?.localId) {
    const err = new Error('Token inválido o expirado')
    err.status = 401
    throw err
  }
  return {
    uid: u.localId,
    email: u.email || null,
    displayName: u.displayName || null,
    photoUrl: u.photoUrl || null,
  }
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Falta token de autenticación' })
  verifyIdToken(token)
    .then((user) => {
      req.uid = user.uid
      req.authUser = user
      next()
    })
    .catch((e) => res.status(e.status || 500).json({ error: e.message }))
}
