---
name: qyro-ugc-testimonial
description: Genera UGC tipo testimonial para QYRO (app de planning con AI). Talking-head 15s con hook en los primeros 3 segundos, subtítulos quemados y CTA "Descarga QYRO" al final. Usa cuando el usuario pida "UGC", "testimonial", "talking head" o "persona hablando" para QYRO.
---

# QYRO — UGC testimonial

Plantilla de generación para vídeos UGC tipo testimonial de QYRO.

## Cuándo activarla

El usuario dice algo como:
- "Genera un UGC para QYRO"
- "Haz un testimonial para TikTok del workspace QYRO"
- "Necesito un talking head de la persona Optimizador"

## Brief base

- **Workspace**: `qyro`
- **Formato**: `ugc_video`
- **Duración**: 15 segundos
- **Plataformas**: TikTok 9:16 · IG Reel 9:16 · FB Reel 9:16
- **Tool por defecto**: Higgsfield Seedance 2.0 (~18 créditos por variante)
- **Fallback gratis**: Remotion con avatar genérico + ElevenLabs voz en off

## Estructura

```
0:00–0:03  HOOK escrito en pantalla + dicho en voz alta
0:03–0:08  PAIN — la persona nombra el dolor textualmente
0:08–0:12  DEMO — cap de QYRO en uso (3 segundos)
0:12–0:15  CTA — "Descarga QYRO" + logo lockup
```

## Prompt para Higgsfield Seedance

Construye el prompt así, sustituyendo `{persona.pains[0]}` y `{hook}` por
los valores del brief:

```
Talking head video, 15 seconds, vertical 9:16.
Subject: a 28-35 year old [persona descriptor], natural light,
casual indoor setting. They look directly at camera, calm but
engaged. They say: "{hook}" — then describe how they used to
{persona.pains[0]} and how QYRO changed their day.
Style: candid UGC, soft daylight, slight handheld feel, no music.
Subtitles burned in: yes (use the spoken text).
End frame: phone showing QYRO interface, fade to logo lockup.
```

## Prompt para fallback Remotion

Si `free_first: true` o el presupuesto del mes ya está al 70%, usa el
template `MetricAnimation` adaptado:
- Hook tipográfico 0–3s
- Cap de la UI 3–10s
- Logo + CTA 10–15s

Con ElevenLabs (free tier) para narrar el hook + CTA.

## Reglas QYRO específicas

- **Tono**: preciso y calmado. NO agresivo, NO clickbait gritado.
- **Claims prohibidos** (NUNCA mencionar): "cura la ansiedad", "garantizado".
- **Claims permitidos**: "organiza tu día con AI", "Life Score automático".
- **CTA estándar**: "Descarga QYRO" (no "Bájate ya", no "Cómpralo").

## Ejecutar

```bash
pnpm --filter @pulse/studio studio generate \
  --slug qyro --format ugc_video --concept 1
```

El pipeline propone 3 concepts; este skill encaja con el concept #1 (pain-first).
