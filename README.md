# Pulse

Herramienta personal de gestión de contenido y publicaciones en redes sociales, multi-workspace.

Intersección entre Buffer/Later (scheduling), Notion (knowledge base por proyecto) y un studio de generación de contenido con IA.

## Estado actual

**Fase 1 — Camino A (Frontend Mock)** ✅

La aplicación funciona en modo mock, sin backend ni base de datos. Toda la navegación, datos y vistas funcionan con datos seed locales.

## Requisitos

- Node 18 LTS (target de producción es macOS Mojave Intel)
- pnpm 9+

```bash
nvm use            # lee .nvmrc → Node 18
pnpm install
pnpm dev:web       # arranca Vite en http://localhost:5173
```

## Estructura

```
/apps/web              ← Frontend React + Vite + TypeScript
/packages/types        ← Tipos TypeScript compartidos
/packages/mock-data    ← Seeds y fixtures para modo mock
```

## Workspaces seed

- **QYRO** — workspace de marca con cuentas IG/TT/FB simuladas.
- **Personal** — workspace personal de Diego.

## Próximas fases

- Fase 2: API real con Fastify + Prisma + SQLite.
- Fase 3+: Workspaces reales, Brand Brain, OAuth, publicación, métricas.

Ver el documento de arranque para el plan completo.
