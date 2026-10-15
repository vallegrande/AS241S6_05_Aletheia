/**
 * blockchain-errors.ts — códigos de error explícitos de la capa blockchain.
 *
 * Cada error conserva el detalle técnico (`technical`) para debugging y expone
 * un mensaje humano en español (`message`) para la UI. Nunca mostrar solo "Error".
 */

export const BCODES = Object.freeze({
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  CONNECTION_REJECTED: 'CONNECTION_REJECTED',
  TX_REJECTED: 'TX_REJECTED',
  PROVIDER_MISSING: 'PROVIDER_MISSING',
  NETWORK_UNSUPPORTED: 'NETWORK_UNSUPPORTED',
  NETWORK_SWITCH_REJECTED: 'NETWORK_SWITCH_REJECTED',
  NETWORK_ADD_FAILED: 'NETWORK_ADD_FAILED',
  REQUEST_PENDING: 'REQUEST_PENDING',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  ADDRESS_NETWORK_MISMATCH: 'ADDRESS_NETWORK_MISMATCH',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  RPC_DOWN: 'RPC_DOWN',
  TIMEOUT: 'TIMEOUT',
  TX_NOT_FOUND: 'TX_NOT_FOUND',
  TX_FAILED: 'TX_FAILED',
  TX_SEND_UNSUPPORTED: 'TX_SEND_UNSUPPORTED',
  UNKNOWN: 'UNKNOWN',
})

export type BCode = (typeof BCODES)[keyof typeof BCODES]

export class BlockchainError extends Error {
  code: BCode
  technical: string
  constructor(code: BCode, message: string, technical = '') {
    super(message)
    this.name = 'BlockchainError'
    this.code = code
    this.technical = technical || message
  }
}

const MESSAGES: Record<BCode, string> = {
  WALLET_NOT_CONNECTED: 'Conecta tu wallet para continuar.',
  CONNECTION_REJECTED: 'Conexión rechazada desde la wallet.',
  TX_REJECTED: 'La transacción fue rechazada desde la wallet.',
  PROVIDER_MISSING: 'Wallet no detectada en este navegador.',
  NETWORK_UNSUPPORTED: 'Red no soportada por esta operación.',
  NETWORK_SWITCH_REJECTED: 'Cambio de red rechazado desde la wallet.',
  NETWORK_ADD_FAILED: 'No se pudo agregar la red a la wallet.',
  REQUEST_PENDING: 'Hay una solicitud abierta en la wallet. Revísala y vuelve a intentar.',
  INVALID_ADDRESS: 'La dirección ingresada no es válida.',
  ADDRESS_NETWORK_MISMATCH: 'La dirección no corresponde al tipo de red seleccionada.',
  INVALID_AMOUNT: 'La cantidad ingresada no es válida.',
  INSUFFICIENT_FUNDS: 'Saldo insuficiente para esta operación.',
  RPC_DOWN: 'El nodo/API de la red no responde ahora mismo.',
  TIMEOUT: 'La consulta agotó el tiempo de espera. Inténtalo de nuevo.',
  TX_NOT_FOUND: 'No se encontró la transacción con ese hash en esta red.',
  TX_FAILED: 'La transacción falló en la red.',
  TX_SEND_UNSUPPORTED: 'El envío UTXO no está disponible desde esta DApp todavía.',
  UNKNOWN: 'Ocurrió un error inesperado. Revisa los datos e inténtalo de nuevo.',
}

/** Crea un BlockchainError con mensaje humano + detalle técnico preservado. */
export function bcError(code: BCode, technical = '', hint = ''): BlockchainError {
  const base = MESSAGES[code] ?? MESSAGES.UNKNOWN
  return new BlockchainError(code, hint ? `${base} ${hint}` : base, technical || base)
}

/** Traduce errores crudos (wallet/ethers/fetch) a BlockchainError. */
export function mapProviderError(err: unknown, fallback: BCode = BCODES.UNKNOWN): BlockchainError {
  if (err instanceof BlockchainError) return err
  const e = err as { code?: string | number; message?: string } | null
  const code = e?.code
  const msg = String(e?.message ?? err ?? '')

  if (code === 4001 || /user (rejected|denied|cancelled)|rejected.*request|action rejected/i.test(msg)) {
    return bcError(BCODES.TX_REJECTED, msg)
  }
  if (code === 4902) return bcError(BCODES.NETWORK_ADD_FAILED, msg)
  if (/unrecognized chain|unknown chain|unsupported network|no configurada/i.test(msg)) {
    return bcError(BCODES.NETWORK_UNSUPPORTED, msg)
  }
  if (/insufficient (funds|balance)|insufficient_funds/i.test(msg)) {
    return bcError(BCODES.INSUFFICIENT_FUNDS, msg)
  }
  if (/invalid address|bad address|invalid_arg.*address/i.test(msg)) {
    return bcError(BCODES.INVALID_ADDRESS, msg)
  }
  if (/timeout|timed out|exceeded.*time|abort/i.test(msg)) return bcError(BCODES.TIMEOUT, msg)
  if (/fetch failed|network request failed|failed to fetch|econnrefused|ENOTFOUND|server error|bad gateway|service unavailable| 5\d\d/i.test(msg)) {
    return bcError(BCODES.RPC_DOWN, msg)
  }
  // Códigos legacy del store wallet.ts → nuevos códigos explícitos.
  if (code === 'NO_WALLET') return bcError(BCODES.PROVIDER_MISSING, msg)
  if (code === 'NOT_CONNECTED') return bcError(BCODES.WALLET_NOT_CONNECTED, msg)
  if (code === 'USER_REJECTED' || code === 'USER_REJECTED_TX') return bcError(BCODES.TX_REJECTED, msg)
  if (code === 'INVALID_ADDRESS') return bcError(BCODES.INVALID_ADDRESS, msg)
  if (code === 'INVALID_AMOUNT') return bcError(BCODES.INVALID_AMOUNT, msg)
  if (code === 'INSUFFICIENT_FUNDS') return bcError(BCODES.INSUFFICIENT_FUNDS, msg)
  return bcError(fallback, msg)
}
