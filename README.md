# Aletheia

**Plataforma de identidad profesional descentralizada** (Fase 1 MVP). Los profesionales construyen un perfil portable con evidencias (proyectos, certificaciones, logros), generan huellas criptográficas SHA-256 y pueden certificarlas on-chain en **Polygon Amoy**. Cualquiera puede verificar una huella desde `#/verificar` sin crear cuenta.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Svelte 5 + Vite 7 |
| Auth | Firebase Auth (solo Google) |
| API | Node.js + Express (`server/`) |
| Datos y archivos | PostgreSQL 16 en Docker (`bytea`, máx. 10 MB por archivo) |
| Blockchain | Contrato `ProofRegistry.sol` (SHA-256 → bytes32) en Polygon Amoy |

---

## Ejecutar el proyecto

```bash
# 1) Backend (Postgres + API) — requiere Docker
docker compose up -d --build

# 2) Frontend
npm install
npm run dev        # → http://localhost:5173  (proxy /api → :3001)
```

Otros comandos:

```bash
npm run build      # build de producción (dist/)
npm run preview    # sirve el build
npm run check      # svelte-check: 0 errores
docker compose down             # para la API y la BD
docker compose down -v          # además borra los datos
```

### Variables de entorno (`.env` en la raíz)

```
VITE_FIREBASE_API_KEY=…
VITE_FIREBASE_AUTH_DOMAIN=…
VITE_FIREBASE_PROJECT_ID=…
VITE_FIREBASE_STORAGE_BUCKET=…
VITE_FIREBASE_MESSAGING_SENDER_ID=…
VITE_FIREBASE_APP_ID=…
# Contrato desplegado en Amoy (ver docs/REMIX.md); vacío = certificación on-chain deshabilitada
VITE_PROOF_REGISTRY_ADDRESS=
```

El `.env` **nunca** se sube al repositorio (`.gitignore`).

---

## Flujo del producto (Fase 1)

1. **Registro / login:** Google (Firebase Auth).
2. **Perfil:** nombre, título, bio y enlaces (GitHub, LinkedIn, portafolio) → API → Postgres.
3. **Evidencias:** CRUD con tipo (proyecto / certificación / logro / portafolio), tags, fecha, enlace y archivo opcional.
4. **Certificados:** SHA-256 (WebCrypto) de la evidencia → huella guardada → *opcional* registro on-chain en Amoy con Pali Wallet.
5. **Verificación pública:** `#/verificar` — pegar la huella y ver el estado del registro (sin sesión).

**Privacidad:** los archivos y metadatos viven fuera de la cadena (Postgres); en blockchain solo va `bytes32` (la huella). Una huella certifica *integridad del registro*, no la veracidad del contenido original.

---

## Estructura

```
├── docker-compose.yml          # postgres:16 + api
├── contracts/ProofRegistry.sol # registro mínimo de huellas (Remix)
├── docs/REMIX.md               # guía de despliegue en Amoy
├── server/                     # API Express (auth token Firebase + CRUD)
│   ├── init/01_schema.sql
│   └── src/{index,auth,db}.js + routes/
└── src/
    ├── App.svelte              # rutas: landing / #/panel / #/verificar
    └── lib/
        ├── api/client.ts       # cliente HTTP con ID token
        ├── crypto/hash.ts      # SHA-256 (WebCrypto)
        ├── components/panel/   # Perfil · Evidencias · Certificados
        ├── components/VerifyPage.svelte
        ├── stores/             # auth, wallet, network, toast
        └── web3/               # provider, redes, proof-registry
```

---

## Identidad visual

**Negro + blanco + morado.** Landing cinematográfica con scroll (GSAP) y panel “Nocturne Glass”. Tipografía Geist Sans/Mono autoalojada.

## Autor

**Carlos Alejandro Caycho Casas**
Estudiante de Análisis de Sistemas · Valle Grande — Cañete, Lima, Perú
