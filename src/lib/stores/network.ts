/**
 * network.ts — estado global de red activa + cambio de red por proveedor.
 *
 * Flujo EVM ESTRICTO (EIP-1193 / EIP-3326):
 *   seleccionar red
 *     → comprobar eth_chainId (si ya coincide: NO switch, NO add, no se pide nada)
 *     → wallet_switchEthereumChain
 *     → SOLO si la wallet indica cadena desconocida (4902 en cualquier formato)
 *       → wallet_addEthereumChain (config del catálogo) → switch de nuevo
 *     → verificar eth_chainId (reintentos)
 *     → éxito SOLO si el chainId real coincide; si no, la red activa NO cambia.
 *
 * UTXO: sin cambios — selección de lectura para consultas (sin chain EVM).
 *
 * Se auto-sincroniza con el store wallet (chainChanged externo incluido).
 */
import { writable } from 'svelte/store'
import { BCODES, BlockchainError, bcError, mapProviderError } from '../web3/blockchain-errors'
import { EVM_NETWORKS, NETWORKS, getEvmByChainId, getNetwork, type EvmNetworkDef } from '../web3/networks'
import { createProvider, EvmProvider, type NetworkProvider } from '../web3/network-providers'
import { getActiveEipProvider, getWalletSnapshot, wallet } from './wallet'

export type NetworkState = {
  /** Id del catálogo seleccionado (lectura). */
  activeId: string
  /** Tipo de la red seleccionada. */
  activeKind: 'evm' | 'utxo'
  /** chainId REAL reportado por la wallet (null si no conectada). */
  walletChainId: number | null
  /** true si la wallet está realmente en la red EVM seleccionada. */
  walletMatchesSelection: boolean
  /** Id EVM que la wallet indicó como desconocida y quedó pendiente de agregar. */
  pendingAddId: string | null
  switching: boolean
  error: string
  errorCode: string
}

const DEFAULT_ID = 'sepolia'

function initialSelection(): { activeId: string; activeKind: 'evm' | 'utxo' } {
  const net = getNetwork(DEFAULT_ID)
  return { activeId: DEFAULT_ID, activeKind: net?.kind ?? 'evm' }
}

export const network = writable<NetworkState>({
  ...initialSelection(),
  walletChainId: null,
  walletMatchesSelection: false,
  pendingAddId: null,
  switching: false,
  error: '',
  errorCode: '',
})

function set(patch: Partial<NetworkState>) {
  network.update((s) => ({ ...s, ...patch }))
}

function snapshot(): NetworkState {
  let s: NetworkState | undefined
  network.subscribe((v) => (s = v))()
  if (!s) throw new Error('[aletheia] network store sin valor inicial')
  return s
}

/* Auto-sync: la wallet MANDA sobre la selección.
   - Al conectar (o si la wallet cambia de cadena fuera, chainChanged), la
     selección salta automáticamente a la red real de la wallet: la UI nunca
     queda marcando una red distinta a la real.
   - Cadenas desconocidas del catálogo no cambian la selección.
   - Sin wallet conectada, la selección de lectura se conserva. */
let synced = false
export function initNetworkSync() {
  if (synced) return
  synced = true
  wallet.subscribe((w) => {
    const s = snapshot()
    const matches =
      s.activeKind === 'evm'
        ? (getNetwork(s.activeId) as EvmNetworkDef | undefined)?.chainId === w.chainId
        : false

    // La cadena REAL de la wallet define la selección cuando es del catálogo.
    let activeId = s.activeId
    let activeKind = s.activeKind
    if (w.chainId != null) {
      const real = getEvmByChainId(w.chainId)
      if (real) {
        activeId = real.id
        activeKind = 'evm'
      }
    }

    network.update((prev) =>
      prev.walletChainId === w.chainId &&
      prev.walletMatchesSelection === matches &&
      prev.activeId === activeId
        ? prev
        : { ...prev, walletChainId: w.chainId, walletMatchesSelection: matches, activeId, activeKind },
    )
  })
}

/** Provider tipado para una red, con la wallet adjunta cuando aplique. */
export function getProviderFor(networkId: string): NetworkProvider {
  const net = getNetwork(networkId)
  if (!net) throw bcError(BCODES.NETWORK_UNSUPPORTED, networkId)
  const p = createProvider(net)
  if (p instanceof EvmProvider) {
    const w = getWalletSnapshot()
    const injected = getActiveEipProvider()
    if (injected && w.chainId != null) p.attachWallet(injected as never, w.chainId)
  }
  return p
}

/** Lista EVM para el switcher (con marca de "actual en wallet"). */
export function evmOptions(): { def: EvmNetworkDef; inWallet: boolean }[] {
  const chainId = getWalletSnapshot().chainId
  return EVM_NETWORKS.map((def) => ({ def, inWallet: def.chainId === chainId }))
}

export type SwitchResult =
  | { ok: true; alreadyThere: boolean; added?: boolean }
  | { ok: false; code: string; message: string }

type Eip1193Like = {
  request(args: { method: string; params?: unknown }): Promise<unknown>
}

/* ------------------------------------------------------------------ */
/* Clasificación de errores tolerante a formatos de provider           */
/* ------------------------------------------------------------------ */

/**
 * Los providers no hablan igual: el código puede venir como número o string,
 * en primer nivel o anidado (ethers v6 envuelve en `error`/`info` con
 * `ACTION_REJECTED`/`UNKNOWN_ERROR`), o solo como mensaje. Se recogen todos.
 */
function collectCodes(err: unknown): string[] {
  const out: string[] = []
  const seen = new Set<unknown>()
  const visit = (node: unknown, depth: number) => {
    if (depth > 3 || node == null || typeof node !== 'object' || seen.has(node)) return
    seen.add(node)
    const rec = node as Record<string, unknown>
    if (rec.code !== undefined && rec.code !== null) {
      out.push(String(rec.code).toUpperCase())
    }
    for (const key of ['error', 'info', 'data', 'cause']) visit(rec[key], depth + 1)
  }
  visit(err, 0)
  return out
}

function errMessage(err: unknown): string {
  if (typeof err === 'string') return err
  const e = err as { message?: unknown } | null
  return String(e?.message ?? err ?? '')
}

/** 4001 en cualquier forma, ACTION_REJECTED de ethers, o mensajes de rechazo. */
function isUserRejection(err: unknown): boolean {
  if (collectCodes(err).some((c) => c === '4001' || c === 'ACTION_REJECTED')) return true
  return /user (rejected|denied|cancelled|canceled)|rejected (the )?request|request rejected|denied.*request|action rejected|rechazó|cancelado por el usuario/i.test(
    errMessage(err),
  )
}

/**
 * 4902 en cualquier forma o mensajes de "cadena desconocida".
 * SOLO en este caso se permite llamar a wallet_addEthereumChain.
 */
function isMissingChain(err: unknown): boolean {
  if (collectCodes(err).includes('4902')) return true
  return /unrecognized chain|unknown chain|chain .*not (added|recognized|configured|found)|not configured|missing chain|no está configurada|red no (existe|configurada)|wallet_addEthereumChain/i.test(
    errMessage(err),
  )
}

/** -32002: la wallet ya tiene una solicitud abierta (bloquea el cambio). */
function isRequestPending(err: unknown): boolean {
  if (collectCodes(err).some((c) => c === '-32002' || c === '32002')) return true
  return /already pending|request already pending|solicitud.*(abierta|pendiente)/i.test(errMessage(err))
}

/* ------------------------------------------------------------------ */
/* Lectura y verificación del chainId real                              */
/* ------------------------------------------------------------------ */

function toChainId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string' && value.trim() !== '') {
    const s = value.trim()
    const n = s.startsWith('0x') || s.startsWith('0X') ? parseInt(s, 16) : parseInt(s, 10)
    return Number.isFinite(n) ? n : null
  }
  return null
}

async function readChainId(injected: Eip1193Like): Promise<number | null> {
  const raw = await injected.request({ method: 'eth_chainId' })
  return toChainId(raw)
}

/** Relee eth_chainId con reintentos (algunas wallets propagan el cambio lento). */
async function verifyChainId(injected: Eip1193Like, attempts = 3, delayMs = 350): Promise<number | null> {
  let last: number | null = null
  for (let i = 0; i < attempts; i++) {
    try {
      last = await readChainId(injected)
      if (last != null) return last
    } catch (err) {
      console.debug('[aletheia] verifyChainId intento fallido:', err)
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs))
  }
  return last
}

async function requestSwitch(injected: Eip1193Like, evm: EvmNetworkDef): Promise<void> {
  await injected.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: evm.chainIdHex }],
  })
}

/* ------------------------------------------------------------------ */
/* Cambio de red EVM                                                    */
/* ------------------------------------------------------------------ */

/**
 * Flujo: comprobar chainId → switch → (solo si falta: add + switch) → verificar.
 * La red activa SOLO se actualiza cuando el chainId real coincide.
 */
export async function switchNetwork(networkId: string): Promise<SwitchResult> {
  const net = getNetwork(networkId)
  if (!net) {
    const e = bcError(BCODES.NETWORK_UNSUPPORTED, networkId)
    set({ error: e.message, errorCode: e.code })
    return { ok: false, code: e.code, message: e.message }
  }

  // UTXO: selección de lectura (sin chain que cambiar en la wallet EVM).
  if (net.kind === 'utxo') {
    set({ activeId: net.id, activeKind: 'utxo', walletMatchesSelection: false, pendingAddId: null, error: '', errorCode: '' })
    return { ok: true, alreadyThere: false }
  }

  const evm = net
  const injected = getActiveEipProvider() as Eip1193Like | null
  if (!injected) {
    const e = bcError(BCODES.PROVIDER_MISSING, 'switch without wallet')
    set({ error: e.message, errorCode: e.code })
    return { ok: false, code: e.code, message: e.message }
  }

  // 1) Comprobar el chainId real. Si ya coincide: NO switch, NO add, no se pide nada.
  let current: number | null = null
  try {
    current = await readChainId(injected)
  } catch {
    current = getWalletSnapshot().chainId
  }
  if (current === evm.chainId) {
    set({ activeId: evm.id, activeKind: 'evm', pendingAddId: null, error: '', errorCode: '' })
    return { ok: true, alreadyThere: true }
  }

  // 2–4) Switch (con add solo si la wallet dice que falta) + verificación.
  set({ switching: true, error: '', errorCode: '' })
  try {
    const added = await switchWithOptionalAdd(injected, evm)

    const landed = await verifyChainId(injected)
    if (landed == null) {
      throw bcError(
        BCODES.RPC_DOWN,
        `eth_chainId unreadable after switch to ${evm.chainId}`,
        'No se pudo leer el chainId tras el cambio. La red activa no cambió.',
      )
    }
    if (landed !== evm.chainId) {
      throw bcError(
        BCODES.NETWORK_UNSUPPORTED,
        `landed on ${landed}, expected ${evm.chainId}`,
        `La wallet quedó en otra cadena (${landed}). La red activa no cambió.`,
      )
    }
    set({ activeId: evm.id, activeKind: 'evm', pendingAddId: null, error: '', errorCode: '' })
    return { ok: true, alreadyThere: false, added }
  } catch (err) {
    return failSwitch(evm, err)
  } finally {
    set({ switching: false })
  }
}

/**
 * Intenta el switch; SOLO si el error indica cadena desconocida, agrega la
 * red (config del catálogo) y reintenta el switch. Devuelve si hubo add.
 */
async function switchWithOptionalAdd(injected: Eip1193Like, evm: EvmNetworkDef): Promise<boolean> {
  try {
    await requestSwitch(injected, evm)
    return false
  } catch (switchErr: unknown) {
    if (isUserRejection(switchErr)) {
      throw bcError(
        BCODES.NETWORK_SWITCH_REJECTED,
        errMessage(switchErr),
        'Cambio cancelado. La red activa no cambió.',
      )
    }
    if (isRequestPending(switchErr)) {
      throw bcError(BCODES.REQUEST_PENDING, errMessage(switchErr))
    }
    if (!isMissingChain(switchErr)) {
      throw mapProviderError(switchErr, BCODES.NETWORK_UNSUPPORTED)
    }
    // La wallet indica que la red NO existe: agregarla y reintentar el cambio.
    await addEvmChain(injected, evm)
    try {
      await requestSwitch(injected, evm)
    } catch (retryErr: unknown) {
      if (isUserRejection(retryErr)) {
        throw bcError(
          BCODES.NETWORK_SWITCH_REJECTED,
          errMessage(retryErr),
          'Cambio cancelado tras agregar la red. La red activa no cambió.',
        )
      }
      if (isRequestPending(retryErr)) throw bcError(BCODES.REQUEST_PENDING, errMessage(retryErr))
      throw mapProviderError(retryErr, BCODES.NETWORK_UNSUPPORTED)
    }
    return true
  }
}

/** Registra el fallo SIN tocar la red activa; ofrece reintento de add si aplica. */
function failSwitch(evm: EvmNetworkDef, err: unknown): SwitchResult {
  const e = err instanceof BlockchainError ? err : mapProviderError(err, BCODES.NETWORK_UNSUPPORTED)
  if (e.code === BCODES.NETWORK_SWITCH_REJECTED || isUserRejection(err)) {
    const r = bcError(BCODES.NETWORK_SWITCH_REJECTED, e.technical, 'La red activa no cambió.')
    set({ error: r.message, errorCode: r.code })
    return { ok: false, code: r.code, message: r.message }
  }
  // Si falló el agregado y la red tiene config para agregarse, la UI puede
  // ofrecer "Agregar red a wallet" como acción secundaria (nunca principal).
  const canRetryAdd = e.code === BCODES.NETWORK_ADD_FAILED && Boolean(evm.rpcUrl)
  set({ error: e.message, errorCode: e.code, pendingAddId: canRetryAdd ? evm.id : null })
  return { ok: false, code: e.code, message: e.message }
}

/**
 * Agrega la red a la wallet y cambia a ella (con verificación).
 * Acción secundaria: la UI solo la ofrece cuando un switch previo detectó
 * que la red falta (pendingAddId) o el usuario la invoca explícitamente.
 */
export async function addNetworkToWallet(networkId: string): Promise<SwitchResult> {
  const net = getNetwork(networkId)
  if (!net || net.kind !== 'evm') {
    const e = bcError(BCODES.NETWORK_UNSUPPORTED, networkId)
    set({ error: e.message, errorCode: e.code })
    return { ok: false, code: e.code, message: e.message }
  }
  const evm = net
  const injected = getActiveEipProvider() as Eip1193Like | null
  if (!injected) {
    const e = bcError(BCODES.PROVIDER_MISSING, 'add without wallet')
    set({ error: e.message, errorCode: e.code })
    return { ok: false, code: e.code, message: e.message }
  }

  set({ switching: true, error: '', errorCode: '' })
  try {
    await addEvmChain(injected, evm)
    try {
      await requestSwitch(injected, evm)
    } catch (retryErr: unknown) {
      if (isUserRejection(retryErr)) {
        throw bcError(BCODES.NETWORK_SWITCH_REJECTED, errMessage(retryErr), 'La red activa no cambió.')
      }
      if (isRequestPending(retryErr)) throw bcError(BCODES.REQUEST_PENDING, errMessage(retryErr))
      throw mapProviderError(retryErr, BCODES.NETWORK_UNSUPPORTED)
    }
    const landed = await verifyChainId(injected)
    if (landed !== evm.chainId) {
      throw bcError(
        BCODES.NETWORK_UNSUPPORTED,
        `landed on ${landed}, expected ${evm.chainId}`,
        'La wallet no quedó en la red agregada. La red activa no cambió.',
      )
    }
    set({ activeId: evm.id, activeKind: 'evm', pendingAddId: null, error: '', errorCode: '' })
    return { ok: true, alreadyThere: false, added: true }
  } catch (err) {
    return failSwitch(evm, err)
  } finally {
    set({ switching: false })
  }
}

async function addEvmChain(injected: Eip1193Like, evm: EvmNetworkDef): Promise<void> {
  if (!evm.rpcUrl) {
    throw bcError(
      BCODES.NETWORK_ADD_FAILED,
      `no rpc for ${evm.id}`,
      `«${evm.label}» no tiene RPC configurada para agregarla automáticamente; agrégala manual en la wallet.`,
    )
  }
  try {
    await injected.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: evm.chainIdHex,
          chainName: evm.label,
          nativeCurrency: evm.nativeCurrency,
          rpcUrls: [evm.rpcUrl],
          blockExplorerUrls: [evm.explorerBase],
        },
      ],
    })
  } catch (err) {
    if (isUserRejection(err)) {
      throw bcError(BCODES.NETWORK_ADD_FAILED, errMessage(err), 'La solicitud fue rechazada en la wallet.')
    }
    throw bcError(BCODES.NETWORK_ADD_FAILED, errMessage(err))
  }
}

/** Selección simple de lectura (usada por el balance lookup público). */
export function selectReadNetwork(networkId: string) {
  const net = getNetwork(networkId)
  if (!net) return
  // Solo EVM requiere switch con wallet; si no hay wallet, es selección de lectura.
  if (!getActiveEipProvider()) {
    set({ activeId: net.id, activeKind: net.kind, error: '', errorCode: '' })
    return
  }
  void switchNetwork(networkId)
}

export function allNetworkIds(): string[] {
  return NETWORKS.map((n) => n.id)
}
