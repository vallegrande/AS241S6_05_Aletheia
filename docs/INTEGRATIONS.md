# Integraciones visuales — cómo se usaron beUI Pro, FeralUI y Gooey

> **Regla del proyecto:** el código final es 100% Svelte. Las tres librerías
> solicitadas están orientadas a React, por lo que su **comportamiento visual**
> se reproduce fielmente en Svelte en lugar de instalar dependencias
> incompatibles. No hay integraciones falsas ni muertas.

---

## 1. beUI Pro — Image Galleries + Navbar (variantes 1 recomendadas)

Fuente: <https://pro.beui.dev/components/image-galleries> · <https://pro.beui.dev/components/navbar>

beUI Pro distribuye sus componentes por un registro privado `@beui-pro`
(`npx shadcn add`, token de licencia, React 19 + Tailwind v4). Ninguno de los
tres formatos de distribución es ejecutable en un proyecto Svelte, así que se
reprodujo **la primera variante recomendada**, *Vertical image gallery*
(`image-gallery-vertical.tsx`), con su comportamiento exacto:

| Comportamiento del original (React) | Implementación Svelte |
|---|---|
| Columnas verticales en direcciones alternadas (pares suben, impares bajan) | `animation: drift-y` + `animation-direction: reverse` por columna |
| Movimiento continuo con loop infinito | La lista de tiles se duplica y la animación desplaza `-50%` linealmente |
| Pausa global en hover | `.gallery:hover .col { animation-play-state: paused }` |
| Recortes estables de imagen | Alturas fijas por tile (`heights[]`) + `object-fit: cover` |
| Responsive 3 columnas / 2 en móvil | `grid-template-columns: repeat(3, 1fr)` → media query 760px |
| Máscara editorial de desvanecido | `mask-image: linear-gradient(...)` arriba y abajo |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` detiene el drift |

Archivo: `src/lib/components/ImageGalleryVertical.svelte`

Imágenes: usa las imágenes reales del proyecto (`/aletheia-logo.png`,
`/perfil.png`) y está pensada para reemplazarse por capturas propias de la DApp.

### Extra — Navbar "Expanding pill"

También de beUI Pro, la primera variante de navegación: *Expanding pill*
(`navbar-expand.tsx`). Recreada con su comportamiento exacto, extraído de la
fuente pública del componente:

| Comportamiento del original (React/Framer Motion) | Implementación Svelte |
|---|---|
| Pill flotante sticky centrada, `rounded-full` + `backdrop-blur` | `.expand-pill` con `backdrop-filter: blur(24px)` |
| Ancho que **expande con el scroll** 40rem → 47rem (spring stiffness 170, damping 24, mass .8) | Spring integrado en `requestAnimationFrame` (`$effect` + rAF loop) |
| Links ganan opacidad .82 → 1 y x -4px → 0 al hacer scroll | Lerp suave sobre `linkOpacity`/`linkX` |
| Pill compartida de hover/activo que se desliza entre enlaces (`layoutId` de Framer) | `pill-indicator` con `transition:fade` — el fondo púrpura aparece bajo el enlace activo/hover |
| Hamburger → X con rotación de barras | `.hamburger-bars.open` con transforms CSS |
| Menú móvil overlay redondeado top-[4.25rem] con fade/scale | `.overlay-menu` con `transition:fly` |
| Reduced motion sin springs | `media (prefers-reduced-motion)` global ya lo cubre |

Archivo: `src/lib/components/NavExpand.svelte`

---

## 2. FeralUI — Gradients (iluminación ambiental)

Fuente: <https://feralui.dev/gradients>

FeralUI es una colección WebGL/React; su Gradient Builder exporta SVG/PNG/MP4.
El proyecto adoptó su **filosofía de iluminación suave y grano anti-banding**,
respetando estrictamente la identidad **negro + blanco + morado**:

- **Luz de estudio tras la superficie**: radiales púrpura grandes con
  `filter: blur(90px)` detrás del hero y de las secciones clave
  (`Hero.svelte`, `WalletSection.svelte`, `TransactionSection.svelte`).
- **Grain sutil** (turbulence SVG al 5%) para evitar el banding de los
  degradados oscuros, igual que el modo *grainy* del builder.
- Los gradientes **nunca son el protagonista**: son recurso secundario detrás
  del contenido editorial.

---

## 3. Libraries.dev — Gooey (liquid-gooey)

Fuente: <https://libraries.dev/gooey> — paquete oficial `npm i liquid-gooey`.

El paquete es React 18+ (documentación del propio sitio: *"React 18 or newer"*).
Instalarlo en Svelte habría creado una dependencia muerta; en su lugar se
recreó el **mecanismo físico del efecto**, que es puro CSS/SVG:

1. **Filtro goo real** — `GooSVG.svelte` define el filtro canónico
   `feGaussianBlur (stdDeviation=blur)` → `feColorMatrix` (alfa × contrast)
   → `feBlend`, idéntico al usado por la librería (defaults `blur=6`,
   `contrast=18`; aquí 5/19).
2. **Fusión de nodos** — los "blobs" viven en una capa separada con
   `filter: url(#goo)`, mientras el **texto permanece fuera del filtro y por
   tanto siempre nítido** (comportamiento señala­do por la librería).
3. **Física spring** — `GooButton.svelte` interpola posición/escala del blob
   con un spring amortiguado propio (rigidez/damping por estado), emulando
   `Liquid.Item transition="bouncy"`: reposo → hover fused → press stretched.
4. **Modo `contained`** — variante para el modal de envío: la píldora es sólida
   (`overflow: hidden` + fondo `--purple-600`) y el blob reposa fuera por
   debajo; al hacer hover la liquidez sube dentro de la píldora (más clara) y
   en press se estira hasta completarla. El goo nunca se sale del botón.

**Dónde se usa** (con moderación, como pedía el brief):
- Botón "Conectar Pali Wallet" (nav + sección Wallet + hero CTA).
- Botón "Enviar transacción" con sus estados validando/aprobando/pendiente.

**Dónde NO se usa**: en el resto de la aplicación (botones estándar `.btn`).

---

## Referencia de la integración Pali Wallet

La capa Web3 sigue la documentación oficial de Pali
(<https://docs.paliwallet.com>) y Ethers.js (<https://ethers.org>):

- Descubrimiento EIP-6963 prefiriendo `info.name/rdns` que contenga "pali",
  con fallback a `window.ethereum` (guía *provider-discovery*).
- Conexión con `eth_requestAccounts`; desconexión con
  `wallet_revokePermissions` (guía *connect-accounts*).
- Sincronía con eventos `accountsChanged` / `chainChanged` (guía
  *events-and-state*).
- Errores JSON-RPC estándar, `4001` = rechazo del usuario (guía *errors*).
- Transacciones por `eth_sendTransaction` vía Ethers `BrowserProvider`
  (guía *transactions-and-signing*).
