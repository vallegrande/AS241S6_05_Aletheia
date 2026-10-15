# Aletheia

**DApp educativa desarrollada en Svelte** que integra **Pali Wallet** mediante **Ethers.js** para interactuar con una red blockchain de prueba: conexión real de wallet, lectura de cuenta (address, balance, red, chain ID, testnet), transacciones cuenta a cuenta y verificación del transaction hash en el explorador correspondiente.

---

## Ejecutar el proyecto

```bash
npm install
npm run dev        # desarrollo → http://localhost:5173
```

Otros comandos:

```bash
npm run build      # build de producción (carpeta dist/)
npm run preview    # sirve el build de producción
npm run check      # svelte-check (tipos + plantillas): 0 errores
```

> Requiere un navegador con la extensión **Pali Wallet** instalada para la funcionalidad completa.

---

## Funcionalidad (todo real, nada simulado)

| Requisito | Implementación |
|---|---|
| Iniciar sesión / conectar Pali Wallet | Descubrimiento **EIP-6963** (Pali primero) + fallback `window.ethereum` → `eth_requestAccounts` |
| Desconectar | `wallet_revokePermissions` (docs oficiales Pali) |
| Detectar cambios de cuenta | Evento `accountsChanged` del provider |
| Leer el address | `eth_accounts` + checksum EIP-55 con `ethers.getAddress` |
| Leer el saldo | `eth_getBalance` vía `BrowserProvider.getBalance` (Ethers.js) |
| Verificar el ID de la testnet | `eth_chainId` + `provider.getNetwork()` (nombre real de la red) |
| Realizar transacciones cuenta a cuenta | `signer.sendUncheckedTransaction` con validación previa de address (`ethers.isAddress`) y cantidad (`parseEther`) |
| Capturar/mostrar el hash | El hash devuelto por la wallet se muestra en un panel con botón **Copiar Hash** |
| Estado de la transacción | `waitForTransaction` (Pendiente → Confirmada / Rechazada) |
| Enlace al explorador | Mapa de exploradores reales por **chainId** (Etherscan, PolygonScan, Syscoin/Tanenbaum, etc.) — nunca URLs inventadas |

### Errores manejados (mensajes exactos de la actividad)

- `Pali Wallet no detectada.`
- `Conecta tu wallet para continuar.`
- `La dirección de destino no es válida.`
- `Saldo insuficiente.`
- `La transacción fue rechazada desde Pali Wallet.`
- `Esperando confirmación…` / `Transacción confirmada.`

Los errores técnicos completos quedan en consola (`[aletheia] …`) para debugging.

---

## Estructura

```
src/
├── App.svelte                    # Composición de secciones (flujo de la demo)
├── main.js                       # mount de Svelte 5
├── styles/base.css               # Sistema visual: negro + blanco + morado
└── lib/
    ├── web3/
    │   ├── provider.ts           # Descubrimiento EIP-6963 (guía oficial Pali)
    │   ├── wallet.ts             # Store central: conexión, datos, tx
    │   ├── chains.ts             # Exploradores reales por chainId
    │   └── web3-types.ts         # Tipos EIP-1193 / EIP-6963
    ├── stores/
    │   └── wallet.ts             # (núcleo web3 reexportado)
    ├── actions/
    │   └── reveal.ts             # Reveal-on-scroll
    ├── gooey/
    │   ├── GooButton.svelte      # Botón goo (liquid-gooey adaptado a Svelte)
    │   └── GooSVG.svelte         # Filtro SVG blur+contraste real
    └── components/
        ├── Nav.svelte
        ├── Hero.svelte
        ├── ProjectSection.svelte      # Descripción / Objetivos / Beneficios / Características
        ├── DeveloperSection.svelte    # Carlos Alejandro Caycho Casas
        ├── GallerySection.svelte
        ├── ImageGalleryVertical.svelte
        ├── WalletSection.svelte       # Actividad 2: conectar + datos de red
        ├── TransactionSection.svelte  # Transacción + hash + explorador
        └── Footer.svelte
```

## Librerías visuales (adaptadas a Svelte)

El proyecto permanece **100% Svelte**. Las tres librerías solicitadas están orientadas a React, así que se **reproduce fielmente su comportamiento visual** en Svelte (sin dependencias incompatibles):

- **beUI Pro — Image Galleries** (`pro.beui.dev`): primera variante recomendada, *Vertical image gallery* — pared editorial de columnas con movimiento vertical continuo alternado, pausa en hover y máscara de desvanecido. → `ImageGalleryVertical.svelte`
- **FeralUI — Gradients** (`feralui.dev`): iluminación ambiental monocroma púrpura sobre negro (radiales + grano anti-banding), como recurso secundario. → `Hero`, `WalletSection`, `DeveloperSection`
- **Libraries.dev — Gooey** (`npm i liquid-gooey` es React 18+): núcleo del efecto (filtro SVG blur + contraste que funde nodos manteniendo el texto nítido) recreado como `GooButton` con física spring propia. Usado solo en CTA de conexión y envío de transacción.

Detalle completo en [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md).

---

## Identidad visual

**Negro + blanco + morado.** El negro domina (fondos, navegación, superficies), blanco para títulos e información principal, grises para metadata, y el morado reservado para acciones, indicadores y la luz ambiental blockchain. Sin paletas multicolor, sin glassmorphism exagerado, sin neon.

## Configuración

- `vite.config.js` — `publicDir: 'static'` (logo, fotografía del desarrollador, videos del hero y assets del hero: `wallapaper.jpeg` + su recorte con alfa `hero-robot.webp`).
- `jsconfig.json` — Svelte 5 + comprobación estricta.
- Tipografía: Space Grotesk (display) / Inter (texto) / JetBrains Mono (datos on-chain).

## Autor

**Carlos Alejandro Caycho Casas**
Estudiante de Análisis de Sistemas y desarrollador Full-Stack en formación.
Valle Grande — Carrera Profesional de Análisis de Sistemas · Cañete, Lima, Perú
