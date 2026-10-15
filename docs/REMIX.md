# Desplegar ProofRegistry en Remix (Polygon Amoy)

Guía paso a paso para desplegar el contrato de huellas de Aletheia sin instalar nada.

## 1. Preparar la wallet

1. Abre **Pali Wallet**.
2. Agrega (o selecciona) la red **Polygon Amoy**:
   - RPC: `https://rpc-amoy.polygon.technology`
   - Chain ID: `80002`
   - Símbolo: `POL`
   - Explorador: `https://amoy.polygonscan.com`
3. Consigue POL de prueba en el faucet: <https://faucet.polygon.technology>
   (elige red **Amoy**, pega tu dirección).

## 2. Compilar y desplegar en Remix

1. Abre <https://remix.ethereum.org>.
2. En el explorador de archivos crea `ProofRegistry.sol` y pega el contenido de
   `contracts/ProofRegistry.sol` de este repo.
3. En **Solidity Compiler** (ícono izquierdo):
   - Compiler: `0.8.24` o superior (cualquier `^0.8.24`)
   - Compile.
4. En **Deploy & Run Transactions**:
   - Environment: **Injected Provider – MetaMask** (Remix detecta Pali si está inyectado;
     si no, puedes usar la extensión compatible EIP-1193).
   - En **Network** verifica que aparezca **chainId 80002 (Amoy)**.
   - Clic en **Deploy** y confirma en la wallet.
5. Copia la dirección del contrato desplegado (aparece en "Deployed Contracts"
   y en la transacción del explorador).

## 3. Configurar el frontend

En la raíz del proyecto, agrega al archivo `.env`:

```
VITE_PROOF_REGISTRY_ADDRESS=0xDIRECCION_DEL_CONTRATO
```

Reinicia el dev server (`npm run dev`). El módulo **Certificados** del panel
habilitará el botón “Certificar on-chain”.

## 4. Verificar el despliegue

- Explorador: `https://amoy.polygonscan.com/address/0x…`
- O por consola en el navegador (pestaña Application/Consola):

```js
// En el panel, con wallet conectada a Amoy, la huella debe responder:
// contract.isRegistered(bytes32) → (false, address(0), 0) antes de registrar
```

## Notas de seguridad

- El contrato **solo** guarda `bytes32` (huella SHA-256), dirección y timestamp.
  Nunca archivos ni datos personales.
- Un hash certificado no se puede borrar de la cadena; la corrección se hace
  emitiendo una nueva evidencia/huella.
