# Pulse — guía para Claude

Esta es una **herramienta personal de gestión de contenido y publicaciones
sociales multi-workspace**, no un SaaS. Está pensada para 1 usuario (Diego)
operando varias marcas (QYRO, personal, futuros clientes).

## Restricciones del entorno (no negociables)

El usuario desarrolla en **MacBook Pro Intel con macOS Mojave 10.14.6**.
Esto bloquea:
- **Node 20+** (problemas OpenSSL en Mojave) → usar **Node 18 LTS**
- **Docker Desktop moderno** (requiere macOS 14+) → **nada de Docker**
- **Homebrew** moderno (mayoría de fórmulas requieren macOS 11+)
- **`node --env-file`** (Node 18 no lo soporta) → usar **`dotenv-cli`** como wrapper

Implicaciones:
- DB en dev: **SQLite** (Prisma con `provider = "sqlite"`). Producción switchea a Postgres.
- Cola de jobs: tabla **`Job`** + worker polling. NO BullMQ/Redis en dev.
- Storage: filesystem local en dev (`services/api/storage/`). Producción R2/S3.
- Scripts package.json: **siempre** prefijo `dotenv -e ../../.env.local --`.

## Arquitectura

```
/apps/web              ← React + Vite + TS + Tailwind, modo mock o HTTP
/packages/types        ← TypeScript compartidos
/packages/mock-data    ← Seeds y fixtures (modo mock)
/services/api          ← Fastify + Prisma + SQLite
/docs                  ← OpenAPI, ADRs, setup guides
```

Multi-workspace con aislamiento estricto (ADR 001):
- Toda tabla scopeada lleva `workspaceId`.
- Middleware `workspaceScope` resuelve slug → workspace_id desde la URL.
- API keys son por workspace.
- Tests de aislamiento (6 casos) corren en CI — bloquean merges con regresiones.

## Modos del frontend

- `VITE_MOCK_API=1` (default): datos sync desde `@pulse/mock-data`.
- `VITE_MOCK_API=0`: HTTP contra `http://localhost:3000`.

Hooks unificados en `apps/web/src/lib/api/index.ts`:
- `useApiResource(syncLoader, httpLoader, deps)` — devuelve `{ data, loading, error, refresh }`
- `useApiMutation(httpMutation)` — para POST/PATCH/DELETE

## Comandos clave

```bash
nvm use                          # Node 18 LTS
pnpm install
cp .env.local.example .env.local

# Frontend solo (modo mock, no necesita DB):
pnpm dev:web                     # http://localhost:5173

# Backend + frontend:
pnpm migrate                     # SQLite + schema
pnpm db:seed                     # QYRO + Personal + API key demo
pnpm dev                         # api+web en paralelo

# Tests:
pnpm typecheck
pnpm --filter @pulse/api test:unit         # 24 tests (crypto, qc, json, api-key)
pnpm --filter @pulse/api test:isolation    # 6 tests (necesita API corriendo)

# Migración nueva:
cd services/api && DATABASE_URL="file:./dev.db" pnpm exec prisma migrate dev --name X
```

## Reglas no negociables

1. **NUNCA `node --env-file=`** — siempre `dotenv -e ... --`
2. **NUNCA Docker** como dependencia de development
3. **Node target 18** — no usar APIs de v20+
4. **Toda query Prisma** bajo `/api/v1/w/:slug/*` filtra por `workspaceId`
5. **Tokens cifrados** con `lib/crypto.ts` (AES-256-GCM). Nunca en logs, nunca en responses
6. **API keys**: el token completo se devuelve solo al crear; luego solo `keyPrefix`
7. **No emojis** en código ni commits salvo que el usuario lo pida

## Estructura de endpoints

Base: `/api/v1`

| Prefijo | Routes | Auth |
|---|---|---|
| `/workspaces` | GET, POST, PATCH/:slug, DELETE/:slug | (TODO: JWT) |
| `/w/:slug/brain` | GET, PATCH, /personas CRUD, /hooks, /assets | session o API key |
| `/w/:slug/content/pieces` | GET, GET/:id | session |
| `/w/:slug/social/accounts` | GET (sin tokens) | session |
| `/w/:slug/metrics` | GET, /summary, /generate-dummy | session o API key |
| `/w/:slug/campaigns` | GET, POST | session |
| `/w/:slug/audiences` | GET | session |
| `/w/:slug/api-keys` | GET, POST, DELETE/:id | session |
| `/w/:slug/queue/pieces/:id/{approve,reject,request-changes,qc}` | POST | session |
| `/w/:slug/queue/variants/:id/{schedule,boost}` | PATCH | session |
| `/w/:slug/uploads` | POST multipart | session |
| `/w/:slug/audit` | GET | session |
| `/oauth/:platform/{start,callback}`, `/dev-connect` | POST | (state) |
| `/webhooks/{meta,tiktok}` | POST | HMAC verify |
| `/storage/:wsId/:filename` | GET | signed URL |
| `/ingest/content-pieces` | POST | API key (scope: ingest) |

OpenAPI completo: `docs/api/openapi.yaml`.

## Job runner

Corre dentro del proceso Fastify:
- cada 5s → drena la cola
- cada 60s → encola publish jobs para variants programadas
- cada 1h → encola refresh_token para tokens próximos a expirar
- cada 24h → encola pull_metrics por workspace

Para deshabilitar en CI / tests: `PULSE_DISABLE_JOBS=1`.

## Fases entregadas

Ver `docs/decisions/*` para decisiones arquitectónicas y `README.md` para el
estado actual de cada fase del plan original.

Fases con código real: 0, 1, 2, 3, 4, 6, 7, 8, 9.
Fases con stubs preparados: 5 (OAuth), 10 (boost real), 11 (pull metrics real).
Lo que falta requiere App Review de Meta/TikTok/Google.
