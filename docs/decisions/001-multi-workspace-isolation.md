# ADR 001 — Aislamiento estricto entre workspaces

## Estado
Aceptado · 2026-05-20

## Contexto
Pulse es multi-workspace por diseño. Un mismo usuario puede operar QYRO, Diego
Personal y futuros workspaces de cliente en la misma cuenta. Si una query
olvida filtrar por `workspace_id`, los datos se cruzan entre marcas (ej: ver
piezas de un cliente desde el dashboard de otro). Es un bug de seguridad
bloqueante.

## Decisión
1. **Toda tabla scopeada** lleva una columna `workspaceId` no nullable.
2. **Middleware `workspaceScope`** resuelve el slug de la URL a un
   `workspace_id` y lo inyecta en `req.workspaceId`. Devuelve 404 si el
   workspace no existe, 403 si el caller no es miembro.
3. **Toda query Prisma** bajo `/api/v1/w/:slug/*` debe incluir `where: { workspaceId: req.workspaceId }`.
4. **API keys** son por workspace. El token determina el workspace —
   no se acepta un parámetro `workspace_id` en el body de ingest.
5. **Tests automáticos**: la suite de aislamiento intenta acceder a datos de un
   workspace usando la API key de otro y exige respuesta 401/403/404 — nunca
   200 con datos.

## Consecuencias
- Cualquier nueva ruta scopeada debe registrar `workspaceScope` como
  `preHandler` antes que su handler.
- En queries muy generales (ej: cron jobs que iteran todos los workspaces),
  el filtro se hace explícito por job, no asumiendo nada del contexto.
- Las queries cross-workspace (`/overview`, `/calendar` globales) son
  excepciones que requieren auth de usuario y filtran por membresía
  (`workspace_members WHERE user_id = ?`).

## Alternativas descartadas
- **Row Level Security en Postgres**: válida en prod pero no funciona con
  SQLite en dev. Aplicar misma regla en código es más portable.
- **Schemas por workspace**: ingeniería excesiva para 1-5 workspaces típicos.
