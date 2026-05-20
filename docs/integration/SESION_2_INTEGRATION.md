# Integración con SESIÓN 2 (Studio creativo)

Guía completa para que el studio creativo (la otra sesión) pueda:
1. Leer el Brand Brain de un workspace.
2. Subir piezas generadas vía ingest.

## 1. Obtener una API key

1. Entrar al workspace en Pulse.
2. Ir a **Settings → API Keys**.
3. Pulsar **Nueva API key**.
4. Asignar un nombre descriptivo (ej: "SESIÓN 2 — Studio creativo").
5. Seleccionar scopes:
   - `read_brain` — para leer el Brand Brain, personas, hooks, assets.
   - `ingest` — para subir piezas nuevas.
   - `read_metrics` (opcional) — para leer métricas posteriormente.
6. La API key se muestra **una sola vez**. Guárdala en una variable de entorno
   (`PULSE_API_KEY`) — si la pierdes, hay que regenerarla.

Formato del token: `sk_ws_<8-hex-prefix>_<24-hex-secret>`.

## 2. Leer el Brand Brain antes de generar

```typescript
const PULSE_BASE = "https://api.pulse.local";        // o http://localhost:3000 en dev
const API_KEY = process.env.PULSE_API_KEY!;
const WORKSPACE = "qyro";

const headers = { Authorization: `Bearer ${API_KEY}` };

// Brand Brain completo
const brain = await fetch(`${PULSE_BASE}/api/v1/w/${WORKSPACE}/brain`, { headers })
  .then((r) => r.json());

// Personas
const personas = await fetch(`${PULSE_BASE}/api/v1/w/${WORKSPACE}/brain/personas`, { headers })
  .then((r) => r.json());

// Hook library
const hooks = await fetch(`${PULSE_BASE}/api/v1/w/${WORKSPACE}/brain/hooks`, { headers })
  .then((r) => r.json());

// Assets de referencia (logos, screenshots, ads propios, documentos con resumen IA)
const assets = await fetch(`${PULSE_BASE}/api/v1/w/${WORKSPACE}/brain/assets`, { headers })
  .then((r) => r.json());
```

### Qué hacer con cada bloque

| Campo del Brain | Qué usar para |
|---|---|
| `productDescription`, `uniqueValueProp` | Contexto en el system prompt de generación. |
| `brandAdjectives`, `howWeTalk`, `howWeDontTalk` | Style guide del copy. |
| `claimsAllowed` | Permitir explícitamente estas afirmaciones. |
| `claimsForbidden` | Bloquear como rechazo automático del QC. |
| `disclaimersRequired` | Añadir al final del caption si aplica. |
| `competitors` | Para nunca mencionar como ventaja propia. |
| `whatWeAreNot` | Para no confundir el posicionamiento. |
| `copyApprovedExamples` | Few-shot examples para el generador. |
| `copyRejectedExamples` | Few-shot negativos. |
| `personas[].workingHooks` | Lista de hooks que ya han funcionado por persona. |
| `assets[section=document].metadata.summary` | Contexto resumido sin descargar el doc. |
| `assets[section=screenshot]` | Para que la IA sepa que son UI y no marketing. |
| `assets[section=ad_own]` | Ejemplos de creatividad propia con resultados. |

## 3. Subir una pieza (ingest)

```typescript
const response = await fetch(`${PULSE_BASE}/api/v1/ingest/content-pieces`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    "Idempotency-Key": creativeRunId,   // mismo UUID que external_ref
  },
  body: JSON.stringify({
    external_ref: creativeRunId,         // UUID del CreativeRun
    title: "Hook del lunes — POV 5 apps",
    format: "ugc_video",
    buyer_persona_id: "persona-optimizador",
    framework_used: "ugc_15s",
    hook_used: "POV: tienes 5 apps...",
    creative_run_metadata: {
      tool: "higgsfield",
      model: "seedance_2_0",
      credits_spent: 18,
    },
    platform_variants: {
      tiktok: {
        social_account_nickname: "TikTok QYRO",
        media_url: "https://cdn.example.com/runs/abc.mp4",
        ratio: "9:16",
        duration_s: 22,
        caption: "POV: tienes 5 apps y ninguna te dice si vas bien.",
        hashtags: ["productividad", "lifestyle"],
      },
      instagram_reel: {
        social_account_nickname: "IG QYRO",
        media_url: "https://cdn.example.com/runs/abc.mp4",
        ratio: "9:16",
        duration_s: 22,
        caption: "POV: 5 apps y ninguna te dice si vas bien.",
        hashtags: ["productividad", "lifestyle"],
      },
    },
    suggested_schedule: {
      tiktok: "2026-05-23T19:00:00+02:00",
      instagram_reel: "2026-05-23T19:30:00+02:00",
    },
    suggested_boost_budget_eur: 2.0,
  }),
});

const result = await response.json();
// { content_piece_id, workspace_id, status: "in_review", platform_variants: [...] }
```

### Comportamiento idempotente

Si reenvías el mismo `external_ref`, Pulse devuelve **200** (no 201) con el
`content_piece_id` original. **Reintentos seguros**: tu cliente puede reenviar
sin riesgo de duplicar piezas.

Si el `external_ref` ya existe pero en **otro workspace**, devuelve **409**.

### Resolución de cuentas

Pulse busca la cuenta social en este orden:
1. `social_account_id` (si lo pasas).
2. `social_account_nickname` (más legible — recomendado).
3. Primera cuenta de la plataforma en el workspace (fallback).

Si no hay ninguna cuenta de esa plataforma, la variante se descarta silenciosamente.

### Claves de plataforma aceptadas

Se aceptan estas claves en `platform_variants` (todas se normalizan a una plataforma canónica):

| Clave | Plataforma canónica |
|---|---|
| `instagram`, `instagram_reel`, `instagram_feed`, `instagram_story` | `instagram` |
| `tiktok` | `tiktok` |
| `facebook`, `facebook_reel` | `facebook` |
| `youtube`, `youtube_short` | `youtube` |
| `linkedin` | `linkedin` |
| `pinterest` | `pinterest` |
| `twitter_x` | `twitter_x` |

## 4. Códigos de respuesta

| Código | Significado | Acción |
|---|---|---|
| 200 | Idempotente — pieza ya existía | Usar el `content_piece_id` devuelto |
| 201 | Pieza creada | Guardar el `content_piece_id` |
| 400 | Validation error | Revisar el `error.fieldErrors` |
| 401 | Falta o API key inválida | Verificar `Authorization` header |
| 403 | Scope insuficiente | La API key necesita scope `ingest` |
| 409 | external_ref ya existe en otro workspace | No es tu workspace — revisar |

## 5. Webhooks salientes (siguiente fase)

Próximamente Pulse enviará webhooks a SESIÓN 2 cuando:
- Una pieza se aprueba → puede triggerear la siguiente iteración.
- Una pieza se rechaza con feedback → input para el siguiente run.
- Una pieza se publica → empieza a recoger métricas.

Los webhooks vendrán firmados con HMAC-SHA256. Header `X-Pulse-Signature`.

## 6. Variables de entorno recomendadas en SESIÓN 2

```bash
PULSE_BASE_URL=https://api.pulse.local
PULSE_API_KEY=sk_ws_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxx
PULSE_WORKSPACE=qyro
```
