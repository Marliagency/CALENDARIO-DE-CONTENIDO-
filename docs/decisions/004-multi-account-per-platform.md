# ADR 004 — Múltiples cuentas de la misma plataforma por workspace

## Estado
Aceptado · 2026-05-20

## Contexto
Un mismo workspace puede operar varias cuentas de la misma red social:
- QYRO maneja `@qyro_app` (ES) y `@qyro_latam` en TikTok.
- Diego Personal podría tener varias cuentas de IG (personal vs profesional).

Modelar las cuentas sociales como "una por plataforma por workspace" forzaría
crear workspaces falsos solo para gestionar cuentas regionales, rompiendo
la separación por marca.

## Decisión
1. `SocialAccount` no tiene constraint único en `(workspaceId, platform)`.
   Puede haber N cuentas de la misma plataforma en el mismo workspace.
2. Cada cuenta lleva un `nickname` (cómo la llama el usuario internamente:
   "TikTok QYRO LATAM") y un `handle` (el @real).
3. Al programar una pieza, el usuario selecciona **cuentas específicas**,
   no plataformas. Cada cuenta seleccionada genera una `PlatformVariant`
   separada (puede tener caption, hashtags, schedule distintos).
4. El campo `targetAccounts` en `ContentPiece` es un array de IDs de cuenta
   (no de strings de plataforma).
5. La API de ingest acepta `social_account_id` o `social_account_nickname`
   para resolver cuál es. Si no, fallback a "primera cuenta de la plataforma".

## Consecuencias
- El UI de connections muestra cuentas agrupadas por plataforma, con un
  botón "+ Añadir otra cuenta de TikTok" siempre disponible.
- Los rate limits se contabilizan por cuenta (`ApiRateLimit.socialAccountId`),
  no por plataforma — porque cada cuenta tiene su propio token y su propia
  cuota.
- Las métricas se agregan por cuenta en el dashboard, no solo por plataforma.
  El usuario puede ver "publico más en @qyro_es pero @qyro_latam tiene más
  engagement".
- Permite eventualmente migrar una cuenta entre workspaces si la estrategia
  cambia (UPDATE workspaceId).

## Alternativas descartadas
- Una cuenta por plataforma por workspace: forzaría crear workspaces falsos.
- Cuentas como "ámbitos" dentro de un workspace: sobre-ingeniería, mismo
  resultado.
