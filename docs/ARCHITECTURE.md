# Documentación — DApp Aletheia

## 1) Transacciones enfocadas a la propuesta que se está trabajando ✅

**Propuesta actual: certificados válidos** — evidencias profesionales verificables (títulos, certificaciones, logros, portafolio).

| Elemento | Detalle |
|---|---|
| Contrato | `ProofRegistry` |
| Red | Polygon Amoy (chainId 80002) |
| Transacción | `register(bytes32 hash)` — firmada por el usuario con la wallet Pali |
| Dato registrado | Huella **SHA-256** de la evidencia (nunca datos personales ni archivos) |
| Estado de la evidencia | `pending → hashed → onchain`, con `tx_hash` y fecha de certificación |
| Verificación | Pública en `#/verificar?hash=…`, sin cuenta y desde el QR del certificado |

El mismo patrón (huella off-chain + prueba on-chain) es el que permitiría extender la DApp a las demás propuestas del enunciado: **remesas, agricultura, donaciones, voto digital, créditos, tiendas online**, etc.

## 2) Historial de transacciones (BD propia) con filtrado por red conectada ✅

Se eligió **almacenamiento en BD** (frente a usar la API de un explorador de bloques): histórico completo propio, sin límites de rate externos y filtrable por usuario.

| Aspecto | Detalle |
|---|---|
| Tabla | `transacciones (uid, evidencia_id, tx_hash, chain_id, created_at)` |
| Reglas | Una fila **por transacción** (re-certificaciones incluidas); `UNIQUE (evidencia_id, tx_hash)` evita duplicados |
| API | `GET /api/transactions` — historial del usuario, ordenado por fecha descendente |
| Filtro por red conectada | El endpoint acepta `?chain_id=<red actual>`; ej.: ZkSYS/Syscoin `57000·901`, Sepolia `11155111`, Hoodi `560048`, Polygon Amoy `80002` |
| UI (panel → Historial) | Fecha, evidencia implicada, red, hash de tx copiable y enlace directo al **explorador oficial de cada red** |

Los exploradores por red están mapeados en `src/lib/web3/chains.ts` (Ethereum/Sepolia/Hoodi, Syscoin/ZkSYS, Polygon, BNB, Arbitrum, Optimism, Base, Avalanche), de modo que "ver transacción" siempre abre el explorador correcto para la red en que ocurrió la transacción.
