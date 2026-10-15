/**
 * txLedger.ts — registro de transacciones de la sesión.
 *
 * Store compartido entre el modal de envío (TransactionModal) y la tabla
 * de historial (Panel): todo hash que Pali publica entra aquí y su estado
 * se sincroniza (pending → confirmed | reverted).
 */
import { writable } from 'svelte/store'

export type TxRecord = {
  hash: string
  from: string
  to: string
  amount: string
  network: string
  chainId: number | null
  status: 'pending' | 'confirmed' | 'reverted'
  ts: number
}

export const txLedger = writable<TxRecord[]>([])

const MAX = 24

export function addTxRecord(rec: TxRecord) {
  txLedger.update((list) => [rec, ...list.filter((t) => t.hash !== rec.hash)].slice(0, MAX))
}

export function updateTxStatus(hash: string, status: TxRecord['status']) {
  txLedger.update((list) => list.map((t) => (t.hash === hash ? { ...t, status } : t)))
}
