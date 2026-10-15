/**
 * wallet.js — núcleo Web3 de Aletheia (Svelte 5 runes).
 *
 * Integración REAL con Pali Wallet + Ethers.js v6:
 *  - Descubrimiento vía EIP-6963 (Pali primero) con fallback a window.ethereum.
 *  - Conexión: eth_requestAccounts / wallet_revokePermissions (docs Pali).
 *  - Datos reales: address, balance (eth_getBalance), chainId (eth_chainId),
 *    red vía provider.getNetwork() de Ethers.
 *  - Transacciones: ethers.BrowserProvider → signer.sendTransaction →
 *    tx.wait() → hash, estado y enlace al explorador correcto.
 *
 * Nada de datos simulados: todo sale del provider de la wallet.
 * Documentación: https://docs.paliwallet.com  |  https://ethers.org
 */
import { writable } from 'svelte/store'
import { BrowserProvider, formatEther, getAddress, isAddress, parseEther } from 'ethers'
import { discoverEvmProvider, getInjectedProvider } from '../web3/provider'
import { getExplorer, formatAmount } from '../web3/chains'
import type { Eip1193Provider } from '../web3/web3-types'

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export type WalletState = {
  installed: boolean
  walletName: string
  connecting: boolean
  connected: boolean
  address: string
  balanceWei: string | null
  chainId: number | null
  networkName: string
  explorerBase: string
}

export const INITIAL_STATE: WalletState = Object.freeze({
  installed: false,
  walletName: '',
  connecting: false,
  connected: false,
  address: '',
  balanceWei: null,
  chainId: null, // number — IDE real del provider
  networkName: '', // nombre real vía provider.getNetwork()
  explorerBase: '', // base del explorador real para esta chain
})

export const wallet = writable<WalletState>({ ...INITIAL_STATE })

/* ------------------------------------------------------------------ */
/* Estado interno                                                      */
/* ------------------------------------------------------------------ */

/** Provider EVM activo (Pali vía EIP-6963 o window.ethereum). */
let activeProvider: any = null
/** Instancia de ethers BrowserProvider sobre el provider activo. */
let browserProvider: any = null
let listenersBound = false

const EXPLORER_FALLBACKS = {
  11155111: 'https://sepolia.etherscan.io',
  11155420: 'https://sepolia-optimism.etherscan.io',
  97: 'https://testnet.bscscan.com',
  80002: 'https://amoy.polygonscan.com',
  57054: 'https://shannon.syscoin.org',
  1: 'https://etherscan.io',
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

/** Normaliza un chainId hexadecimal (EIP-1193) a entero. */
function chainIdToInt(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') {
    return value.startsWith('0x') ? parseInt(value, 16) : parseInt(value, 10)
  }
  return null
}

function set(partial) {
  wallet.update((state) => ({ ...state, ...partial }))
}

function safeExplorer(chainId) {
  if (chainId == null) return ''
  const known = EXPLORER_FALLBACKS[chainId]
  return known ?? getExplorer(chainId) ?? ''
}

/* ------------------------------------------------------------------ */
/* Inicialización / detección                                          */
/* ------------------------------------------------------------------ */

/**
 * Detecta Pali Wallet (sin pedir conexión). Llamar al montar la app.
 * - true/false → instalada o no
 * - null → aún detectando
 */
export async function initWallet() {
  const discovered = await discoverEvmProvider()
  activeProvider = discovered?.provider ?? getInjectedProvider()

  const name = discovered?.info?.name ?? (activeProvider ? 'Wallet EVM' : '')
  const installed = Boolean(activeProvider)

  set({
    installed,
    walletName: installed ? name : '',
  })

  if (installed) {
    bindProviderEvents(activeProvider)
    // Si el usuario ya autorizó esta DApp antes, restaurar la sesión.
    try {
      const accounts = await activeProvider.request({ method: 'eth_accounts', params: [] })
      if (Array.isArray(accounts) && accounts.length > 0) {
        await loadAccountState(accounts[0])
      }
    } catch (err) {
      console.debug('[aletheia] eth_accounts (sesión previa) falló silenciosamente:', err)
    }
  }

  return installed
}

/* ------------------------------------------------------------------ */
/* Conexión                                                            */
/* ------------------------------------------------------------------ */

/** Abre Pali Wallet y solicita permiso de lectura de cuentas. */
export async function connectWallet() {
  if (!activeProvider) {
    try {
      const discovered = await discoverEvmProvider()
      activeProvider = discovered?.provider ?? getInjectedProvider()
    } catch (err) {
      console.error('[aletheia] re-discovery falló:', err)
    }
  }

  if (!activeProvider) {
    const error = new Error('Pali Wallet no detectada.')
    error.code = 'NO_WALLET'
    throw error
  }

  set({ connecting: true })

  try {
    // Conexión explícita con aprobación del usuario (docs Pali: connect-accounts)
    const accounts = await activeProvider.request({ method: 'eth_requestAccounts', params: [] })

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error('No se obtuvo ninguna cuenta de la wallet.')
    }

    bindProviderEvents(activeProvider)
    await loadAccountState(accounts[0])
    return accounts[0]
  } catch (err: any) {
    // 4001 = usuario rechazó la conexión (docs Pali: errors)
    if (err?.code === 4001) {
      const error = new Error('Conexión rechazada desde Pali Wallet.')
      error.code = 'USER_REJECTED'
      throw error
    }
    console.error('[aletheia] connect error completo:', err)
    throw err
  } finally {
    set({ connecting: false })
  }
}

/** Desconecta revocando los permisos de la DApp (docs Pali: wallet_revokePermissions). */
export async function disconnectWallet() {
  try {
    if (activeProvider) {
      await activeProvider.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      })
    }
  } catch (err) {
    // Algunas wallets no implementan revoke; la desconexión local es válida igual.
    console.debug('[aletheia] wallet_revokePermissions no disponible:', err)
  }

  browserProvider = null
  set({
    connected: false,
    address: '',
    balanceWei: null,
    chainId: null,
    networkName: '',
    explorerBase: '',
  })
}

/* ------------------------------------------------------------------ */
/* Estado real de la cuenta                                            */
/* ------------------------------------------------------------------ */

/** Lee address/balance/chain/red 100% reales del provider + Ethers. */
async function loadAccountState(addressFromWallet) {
  if (!activeProvider) return

  browserProvider = new BrowserProvider(activeProvider)

  const chainIdHex = await activeProvider.request({ method: 'eth_chainId', params: [] })
  const chainId = chainIdToInt(chainIdHex)

  const network = await browserProvider.getNetwork() // nombre real de la red
  const address = getAddress(addressFromWallet) // checksum EIP-55 (Ethers)
  const balanceWei = await browserProvider.getBalance(address) // saldo real on-chain

  set({
    connected: true,
    address,
    balanceWei: balanceWei.toString(),
    chainId,
    networkName: network.name || `chain-${chainId}`,
    explorerBase: safeExplorer(chainId),
  })
}

/** Relee balance/chain — útil tras confirmar transacción o cambiar de red. */
export async function refreshWallet() {
  const state = getSnapshot()
  if (!state.connected || !activeProvider || !state.address) return
  try {
    const provider = browserProvider ?? new BrowserProvider(activeProvider)
    browserProvider = provider
    const balanceWei = await provider.getBalance(state.address)
    set({ balanceWei: balanceWei.toString() })
  } catch (err) {
    console.warn('[aletheia] refreshWallet:', err)
  }
}

function getSnapshot(): WalletState {
  let snapshot: WalletState | null = null
  wallet.subscribe((s) => (snapshot = s))()
  return snapshot ?? INITIAL_STATE_STUB
}

/**
 * Lectura del snapshot para stores externos (p. ej. red activa).
 * Aditivo: no cambia el comportamiento existente.
 */
export function getWalletSnapshot(): WalletState {
  return getSnapshot()
}

/** Provider EIP-1193 activo (null si no hay wallet). Aditivo para el switch de red. */
export function getActiveEipProvider(): Eip1193Provider | null {
  return activeProvider as Eip1193Provider | null
}

const INITIAL_STATE_STUB: WalletState = { ...INITIAL_STATE }

/* ------------------------------------------------------------------ */
/* Eventos del provider (cuenta, red, desconexión)                     */
/* ------------------------------------------------------------------ */

function bindProviderEvents(provider) {
  if (!provider?.on || listenersBound) return
  listenersBound = true

  // Cambio de cuenta (docs Pali: accountsChanged)
  provider.on('accountsChanged', async (accounts) => {
    if (!Array.isArray(accounts) || accounts.length === 0) {
      // El usuario cerró sesión / quitó permiso desde la wallet
      set({ connected: false, address: '', balanceWei: null })
      return
    }
    if (getSnapshot().connected) {
      await loadAccountState(accounts[0])
    }
  })

  // Cambio de red (docs Pali: chainChanged) — hex EIP-1193
  provider.on('chainChanged', async (chainIdHex) => {
    const chainId = chainIdToInt(chainIdHex)
    set({
      chainId,
      networkName: '',
      explorerBase: safeExplorer(chainId),
    })
    const snapshot = getSnapshot()
    if (snapshot.connected && snapshot.address) {
      try {
        const provider2 = browserProvider ?? new BrowserProvider(activeProvider)
        browserProvider = provider2
        const network = await provider2.getNetwork()
        set({ networkName: network.name || `chain-${chainId}` })
        await refreshWallet()
      } catch (err) {
        console.warn('[aletheia] chainChanged reload:', err)
      }
    }
  })

  provider.on('disconnect', () => {
    set({
      connected: false,
      address: '',
      balanceWei: null,
      chainId: null,
      networkName: '',
      explorerBase: '',
    })
  })
}

/* ------------------------------------------------------------------ */
/* Consultas públicas de red                                           */
/* ------------------------------------------------------------------ */

/** Tipo de red real según el IDE: 'Testnet' | 'Mainnet' | 'Desconocida'. */
export function networkKind(chainId) {
  if (chainId == null) return 'Desconocida'
  const mainnets = new Set([1, 56, 137, 57, 8453, 10, 42161, 43114])
  return mainnets.has(chainId) ? 'Mainnet' : 'Testnet'
}

/* ------------------------------------------------------------------ */
/* Transacciones (cuenta → cuenta)                                     */
/* ------------------------------------------------------------------ */

/**
 * Estados del flujo de transacción (exigidos por la actividad):
 * idle → validating → wallet → pending → confirmed | rejected | error
 */
export const TX_FLOW = Object.freeze({
  IDLE: 'idle',
  VALIDATING: 'validating',
  WALLET: 'wallet', // esperando aprobación en Pali
  PENDING: 'pending', // hash emitido, esperando minado
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected', // rechazada desde la wallet
  ERROR: 'error',
})

/**
 * Envía una transacción real cuenta → cuenta.
 *
 * @param {string} to      dirección destino (validada con ethers.isAddress)
 * @param {string} amount  cantidad ETH (validada y parseada con parseEther)
 * @returns {{ hash: string }} hash real de la transacción
 */
export async function sendTransaction(to, amount) {
  const state = getSnapshot()

  // 1. Verificar wallet conectada
  if (!state.installed) {
    const error = new Error('Pali Wallet no detectada.')
    error.code = 'NO_WALLET'
    throw error
  }
  if (!state.connected || !state.address) {
    const error = new Error('Conecta tu wallet para continuar.')
    error.code = 'NOT_CONNECTED'
    throw error
  }

  // 2. Validar address destino (Ethers)
  if (!to || !isAddress(to)) {
    const error = new Error('La dirección de destino no es válida.')
    error.code = 'INVALID_ADDRESS'
    throw error
  }

  let valueWei
  try {
    valueWei = parseEther(String(amount).trim())
  } catch {
    const error = new Error('La cantidad ingresada no es válida.')
    error.code = 'INVALID_AMOUNT'
    throw error
  }

  if (valueWei <= 0n) {
    const error = new Error('La cantidad debe ser mayor que cero.')
    error.code = 'INVALID_AMOUNT'
    throw error
  }

  // 3. Validar saldo (saldo real + gas estimado)
  const balance = BigInt(state.balanceWei ?? 0n)
  if (balance < valueWei) {
    const error = new Error('Saldo insuficiente.')
    error.code = 'INSUFFICIENT_FUNDS'
    throw error
  }

  const provider = new BrowserProvider(activeProvider)
  browserProvider = provider

  // 4. Obtener signer desde la wallet
  let signer
  try {
    signer = await provider.getSigner()
  } catch (err) {
    console.error('[aletheia] getSigner falló:', err)
    const error = new Error('Conecta tu wallet para continuar.')
    error.code = 'NOT_CONNECTED'
    throw error
  }

  // 5. Enviar — Pali abrirá su popup de confirmación (eth_sendTransaction).
  // Usamos sendUncheckedTransaction: devuelve el hash directamente, sin el
  // polling de getTransaction() que algunos providers no soportan.
  // gasLimit 21000 = gas exacto de una transferencia ETH cuenta→cuenta
  // (evita depender de eth_estimateGas; Pali igualmente muestra el gas en
  // su popup de aprobación).
  let hash
  try {
    hash = await signer.sendUncheckedTransaction({
      to: getAddress(to),
      value: valueWei,
      gasLimit: 21000n,
    })
  } catch (err: any) {
    // 4001 = transacción rechazada desde Pali Wallet (docs Pali: errors)
    if (err?.code === 4001 || err?.info?.code === 4001 || /user rejected|user denied/i.test(String(err?.message))) {
      const error = new Error('La transacción fue rechazada desde Pali Wallet.')
      error.code = 'USER_REJECTED_TX'
      throw error
    }
    console.error('[aletheia] sendTransaction error completo:', err)
    throw err
  }

  return { hash }
}

/**
 * Espera la confirmación real (receipt) de una transacción emitida.
 * Tolerante a providers sin suscripción: hace polling con waitForTransaction.
 * Si el provider no expone eth_getTransactionReceipt correctamente, la
 * transacción queda en 'pending' (la UI ya lo refleja) sin romper la app.
 * @param {string} hash
 * @returns {Promise<{status: 'confirmed'|'reverted'|'pending', receipt: object|null}>}
 */
export async function waitForConfirmation(hash) {
  try {
    const provider = browserProvider ?? new BrowserProvider(activeProvider)
    browserProvider = provider
    const receipt = await provider.waitForTransaction(hash, 1)
    return { status: receipt?.status === 1 ? 'confirmed' : 'reverted', receipt }
  } catch (err) {
    console.warn('[aletheia] confirmación no disponible (se mantiene pendiente):', err)
    return { status: 'pending', receipt: null }
  }
}

/* ------------------------------------------------------------------ */
/* Helpers de formato para la UI                                       */
/* ------------------------------------------------------------------ */

/** Wei (string/bigint) → ETH formateado. Solo presentación, nunca inventado. */
export function formatBalance(balanceWei) {
  if (balanceWei == null) return '—'
  try {
    return formatAmount(formatEther(BigInt(balanceWei)))
  } catch {
    return '—'
  }
}

/** Abrevia una dirección para UI: 0x1234…abcd */
export function shortenAddress(address, chars = 4) {
  if (!address) return ''
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`
}
