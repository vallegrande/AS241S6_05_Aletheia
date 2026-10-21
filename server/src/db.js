import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

export function query(text, params) {
  return pool.query(text, params)
}

/**
 * Ejecuta fn con un `query` que corre todo sobre la MISMA conexión, dentro de
 * una transacción. El pool reparte conexiones por consulta, así que BEGIN y
 * ROLLBACK con el `query` normal no sirven.
 */
export async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn({ query: (text, params) => client.query(text, params) })
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
}
