/**
 * chains.js — mapa de exploradores de bloques REALES por chainId.
 *
 * El botón "Ver transacción" abre siempre el explorador correcto para la
 * red activa. Nada de URLs inventadas: cada entrada es el explorador oficial
 * de esa red. Si la red no está en el mapa, se devuelve '' y la UI lo maneja.
 */

const EXPLORERS = {
  /* ---- Ethereum ---- */
  1: 'https://etherscan.io',
  5: 'https://goerli.etherscan.io',
  11155111: 'https://sepolia.etherscan.io',
  17000: 'https://holesky.etherscan.io',
  560048: 'https://hoodi.etherscan.io',

  /* ---- Syscoin / Pali (red nativa de Pali Wallet) ---- */
  57: 'https://explorer.syscoin.org',
  5700: 'https://tanenbaum.syscoin.org', // Syscoin Testnet (Tanenbaum)
  57000: 'https://tanenbaum.syscoin.org',
  901: 'https://tanenbaum.syscoin.org', // Syscoin Tanenbaum EVM (chainId 901 / 0x385)
  57054: 'https://shannon.syscoin.org', // NEVM Testnet (Shannon) — la testnet EVM por defecto en Pali

  /* ---- Polygon ---- */
  137: 'https://polygonscan.com',
  80001: 'https://mumbai.polygonscan.com',
  80002: 'https://amoy.polygonscan.com',

  /* ---- BNB Chain ---- */
  56: 'https://bscscan.com',
  97: 'https://testnet.bscscan.com',

  /* ---- Arbitrum ---- */
  42161: 'https://arbiscan.io',
  421614: 'https://sepolia.arbiscan.io',

  /* ---- Optimism ---- */
  10: 'https://optimistic.etherscan.io',
  11155420: 'https://sepolia-optimism.etherscan.io',

  /* ---- Base ---- */
  8453: 'https://basescan.org',
  84532: 'https://sepolia.basescan.org',

  /* ---- Avalanche ---- */
  43114: 'https://snowtrace.io',
  43113: 'https://testnet.snowtrace.io',
}

/**
 * Devuelve la URL base del explorador para un chainId, o '' si se desconoce.
 * @param {number|null} chainId
 * @returns {string}
 */
export function getExplorer(chainId) {
  if (chainId == null) return ''
  return EXPLORERS[chainId] ?? ''
}

/**
 * Devuelve la URL del detalle de una transacción en el explorador correcto.
 * @param {number|null} chainId
 * @param {string} hash
 */
export function getTxUrl(chainId, hash) {
  const base = getExplorer(chainId)
  if (!base || !hash) return ''
  return `${base}/tx/${hash}`
}

/**
 * Devuelve la URL de una dirección en el explorador correcto.
 * @param {number|null} chainId
 * @param {string} address
 */
export function getAddressUrl(chainId, address) {
  const base = getExplorer(chainId)
  if (!base || !address) return ''
  return `${base}/address/${address}`
}

/** Formatea un monto con recorte de ceros finales (solo presentación). */
export function formatAmount(ethAmount, maxDecimals = 6) {
  if (ethAmount == null || Number.isNaN(Number(ethAmount))) return '0'
  const [int, dec = ''] = String(ethAmount).split('.')
  const trimmed = dec.slice(0, maxDecimals).replace(/0+$/, '')
  return trimmed ? `${int}.${trimmed}` : int
}

/** Nombres legibles conocidos (solo como etiqueta secundaria; la fuente real es provider.getNetwork()). */
const KNOWN_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  11155111: 'Sepolia',
  17000: 'Holesky',
  560048: 'Hoodi',
  5: 'Goerli',
  57: 'Syscoin',
  5700: 'Syscoin Tanenbaum',
  57000: 'Syscoin Tanenbaum',
  901: 'Syscoin Tanenbaum',
  57054: 'Syscoin Shannon',
  137: 'Polygon',
  80002: 'Polygon Amoy',
  80001: 'Polygon Mumbai',
  56: 'BNB Chain',
  97: 'BNB Testnet',
  42161: 'Arbitrum One',
  421614: 'Arbitrum Sepolia',
  10: 'OP Mainnet',
  11155420: 'OP Sepolia',
  8453: 'Base',
  84532: 'Base Sepolia',
  43114: 'Avalanche',
  43113: 'Avalanche Fuji',
}

/** Etiqueta legible: nombre real del provider si existe, si no el conocido. */
export function prettyNetwork(providerName: string, chainId: number | null): string {
  // 'unknown'/'mainnet' sin identidad clara → preferir el nombre conocido o el IDE
  const nameLooksUseful =
    providerName &&
    providerName !== 'unknown' &&
    providerName !== `chain-${chainId}` &&
    providerName.length > 2
  if (nameLooksUseful) return providerName
  if (chainId != null && KNOWN_NAMES[chainId]) return KNOWN_NAMES[chainId]
  return providerName && providerName !== 'unknown'
    ? providerName
    : chainId != null
      ? `Red ${chainId}`
      : 'Red desconocida'
}
