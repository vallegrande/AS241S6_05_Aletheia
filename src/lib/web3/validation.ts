/**
 * validation.ts — validaciones de addresses y montos por tipo de red.
 *
 *  - EVM  → checksum/hex 0x vía ethers.isAddress.
 *  - UTXO → base58 (P2PKH/P2SH, mainnet y testnet) + bech32 (bc1…/tb1…/bcrt1…).
 */
import { isAddress as isEvmAddress } from 'ethers'
import { BCODES, bcError } from './blockchain-errors'
import type { NetworkDef } from './networks'

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const BASE58_RE = new RegExp(`^[${BASE58}]{26,35}$`)
const BECH32_RE = /^(bc1|tb1|bcrt1)[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{11,71}$/i

export function isEvmAddressFormat(address: string): boolean {
  try {
    return isEvmAddress(address?.trim() ?? '')
  } catch {
    return false
  }
}

export function isUtxoAddressFormat(address: string): boolean {
  const a = (address ?? '').trim()
  if (!a || /\s/.test(a)) return false
  return BASE58_RE.test(a) || BECH32_RE.test(a)
}

/** ¿La address es compatible con la red indicada? (nunca EVM↔UTXO cruzado). */
export function isAddressCompatibleWithNetwork(address: string, net: NetworkDef): boolean {
  if (!address || !net) return false
  return net.kind === 'evm' ? isEvmAddressFormat(address) : isUtxoAddressFormat(address)
}

/** Lanza BlockchainError si la address no vale para la red. */
export function assertAddressForNetwork(address: string, net: NetworkDef, label = 'dirección'): void {
  const value = (address ?? '').trim()
  if (!value) throw bcError(BCODES.INVALID_ADDRESS, 'empty input', `Ingresa una ${label}.`)
  const looksEvm = isEvmAddressFormat(value)
  const looksUtxo = isUtxoAddressFormat(value)
  if (!looksEvm && !looksUtxo) throw bcError(BCODES.INVALID_ADDRESS, value)
  if (!isAddressCompatibleWithNetwork(value, net)) {
    throw bcError(
      BCODES.ADDRESS_NETWORK_MISMATCH,
      value,
      `Esa ${label} es ${looksEvm ? 'EVM (0x…)' : 'UTXO'} y la red «${net.label}» es ${net.kind.toUpperCase()}.`,
    )
  }
}

/** Valida un monto decimal en texto (sin parsear a float para no perder precisión). */
export function assertValidAmount(raw: string): string {
  const value = String(raw ?? '').trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(value)) throw bcError(BCODES.INVALID_AMOUNT, String(raw), 'Usa un número como 0.001.')
  const [int, dec = ''] = value.split('.')
  const normalized = `${int.replace(/^0+(?=\d)/, '')}.${dec}`.replace(/\.$/, '')
  const canonical = dec ? `${int.replace(/^0+(?=\d)/, '') || '0'}.${dec}` : int.replace(/^0+(?=\d)/, '') || '0'
  if (Number(canonical) <= 0) throw bcError(BCODES.INVALID_AMOUNT, String(raw), 'Debe ser mayor que cero.')
  if (dec.length > 18) throw bcError(BCODES.INVALID_AMOUNT, String(raw), 'Máximo 18 decimales.')
  return normalized === '.' ? '0' : canonical
}
