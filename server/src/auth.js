const API_KEY = () => process.env.FIREBASE_API_KEY
const VERIFY_URL = () => `https://securetoken.googleapis.com/v1/verify?key=${API_KEY()}`

export async function verifyIdToken(idToken) {
  if (!API_KEY()) {
    const err = new Error('FIREBASE_API_KEY no configurada en el servidor')
    err.status = 500
    throw err
  }
  const res = await fetch(VERIFY_URL(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ idToken }),
  })
  if (!res.ok) {
    const err = new Error('Token inválido o expirado')
    err.status = 401
    throw err
  }
  const data = await res.json()
  if (data.project_id && data.project_id !== 'aletheia-5fead') {
    const err = new Error('Token de otro proyecto Firebase')
    err.status = 401
    throw err
  }
  return { uid: data.user_id }
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Falta token de autenticación' })
  verifyIdToken(token)
    .then(({ uid }) => {
      req.uid = uid
      next()
    })
    .catch((e) => res.status(e.status || 500).json({ error: e.message }))
}
