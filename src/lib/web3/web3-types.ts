/**
 * Tipos de providers de wallets inyectados (EIP-1193 / EIP-6963).
 *
 * Pali Wallet:
 *  - `window.ethereum` → provider EVM compatible MetaMask.
 *  - `window.pali`     → provider UTXO/Syscoin (declarado por completitud).
 *
 * @see https://docs.paliwallet.com/docs/developers/provider-discovery
 */

/** Provider EVM EIP-1193 inyectado por la wallet. */
export type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] | object }): Promise<any>
  on?(event: string, listener: (...args: any[]) => void): unknown
  removeListener?(event: string, listener: (...args: any[]) => void): unknown
  removeAllListeners?(): unknown
  isConnected?(): boolean
}

/** Info de announce EIP-6963. */
export type Eip6963ProviderInfo = {
  uuid: string
  name: string
  icon: string
  rdns: string
}

/** Anuncio EIP-6963 completo. */
export type Eip6963ProviderDetail = {
  info: Eip6963ProviderInfo
  provider: Eip1193Provider
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider
    pali?: Eip1193Provider
  }

  interface Error {
    code?: string | number
  }
}

export {}
