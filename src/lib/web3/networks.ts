/**
 * networks.ts — catálogo configurable de redes (UTXO | EVM).
 *
 * ÚNICA fuente de verdad para las redes soportadas. Nada de `if (chainId === …)`
 * dispersos por la UI: los componentes/stores consultan este catálogo.
 *
 *  - EVM  → chainId numérico, address 0x, RPC JSON-RPC, explorador /tx/ y /address/.
 *  - UTXO → sin chainId EVM; address base58/bech32, API tipo Esplora, explorador
 *           propio (formato distinto al EVM, por eso cada red define sus builders).
 */

export type ProviderKind = 'evm' | 'utxo'

export type EvmNetworkDef = {
  kind: 'evm'
  id: string
  label: string
  chainId: number
  chainIdHex: string
  symbol: string
  decimals: number
  testnet: boolean
  /** RPC pública para lecturas SIN wallet. Si falta → solo vía wallet conectada. */
  rpcUrl?: string
  explorerBase: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
}

export type UtxoNetworkDef = {
  kind: 'utxo'
  id: string
  label: string
  symbol: string
  decimals: number
  testnet: boolean
  /** API Esplora/Blockstream compatible para lectura de saldo SIN wallet. */
  apiBase: string
  explorerBase: string
}

export type NetworkDef = EvmNetworkDef | UtxoNetworkDef

function hex(chainId: number): string {
  return `0x${chainId.toString(16)}`
}

function evm(
  id: string,
  label: string,
  chainId: number,
  symbol: string,
  explorerBase: string,
  testnet: boolean,
  rpcUrl?: string,
): EvmNetworkDef {
  return {
    kind: 'evm',
    id,
    label,
    chainId,
    chainIdHex: hex(chainId),
    symbol,
    decimals: 18,
    testnet,
    rpcUrl,
    explorerBase,
    nativeCurrency: { name: symbol, symbol, decimals: 18 },
  }
}

/**
 * RPCs públicas sin API key (publicnode.com). Solo redes donde el endpoint es
 * público y estable; las EVM de Syscoin quedan como "solo wallet" para no
 * hardcodear RPCs no verificadas.
 */
export const NETWORKS: readonly NetworkDef[] = Object.freeze([
  evm('ethereum', 'Ethereum', 1, 'ETH', 'https://etherscan.io', false, 'https://ethereum-rpc.publicnode.com'),
  evm('sepolia', 'Ethereum Sepolia', 11155111, 'ETH', 'https://sepolia.etherscan.io', true, 'https://ethereum-sepolia-rpc.publicnode.com'),
  evm('hoodi', 'Ethereum Hoodi', 560048, 'ETH', 'https://hoodi.etherscan.io', true, 'https://ethereum-hoodi-rpc.publicnode.com'),
  evm('polygon-amoy', 'Polygon Amoy', 80002, 'POL', 'https://amoy.polygonscan.com', true, 'https://polygon-amoy-bor-rpc.publicnode.com'),
  evm('bsc-testnet', 'BNB Testnet', 97, 'tBNB', 'https://testnet.bscscan.com', true, 'https://bsc-testnet-rpc.publicnode.com'),
  evm('base-sepolia', 'Base Sepolia', 84532, 'ETH', 'https://sepolia.basescan.org', true, 'https://base-sepolia-rpc.publicnode.com'),
  evm('arb-sepolia', 'Arbitrum Sepolia', 421614, 'ETH', 'https://sepolia.arbiscan.io', true, 'https://arbitrum-sepolia-rpc.publicnode.com'),
  evm('op-sepolia', 'Optimism Sepolia', 11155420, 'ETH', 'https://sepolia-optimism.etherscan.io', true, 'https://optimism-sepolia-rpc.publicnode.com'),
  // Syscoin EVM (red nativa de Pali): sin RPC pública verificada → lectura vía wallet.
  evm('sys-tanenbaum', 'Syscoin Tanenbaum', 5700, 'tSYS', 'https://tanenbaum.syscoin.org', true),
  evm('sys-shannon', 'Syscoin Shannon', 57054, 'tSYS', 'https://shannon.syscoin.org', true),
  {
    kind: 'utxo',
    id: 'btc-testnet',
    label: 'Bitcoin Testnet',
    symbol: 'tBTC',
    decimals: 8,
    testnet: true,
    apiBase: 'https://blockstream.info/testnet/api',
    explorerBase: 'https://blockstream.info/testnet',
  },
  {
    kind: 'utxo',
    id: 'btc-mainnet',
    label: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8,
    testnet: false,
    apiBase: 'https://blockstream.info/api',
    explorerBase: 'https://blockstream.info',
  },
])

export const EVM_NETWORKS: readonly EvmNetworkDef[] = Object.freeze(
  NETWORKS.filter((n): n is EvmNetworkDef => n.kind === 'evm'),
)

export const UTXO_NETWORKS: readonly UtxoNetworkDef[] = Object.freeze(
  NETWORKS.filter((n): n is UtxoNetworkDef => n.kind === 'utxo'),
)

export function getNetwork(id: string): NetworkDef | undefined {
  return NETWORKS.find((n) => n.id === id)
}

export function getEvmByChainId(chainId: number): EvmNetworkDef | undefined {
  return EVM_NETWORKS.find((n) => n.chainId === chainId)
}

/** Icono representativo de cada red (set de Icon.svelte). */
const ICON_BY_ID: Record<string, string> = {
  ethereum: 'ethereum',
  sepolia: 'ethereum',
  hoodi: 'ethereum',
  'polygon-amoy': 'polygon',
  'bsc-testnet': 'bnb',
  'base-sepolia': 'base',
  'arb-sepolia': 'arbitrum',
  'op-sepolia': 'optimism',
  'sys-tanenbaum': 'syscoin',
  'sys-shannon': 'syscoin',
  'btc-testnet': 'bitcoin',
  'btc-mainnet': 'bitcoin',
}

export function networkIcon(id: string): string {
  if (ICON_BY_ID[id]) return ICON_BY_ID[id]
  const net = getNetwork(id)
  return net?.kind === 'utxo' ? 'bitcoin' : 'globe'
}

/** URL de detalle de tx según el tipo de red (EVM /tx/ vs Esplora /tx/). */
export function networkTxUrl(net: NetworkDef, hashOrTxid: string): string {
  if (!net || !hashOrTxid) return ''
  return `${net.explorerBase}/tx/${hashOrTxid}`
}

/** URL de detalle de address según el tipo de red. */
export function networkAddressUrl(net: NetworkDef, address: string): string {
  if (!net || !address) return ''
  return `${net.explorerBase}/address/${address}`
}
