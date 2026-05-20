# Pulse

Herramienta personal de gestión de contenido y publicaciones en redes sociales, multi-workspace.

Intersección entre Buffer/Later (scheduling), Notion (knowledge base por proyecto) y un studio
de generación de contenido con IA.

---

## Requisitos

| Herramienta | Versión | Notas |
|---|---|---|
| **Node.js** | 18 LTS | Obligatorio. Mojave bloquea Node 20+. |
| **pnpm** | 9+ | Gestor de paquetes del monorepo. |
| **nvm** | cualquiera | Para fijar Node 18 con `.nvmrc`. |
| **Git** | cualquiera | — |

---

## Instalación paso a paso

### 1 — Clonar el repositorio

```bash
git clone https://github.com/marliagency/calendario-de-contenido-.git pulse
cd pulse
git checkout claude/social-media-platform-CxkKQ
```

### 2 — Activar Node 18

```bash
# Instalar nvm si no lo tienes:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# Reinicia la terminal, luego:
nvm install 18
nvm use        # lee .nvmrc automáticamente → Node 18
node -v        # debe mostrar v18.x.x
```

### 3 — Instalar pnpm

```bash
npm install -g pnpm@9
pnpm -v        # debe mostrar 9.x.x
```

### 4 — Instalar dependencias

```bash
pnpm install
```

---

## Modo A — Solo frontend (mock, sin backend)

No necesita base de datos ni variables de entorno. Ideal para probar la UI.

```bash
pnpm dev:web
```

Abre **http://localhost:5173** — ya entra con datos precargados (QYRO, Personal).

---

## Modo B — Frontend + API real

### 5 — Crear archivo de entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local` si quieres cambiar algo. Los valores por defecto funcionan en desarrollo:

```ini
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev-only-jwt-secret-change-me"
ENCRYPTION_KEY="dev-only-encryption-key-32bytes!!"
API_PORT=3000
API_HOST=0.0.0.0
CORS_ORIGIN="http://localhost:5173"
NODE_ENV=development
```

> Para producción genera secretos reales:
> ```bash
> openssl rand -base64 32   # usa el resultado como JWT_SECRET
> openssl rand -base64 32   # usa el resultado como ENCRYPTION_KEY
> ```

### 6 — Crear la base de datos y aplicar migraciones

```bash
pnpm migrate
```

Esto crea `services/api/dev.db` (SQLite) y aplica todas las migraciones.

### 7 — Sembrar datos de ejemplo

```bash
pnpm db:seed
```

Esto crea:
- **Usuario:** `diego@qyro.app` / contraseña: `pulse-demo-2026`
- **Workspace QYRO** — marca con Brand Brain completo, 6 cuentas sociales, piezas de contenido y 42 puntos de métricas
- **Workspace Personal** — workspace personal

### 8 — Arrancar ambos servicios

```bash
pnpm dev
```

- API en **http://localhost:3000**
- Web en **http://localhost:5173**

El frontend detecta automáticamente que `VITE_MOCK_API=1` está en `apps/web/.env.local`.
Para conectarlo a la API real cambia ese archivo:

```ini
# apps/web/.env.local
VITE_MOCK_API=0
VITE_API_BASE_URL=http://localhost:3000
```

Y reinicia `pnpm dev:web`.

---

## Comandos útiles

```bash
# Solo frontend (mock):
pnpm dev:web

# Solo API:
pnpm dev:api

# Frontend + API en paralelo:
pnpm dev

# Typechecking completo (todos los paquetes):
pnpm typecheck

# Tests unitarios (API):
pnpm --filter @pulse/api test:unit

# Tests de aislamiento de workspace (requiere API corriendo):
PULSE_DISABLE_RATE_LIMIT=1 pnpm --filter @pulse/api test:isolation

# Nueva migración de DB:
cd services/api && DATABASE_URL="file:./dev.db" pnpm exec prisma migrate dev --name mi-cambio

# Resetear DB y resembrar:
pnpm db:reset
pnpm db:seed
```

---

## Estructura del proyecto

```
pulse/
├── apps/
│   └── web/                   ← React 18 + Vite + TypeScript + Tailwind
│       ├── src/
│       │   ├── components/    ← UI components (calendario, queue, layout…)
│       │   ├── pages/         ← Páginas por ruta
│       │   ├── lib/
│       │   │   ├── api/       ← client.ts (sync), http.ts, data-cache.ts
│       │   │   ├── auth.tsx   ← AuthProvider + hooks
│       │   │   └── utils.ts   ← helpers de formato
│       │   └── router.tsx     ← Rutas React Router v6
│       └── .env.local         ← VITE_MOCK_API=1 (cambiar a 0 para HTTP)
│
├── packages/
│   ├── types/                 ← Tipos TypeScript compartidos
│   └── mock-data/             ← Seed data para modo mock
│
├── services/
│   └── api/                   ← Fastify 4 + Prisma 5 + SQLite
│       ├── prisma/
│       │   ├── schema.prisma  ← Esquema completo (~20 modelos)
│       │   ├── migrations/    ← Historial de migraciones
│       │   └── seed.ts        ← Datos de ejemplo
│       └── src/
│           ├── routes/        ← Todos los endpoints
│           ├── lib/           ← crypto, jwt, passwords, notifications…
│           └── jobs/          ← Job runner (publish, refresh tokens, metrics)
│
├── docs/
│   └── api/openapi.yaml       ← OpenAPI completo
│
├── .env.local.example         ← Plantilla de variables de entorno
├── .nvmrc                     ← "18" — para nvm
└── CLAUDE.md                  ← Guía para el asistente de IA
```

---

## Funcionalidades implementadas

### Frontend (mock + HTTP)
- **Workspaces** — múltiples marcas, tema de color por workspace
- **Dashboard** — KPIs, gráficos de métricas diarias, cuentas conectadas
- **Calendario** — vista mensual con drag & drop para reprogramar piezas
- **Cola de revisión** — approve / reject / request changes / QC engine
- **Brand Brain** — edición del briefing de marca, buyer personas, hooks
- **Assets** — subida de archivos por sección (imágenes, docs, audio)
- **Analytics** — métricas por plataforma, formato, engagement
- **Settings completos:**
  - General (nombre, colores, zona horaria)
  - Conexiones (cuentas OAuth stub)
  - Buyer Personas
  - Audiencias (boost)
  - Campañas
  - Reglas QC
  - Notificaciones
  - API Keys
  - Audit log
- **Notificaciones in-app** — bell con badge, polling, dismiss/mark-read
- **Perfil y preferencias** de cuenta

### Backend (API real)
- **Auth** — registro, login (JWT httpOnly cookie, 7 días), logout
- **Workspace isolation** — toda query filtra por workspaceId; 6 tests automáticos
- **Brand Brain** — CRUD completo con personas y hooks
- **Queue** — approve/reject/request-changes con audit log
- **QC engine** — 7 reglas configurables (longitud, hashtags, spam…)
- **Métricas** — resumen, diarias, por cuenta, por formato
- **Job runner** — publish programado, refresh tokens, pull métricas
- **Notificaciones** — persistentes con severidad y deduplicación
- **Uploads** — multipart, storage local (producción: R2/S3)
- **API keys** — por workspace, scopes granulares
- **Audit log** — registro inmutable de acciones
- **Rate limiting** — global 100/min, 10/min en login
- **OAuth stubs** — Meta, TikTok, Google (listos para App Review)

---

## Credenciales demo (modo HTTP)

| Campo | Valor |
|---|---|
| Email | `diego@qyro.app` |
| Contraseña | `pulse-demo-2026` |

---

## Conectar cuentas de redes sociales

### Realidad: OAuth real requiere App Review

Para publicar de verdad en Instagram, Facebook, TikTok o YouTube hace falta
**registrar una App** en cada plataforma y pasar su proceso de **App Review**
(business verification, política de privacidad, demo en vídeo, etc.). Es un
proceso que puede tardar semanas o meses y no se puede saltar.

### Lo que sí funciona sin App Review

1. **Conectar cuentas en modo dev-connect** (manual): al pulsar
   &ldquo;Añadir cuenta&rdquo; en Settings → Conexiones se abre un formulario
   que crea la cuenta con tokens dummy cifrados. La cuenta aparece como
   conectada en la app y todo el flujo (calendar, queue, schedule, boost)
   funciona normal.
2. **Simulación de publicación** (`PULSE_SIMULATE_PUBLISH=1` en
   `.env.local`, activo por defecto): cuando un job de publish se ejecuta,
   en vez de llamar a la API real, simula la publicación (la pieza pasa a
   `published`) y genera métricas dummy. Así puedes ver el ciclo entero:
   programar → publicar → métricas → dashboard.

### Cuando tengas App Review aprobado

1. Pon las credenciales reales en `.env.local`:
   ```ini
   META_APP_ID="..."
   META_APP_SECRET="..."
   META_OAUTH_REDIRECT="https://tu-dominio.com/api/v1/oauth/instagram/callback"
   TIKTOK_CLIENT_KEY="..."
   TIKTOK_CLIENT_SECRET="..."
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   ```
2. Cambia `PULSE_SIMULATE_PUBLISH=0`
3. Implementa los adapters reales en `services/api/src/adapters/{meta,tiktok,youtube}.ts`
   (actualmente son stubs — el contrato está definido en `adapters/types.ts`)
4. El botón &ldquo;Añadir cuenta&rdquo; abrirá automáticamente el OAuth real
   en vez del form dev-connect

---

## Notas de producción

- Cambiar `DATABASE_URL` a PostgreSQL: `postgresql://user:pass@host/db`
- Cambiar `provider = "postgresql"` en `prisma/schema.prisma`
- Correr `pnpm migrate:deploy` (no `migrate dev`)
- Configurar `JWT_SECRET` y `ENCRYPTION_KEY` con valores aleatorios de 32 bytes
- Configurar variables OAuth (Meta, TikTok, Google) tras App Review
- Storage: configurar R2/S3 y actualizar `services/api/src/routes/storage.ts`

---

## Estado de fases

| Fase | Descripción | Estado |
|---|---|---|
| 0 | Bootstrap monorepo + Tailwind | ✅ |
| 1 | Frontend mock completo | ✅ |
| 2 | Backend Fastify + Prisma + SQLite | ✅ |
| 3 | Crypto, storage, job queue, tests CI | ✅ |
| 4 | Brand Brain editable + uploads | ✅ |
| 5 | OAuth stubs (Meta/TikTok/Google) | ✅ stub |
| 6 | Auth JWT (login, sesión, membresía) | ✅ |
| 7 | Queue endpoints (approve/reject/QC) | ✅ |
| 8 | Job runner (publish, tokens, métricas) | ✅ |
| 9 | Métricas + analytics dashboard | ✅ |
| 10 | Boost real (Meta Ads API) | stub |
| 11 | Pull métricas real (APIs externas) | stub |
| 12 | Notificaciones in-app | ✅ |
| 13 | Rate limiting | ✅ |
| 14 | Drag & drop calendario | ✅ |
| 15 | Audit log UI | ✅ |
