/**
 * proof-registry.ts — registro de huellas SHA-256 en el contrato
 * ProofRegistry (Polygon Amoy, chainId 80002).
 *
 * La dirección del contrato se configura en .env:
 *   VITE_PROOF_REGISTRY_ADDRESS=0x...
 * (desplegado desde Remix; ver docs/REMIX.md).
 */
import { BrowserProvider, Contract } from 'ethers'
import { getActiveEipProvider } from '../stores/wallet'
import { switchNetwork } from '../stores/network'

export const PROOF_CHAIN_ID = 80002
export const PROOF_NETWORK_ID = 'polygon-amoy'

export const PROOF_REGISTRY_ADDRESS: string =
  (import.meta.env.VITE_PROOF_REGISTRY_ADDRESS as string | undefined)?.trim() || ''

export const PROOF_REGISTRY_ABI = [
  'function register(bytes32 hash) external',
  'function isRegistered(bytes32 hash) view returns (bool registered, address owner, uint256 timestamp)',
  'event EvidenceRegistered(bytes32 indexed hash, address indexed owner, uint256 timestamp)',
]

/** Convierte el SHA-256 hex (64 chars) en bytes32 0x… para el contrato. */
export function hexToBytes32(hex: string): `0x${string}` {
  const clean = hex.trim().toLowerCase().replace(/^0x/, '')
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error('La huella debe ser un SHA-256 en hex de 64 caracteres')
  }
  return `0x${clean}`
}

async function getSigner() {
  const eip = getActiveEipProvider()
  if (!eip) throw new Error('Conecta tu wallet para certificar en blockchain')
  const provider = new BrowserProvider(eip)
  return provider.getSigner()
}

/**
 * Registra la huella en el contrato. Devuelve el txHash.
 * Cambia a Amoy si hace falta y espera 1 confirmación.
 */
export async function registerHashOnChain(sha256Hex: string): Promise<string> {
  if (!PROOF_REGISTRY_ADDRESS) {
    throw new Error('Falta VITE_PROOF_REGISTRY_ADDRESS en el .env (contrato aún no desplegado)')
  }
  const sw = await switchNetwork(PROOF_NETWORK_ID)
  if (!sw.ok) throw new Error(sw.message || 'No se pudo cambiar a Polygon Amoy')

  const signer = await getSigner()
  const contract = new Contract(PROOF_REGISTRY_ADDRESS, PROOF_REGISTRY_ABI, signer)
  const tx = await contract.register(hexToBytes32(sha256Hex))
  const receipt = await tx.wait()
  return receipt.hash
}

/** Consulta on-chain si una huella ya está registrada. */
export async function isHashRegisteredOnChain(sha256Hex: string): Promise<{
  registered: boolean
  owner: string
  timestamp: number
}> {
  if (!PROOF_REGISTRY_ADDRESS) {
    return { registered: false, owner: '', timestamp: 0 }
  }
  const eip = getActiveEipProvider()
  if (!eip) throw new Error('Conecta tu wallet para consultar el registro')
  const provider = new BrowserProvider(eip)
  const contract = new Contract(PROOF_REGISTRY_ADDRESS, PROOF_REGISTRY_ABI, provider)
  const [registered, owner, timestamp] = await contract.isRegistered(hexToBytes32(sha256Hex))
  return { registered, owner, timestamp: Number(timestamp) }
}
