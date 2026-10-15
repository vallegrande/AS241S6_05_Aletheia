/**
 * Descubrimiento de providers de wallets (EIP-6963).
 *
 * Estrategia oficial recomendada por Pali Wallet:
 *   1. Preferir el provider anunciado vía EIP-6963 cuyo nombre/rdns contenga "pali".
 *   2. Si no hay anuncio, hacer fallback a `window.ethereum` (compatible MetaMask).
 *
 * @see https://docs.paliwallet.com/docs/developers/provider-discovery
 */
import type { Eip1193Provider, Eip6963ProviderInfo } from './web3-types'

export type DiscoveredProvider = {
  provider: Eip1193Provider
  info: Eip6963ProviderInfo
}

const DISCOVERY_TIMEOUT_MS = 320

function isPali(info: Eip6963ProviderInfo): boolean {
  const name = String(info?.name || '').toLowerCase()
  const rdns = String(info?.rdns || '').toLowerCase()
  return name.includes('pali') || rdns.includes('pali')
}

/** Anuncia wallets instaladas y devuelve la mejor candidata (Pali primero). */
export async function discoverEvmProvider(timeoutMs = DISCOVERY_TIMEOUT_MS): Promise<DiscoveredProvider | null> {
  if (typeof window === 'undefined') return null

  const providers = new Map<string, DiscoveredProvider>()

  const onProvider = (event: Event) => {
    const detail = (event as CustomEvent).detail
    if (detail?.info && detail?.provider && !providers.has(detail.info.uuid)) {
      providers.set(detail.info.uuid, {
        provider: detail.provider as Eip1193Provider,
        info: detail.info as Eip6963ProviderInfo,
      })
    }
  }

  window.addEventListener('eip6963:announceProvider', onProvider)
  window.dispatchEvent(new Event('eip6963:requestProvider'))

  await new Promise((resolve) => setTimeout(resolve, timeoutMs))

  window.removeEventListener('eip6963:announceProvider', onProvider)

  const found = [...providers.values()]
  return found.find(({ info }) => isPali(info)) ?? found[0] ?? null
}

/** Fallback clásico cuando el navegador no anuncia EIP-6963. */
export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null
  return window.ethereum ?? null
}

export function hasPaliUtxoProvider(): boolean {
  return typeof window !== 'undefined' && Boolean(window.pali)
}
