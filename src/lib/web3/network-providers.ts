/**
 * network-providers.ts — abstracción por tipo de red.
 *
 *   NetworkProvider (interfaz)
 *     ├─ EvmProvider  → ethers JsonRpcProvider (lectura pública) o
 *     │                 BrowserProvider de la wallet (lectura + firma).
 *     └─ UtxoProvider → API pública tipo Esplora/Blockstream (solo lectura).
 *                        El envío UTXO requiere la API `window.pali` (UTXO),
 *                        distinta de la EIP-1193 EVM, así que el envío queda
 *                        explícitamente NO soportado con un error claro.
 */
import { BrowserProvider, JsonRpcProvider, formatUnits, getAddress } from 'ethers'
import { BCODES, BlockchainError, bcError, mapProviderError } from './blockchain-errors'
import { assertAddressForNetwork } from './validation'
import type { EvmNetworkDef, NetworkDef, UtxoNetworkDef } from './networks'

export const FETCH_TIMEOUT_MS = 15000

export type BalanceResult = {
  networkId: string
  address: string
  balanceRaw: string
  balance: string
  symbol: string
  decimals: number
}

async function fetchJson(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<unknown> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw bcError(BCODES.RPC_DOWN, `HTTP ${res.status} ${url}`, `La red respondió ${res.status}.`)
    return await res.json()
  } catch (err) {
    if (err instanceof BlockchainError) throw err
    throw mapProviderError(err, BCODES.RPC_DOWN)
  } finally {
    clearTimeout(t)
  }
}

/** Aplica un timeout a una promesa (para RPCs sin soporte de AbortSignal). */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(bcError(BCODES.TIMEOUT, `timeout after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export interface NetworkProvider {
  readonly net: NetworkDef
  getBalance(address: string): Promise<BalanceResult>
}

/* ------------------------------------------------------------------ */
/* EVM                                                                 */
/* ------------------------------------------------------------------ */

export class EvmProvider implements NetworkProvider {
  readonly net: EvmNetworkDef
  /** Provider inyectado (wallet) para firmar o leer la cadena activa. */
  private injected: { request(args: { method: string; params?: unknown }): Promise<unknown> } | null = null
  private injectedChainId: number | null = null

  constructor(net: EvmNetworkDef) {
    this.net = net
  }

  /** Conecta el provider de la wallet (solo EIP-1193 EVM). */
  attachWallet(provider: EvmProvider['injected'], chainId: number | null) {
    this.injected = provider
    this.injectedChainId = chainId
  }

  detachWallet() {
    this.injected = null
    this.injectedChainId = null
  }

  async getBalance(address: string): Promise<BalanceResult> {
    assertAddressForNetwork(address, this.net)
    const target = address.trim()

    // 1) Si la wallet está en ESTA cadena → lectura on-chain directa (real).
    if (this.injected && this.injectedChainId === this.net.chainId) {
      try {
        const bp = new BrowserProvider(this.injected as never)
        const wei = await bp.getBalance(getAddress(target))
        return {
          networkId: this.net.id,
          address: getAddress(target),
          balanceRaw: wei.toString(),
          balance: formatUnits(wei, this.net.decimals),
          symbol: this.net.symbol,
          decimals: this.net.decimals,
        }
      } catch (err) {
        throw mapProviderError(err, BCODES.RPC_DOWN)
      }
    }

    // 2) Si no, RPC pública configurada (sin login).
    if (!this.net.rpcUrl) {
      throw bcError(
        BCODES.RPC_DOWN,
        `no public rpc for ${this.net.id}`,
        `«${this.net.label}» no tiene lectura pública configurada: conecta la wallet en esa red.`,
      )
    }
    try {
      const rpc = new JsonRpcProvider(this.net.rpcUrl, this.net.chainId, { staticNetwork: true })
      let wei: bigint
      try {
        wei = (await withTimeout(rpc.getBalance(getAddress(target)), FETCH_TIMEOUT_MS)) as bigint
      } finally {
        rpc.destroy()
      }
      return {
        networkId: this.net.id,
        address: getAddress(target),
        balanceRaw: wei.toString(),
        balance: formatUnits(wei, this.net.decimals),
        symbol: this.net.symbol,
        decimals: this.net.decimals,
      }
    } catch (err) {
      throw mapProviderError(err, BCODES.RPC_DOWN)
    }
  }
}

/* ------------------------------------------------------------------ */
/* UTXO (solo lectura vía Esplora/Blockstream)                          */
/* ------------------------------------------------------------------ */

type EsploraAddress = {
  chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number }
  mempool_stats?: { funded_txo_sum?: number; spent_txo_sum?: number }
}

export class UtxoProvider implements NetworkProvider {
  readonly net: UtxoNetworkDef
  constructor(net: UtxoNetworkDef) {
    this.net = net
  }

  async getBalance(address: string): Promise<BalanceResult> {
    assertAddressForNetwork(address, this.net)
    const target = address.trim()
    const data = (await fetchJson(
      `${this.net.apiBase}/address/${encodeURIComponent(target)}`,
    )) as EsploraAddress
    const funded = Number(data?.chain_stats?.funded_txo_sum ?? NaN)
    const spent = Number(data?.chain_stats?.spent_txo_sum ?? NaN)
    if (!Number.isFinite(funded) || !Number.isFinite(spent)) {
      throw bcError(BCODES.RPC_DOWN, JSON.stringify(data).slice(0, 200), 'La API no devolvió un saldo válido.')
    }
    const sats = BigInt(Math.max(0, Math.round(funded - spent)))
    return {
      networkId: this.net.id,
      address: target,
      balanceRaw: sats.toString(),
      balance: formatUnits(sats, this.net.decimals),
      symbol: this.net.symbol,
      decimals: this.net.decimals,
    }
  }
}

/** Factoría: un provider por red, sin lógica EVM/UTXO mezclada en la UI. */
export function createProvider(net: NetworkDef): NetworkProvider {
  return net.kind === 'evm' ? new EvmProvider(net) : new UtxoProvider(net)
}
