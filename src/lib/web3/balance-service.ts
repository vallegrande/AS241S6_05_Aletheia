/**
 * balance-service.ts — consulta de saldos por address.
 *
 *   Address + 1 Network → Balance   (querySingleBalance)
 *   Address + N Networks → balances (queryMultiBalance)
 *
 * Reglas:
 *  - Valida compatibilidad address↔red ANTES de llamar a la red.
 *  - Multi: sin duplicados, con concurrencia acotada, un fallo NO tumba el resto.
 *  - Cada red reporta su propio { status, balance | error } + estado global.
 */
import { BCODES, bcError } from './blockchain-errors'
import { isAddressCompatibleWithNetwork } from './validation'
import { NETWORKS, getNetwork } from './networks'
import { createProvider, EvmProvider, type BalanceResult } from './network-providers'
import { getActiveEipProvider, getWalletSnapshot } from '../stores/wallet'

export type SingleQuery =
  | { status: 'ok'; result: BalanceResult }
  | { status: 'error'; networkId: string; address: string; symbol: string; code: string; message: string; technical: string }

export async function querySingleBalance(address: string, networkId: string): Promise<SingleQuery> {
  const net = getNetwork(networkId)
  if (!net) {
    const e = bcError(BCODES.NETWORK_UNSUPPORTED, networkId)
    return { status: 'error', networkId, address, symbol: '', code: e.code, message: e.message, technical: e.technical }
  }
  try {
    const provider = createProvider(net)
    // Si la wallet está conectada, se adjunta: las EVM sin RPC pública
    // (p. ej. Syscoin) se leen vía wallet cuando está en esa cadena.
    if (provider instanceof EvmProvider) {
      const w = getWalletSnapshot()
      const injected = getActiveEipProvider()
      if (injected && w.chainId != null) provider.attachWallet(injected as never, w.chainId)
    }
    const result = await provider.getBalance(address)
    return { status: 'ok', result }
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string; technical?: string }
    return {
      status: 'error',
      networkId: net.id,
      address: (address ?? '').trim(),
      symbol: net.symbol,
      code: String(e?.code ?? BCODES.UNKNOWN),
      message: String(e?.message ?? 'Error al consultar el saldo.'),
      technical: String((e as { technical?: string })?.technical ?? e?.message ?? err),
    }
  }
}

export type MultiItem =
  | { networkId: string; label: string; symbol: string; status: 'ok'; result: BalanceResult }
  | { networkId: string; label: string; symbol: string; status: 'error'; code: string; message: string; technical: string }

export type MultiQuery = {
  address: string
  items: MultiItem[]
  ok: number
  failed: number
  skipped: { networkId: string; label: string; reason: string }[]
}

const CONCURRENCY = 3

/**
 * Consulta UNA address contra varias redes.
 *  - Dedupe por networkId.
 *  - Las redes incompatibles con el formato se marcan `skipped` (no son error).
 */
export async function queryMultiBalance(rawAddress: string, rawNetworkIds: string[]): Promise<MultiQuery> {
  const address = (rawAddress ?? '').trim()
  const ids = [...new Set((rawNetworkIds ?? []).map(String))].filter(Boolean)

  const skipped: MultiQuery['skipped'] = []
  const queue: { networkId: string; label: string; symbol: string }[] = []

  for (const id of ids) {
    const net = getNetwork(id)
    if (!net) {
      skipped.push({ networkId: id, label: id, reason: 'Red desconocida.' })
      continue
    }
    if (address && !isAddressCompatibleWithNetwork(address, net)) {
      skipped.push({
        networkId: id,
        label: net.label,
        reason: `Formato ${net.kind === 'evm' ? 'EVM (0x…)' : 'UTXO'} incompatible con esta address.`,
      })
      continue
    }
    queue.push({ networkId: id, label: net.label, symbol: net.symbol })
  }

  const items: MultiItem[] = []
  const workers = Array.from({ length: Math.min(CONCURRENCY, Math.max(queue.length, 1)) }, async () => {
    while (queue.length > 0) {
      const job = queue.shift()
      if (!job) return
      const q = await querySingleBalance(address, job.networkId)
      if (q.status === 'ok') {
        items.push({ networkId: job.networkId, label: job.label, symbol: job.symbol, status: 'ok', result: q.result })
      } else {
        items.push({
          networkId: job.networkId,
          label: job.label,
          symbol: job.symbol,
          status: 'error',
          code: q.code,
          message: q.message,
          technical: q.technical,
        })
      }
    }
  })
  await Promise.all(workers)

  // Orden estable = orden del catálogo (no orden de llegada).
  const order = new Map(NETWORKS.map((n, i) => [n.id, i]))
  items.sort((a, b) => (order.get(a.networkId) ?? 99) - (order.get(b.networkId) ?? 99))

  return {
    address,
    items,
    ok: items.filter((i) => i.status === 'ok').length,
    failed: items.filter((i) => i.status === 'error').length,
    skipped,
  }
}
