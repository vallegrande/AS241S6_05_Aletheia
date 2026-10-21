/**
 * mock-client.js — SOLO para el preview del dashboard (vite.dash-preview.config.js).
 * Reemplaza a src/lib/api/client con datos falsos para ver la telemetría
 * sin sesión de Google. No se usa en la app real.
 */
const now = new Date()
const iso = (monthsAgo, day = 12, h = 15) =>
  new Date(now.getFullYear(), now.getMonth() - monthsAgo, day, h).toISOString()

const evidences = [
  { id: 'e01', uid: 'u', tipo: 'proyecto', titulo: 'Migración monolito → microservicios', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: 'a1f4'.padEnd(64, 'b'), cert_status: 'onchain', tx_hash: '0xabc111', chain_id: 80002, certified_at: iso(0, 3), created_at: iso(0, 3), has_file: false },
  { id: 'e02', uid: 'u', tipo: 'certificacion', titulo: 'AWS Solutions Architect', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: 'c2d5'.padEnd(64, 'e'), cert_status: 'onchain', tx_hash: '0xabc222', chain_id: 80002, certified_at: iso(0, 9), created_at: iso(0, 9), has_file: false },
  { id: 'e03', uid: 'u', tipo: 'proyecto', titulo: 'Dashboard de métricas en Svelte', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: 'b3e6'.padEnd(64, 'a'), cert_status: 'hashed', tx_hash: null, chain_id: null, certified_at: null, created_at: iso(0, 14), has_file: true },
  { id: 'e04', uid: 'u', tipo: 'logro', titulo: '2º lugar hackathon PUCP 2025', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: 'd4f7'.padEnd(64, 'c'), cert_status: 'hashed', tx_hash: null, chain_id: null, certified_at: null, created_at: iso(0, 18), has_file: false },
  { id: 'e05', uid: 'u', tipo: 'portafolio', titulo: 'Rediseño de marca para café local', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: null, cert_status: 'pending', tx_hash: null, chain_id: null, certified_at: null, created_at: iso(0, 21), has_file: true },
  { id: 'e06', uid: 'u', tipo: 'proyecto', titulo: 'API de verificación de credenciales', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: 'e5a8'.padEnd(64, 'f'), cert_status: 'onchain', tx_hash: '0xabc333', chain_id: 80002, certified_at: iso(1, 6), created_at: iso(1, 5), has_file: false },
  { id: 'e07', uid: 'u', tipo: 'certificacion', titulo: 'Solidity Path — Cyfrin Updraft', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: 'f6b9'.padEnd(64, '1'), cert_status: 'onchain', tx_hash: '0xabc444', chain_id: 80002, certified_at: iso(1, 20), created_at: iso(1, 19), has_file: false },
  { id: 'e08', uid: 'u', tipo: 'proyecto', titulo: 'Bot de arbitraje on-chain', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: null, cert_status: 'pending', tx_hash: null, chain_id: null, certified_at: null, created_at: iso(2, 8), has_file: false },
  { id: 'e09', uid: 'u', tipo: 'logro', titulo: 'Charla: identidad descentralizada en PUCP', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: '17ca'.padEnd(64, '2'), cert_status: 'hashed', tx_hash: null, chain_id: null, certified_at: null, created_at: iso(3, 15), has_file: true },
  { id: 'e10', uid: 'u', tipo: 'portafolio', titulo: 'Sistema de diseño Neón', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: '28db'.padEnd(64, '3'), cert_status: 'onchain', tx_hash: '0xabc555', chain_id: 80002, certified_at: iso(4, 4), created_at: iso(4, 3), has_file: false },
  { id: 'e11', uid: 'u', tipo: 'proyecto', titulo: 'Migración de contrato a Amoy', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: null, cert_status: 'pending', tx_hash: null, chain_id: null, certified_at: null, created_at: iso(5, 22), has_file: false },
  { id: 'e12', uid: 'u', tipo: 'certificacion', titulo: 'Meta Front-End Professional', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: '39ec'.padEnd(64, '4'), cert_status: 'onchain', tx_hash: '0xabc666', chain_id: 80002, certified_at: iso(7, 10), created_at: iso(7, 9), has_file: false },
  { id: 'e13', uid: 'u', tipo: 'logro', titulo: 'Top 10% Codewars Perú', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: '4afd'.padEnd(64, '5'), cert_status: 'hashed', tx_hash: null, chain_id: null, certified_at: null, created_at: iso(9, 17), has_file: false },
  { id: 'e14', uid: 'u', tipo: 'proyecto', titulo: 'Portfolio 2024 con GSAP', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: '5b0e'.padEnd(64, '6'), cert_status: 'onchain', tx_hash: '0xabc777', chain_id: 80002, certified_at: iso(10, 7), created_at: iso(10, 6), has_file: true },
  { id: 'e15', uid: 'u', tipo: 'portafolio', titulo: 'Ilustraciones generativas p5.js', descripcion: '', enlace: '', tags: [], fecha: null, file_name: null, mime: null, hash: null, cert_status: 'pending', tx_hash: null, chain_id: null, certified_at: null, created_at: iso(11, 12), has_file: false },
]

const txs = evidences
  .filter((e) => e.tx_hash)
  .map((e, i) => ({
    id: `t${i}`,
    evidencia_id: e.id,
    tx_hash: e.tx_hash + ''.padEnd(20, String(i)),
    chain_id: e.chain_id,
    created_at: e.certified_at,
    titulo: e.titulo,
    tipo: e.tipo,
    hash: e.hash,
    cert_status: e.cert_status,
  }))

export const listEvidences = async () => structuredClone(evidences)
export const listTransactions = async () => structuredClone(txs)
export const getProfile = async () =>
  structuredClone({
    uid: 'u',
    nombre: 'Carla Bravo',
    titulo: 'Full-stack developer · Web3',
    bio: 'Construyo productos con identidad verificable.',
    foto: '/api/profile/photo',
    links: { github: 'https://github.com/carla' },
    updated_at: iso(0, 2),
  })
