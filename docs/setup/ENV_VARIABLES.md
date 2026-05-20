# Variables de entorno

Todas las variables se cargan vía `dotenv-cli` desde la raíz del monorepo
(`.env.local`). No usamos `node --env-file` para mantener compatibilidad con
Node 18 (target del entorno Mojave).

## Cómo se cargan

Cada script de la API arranca con el wrapper:
```json
"dev": "dotenv -e ../../.env.local -- tsx watch src/index.ts"
```
Eso lee `.env.local` antes de ejecutar el comando real. **Nunca** uses
`node --env-file=...` directamente.

## Plantilla

Copia `.env.local.example` a `.env.local` y rellena:

| Variable | Default dev | Producción | Notas |
|---|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | `postgresql://...` | SQLite en dev sin Docker. En prod, switchear provider en `schema.prisma` también. |
| `JWT_SECRET` | dev-only | Generar con `openssl rand -base64 32` | Para sesiones web (Fase 5+). |
| `ENCRYPTION_KEY` | dev-only | Generar con `openssl rand -base64 32` | Para cifrar tokens OAuth con AES-256-GCM. |
| `API_PORT` | `3000` | `3000` | Puerto Fastify. |
| `API_HOST` | `0.0.0.0` | `0.0.0.0` | |
| `CORS_ORIGIN` | `http://localhost:5173` | URL del frontend en prod | Vite dev server. |
| `NODE_ENV` | `development` | `production` | |
| `META_APP_ID` | vacío | desde Meta for Devs | Para OAuth IG/FB (Fase 5). |
| `META_APP_SECRET` | vacío | secreto | |
| `TIKTOK_CLIENT_KEY` | vacío | TikTok for Business | |
| `TIKTOK_CLIENT_SECRET` | vacío | secreto | |
| `GOOGLE_CLIENT_ID` | vacío | Google Cloud | Para YouTube. |
| `GOOGLE_CLIENT_SECRET` | vacío | secreto | |

## Frontend

`apps/web/.env.local` (Vite carga `VITE_*` automáticamente, sin wrapper):

| Variable | Valor |
|---|---|
| `VITE_MOCK_API` | `1` = modo mock, `0` = consume API real |
| `VITE_API_BASE_URL` | `http://localhost:3000` |

## Seguridad

- `.env.local` está en `.gitignore`. **Nunca** lo subas a git.
- Cuando rotes una clave, regenera la siguiente con `openssl rand -base64 32`.
- En producción, `JWT_SECRET` y `ENCRYPTION_KEY` deben venir del secrets manager
  (1Password, AWS Secrets Manager, etc.), no del filesystem.
