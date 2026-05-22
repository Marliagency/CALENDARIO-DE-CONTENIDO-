---
name: qyro-app-demo
description: Genera demos de la app QYRO mostrando la UI en uso. Usa Remotion (gratis) o HyperFrames (gratis) — NUNCA Higgsfield para esto. Walkthroughs de 20-30 segundos con transiciones suaves, marco de móvil y voz en off opcional. Usa cuando el usuario pida "demo", "walkthrough", "muestra la app", "screen recording" o "tutorial".
---

# QYRO — App demo

Demo de la interfaz de QYRO. SIEMPRE gratis: Remotion o HyperFrames. No
tiene sentido gastar créditos en esto porque la UI es determinista y los
mocks dan mejor calidad que cualquier modelo de IA reproduciendo una app.

## Cuándo activarla

- "Haz un demo de QYRO"
- "Muestra cómo se usa el Life Score"
- "Necesito un walkthrough del onboarding"
- "Screen recording del feature X"

## Brief base

- **Workspace**: `qyro`
- **Formato**: `app_demo`
- **Duración**: 20-30 segundos
- **Plataformas**: TikTok 9:16 · IG Reel 9:16 · IG Feed 4:5
- **Tool por defecto**: Remotion (free) → HyperFrames si quieres pixel
  control absoluto sobre la UI

## Estructura recomendada (30s)

```
0:00–0:03  HOOK tipográfico — "El día empieza en QYRO"
0:03–0:08  ONBOARDING — 2-3 frames de la pantalla de inicio
0:08–0:18  CORE FEATURE — Life Score subiendo en tiempo real
0:18–0:25  PAYOFF — pantalla de "día completado" con confeti suave
0:25–0:30  CTA + logo lockup
```

## Composición Remotion

Usar `studio/remotion-projects/qyro/src/compositions/AppDemo.tsx` con:
- `<PhoneFrame>` envolviendo todo
- `<MockHomeScreen>` para los frames de UI
- `<MetricAnimation label="Life Score" fromValue={42} toValue={87}/>` para
  el feature core
- `<BrandLockup>` para el cierre

Variables de entorno al renderizar:
```
BRAND_COLOR_PRIMARY=#7C5CFC
BRAND_BG=#F4F6FB
STUDIO_TAGLINE="Tu día, optimizado"
```

## Composición HyperFrames

Si quieres pixel control (gradientes complejos, tipografías custom, glass
morphism), usar `studio/hyperframes-projects/qyro/templates/app-demo-30s.tsx`.
Render via `node studio/src/lib/hyperframes-render.ts` (Playwright + FFmpeg).

## Reglas

- **Siempre** usar el `<PhoneFrame>` para que se vea como app, no como
  vídeo cualquiera.
- **Status bar**: hora siempre "9:41" (convención Apple), bateria 100%.
- **Datos mostrados**: SIEMPRE valores realistas (no "1000 tareas completadas",
  más bien "3 tareas críticas hoy"). QYRO vende calma, no productivismo.
- **Transiciones**: spring physics, damping=18 (definido en `BrandTheme.tsx`).
  Nada de cortes duros tipo TikTok agresivo.

## Ejecutar

```bash
pnpm --filter @pulse/studio studio generate \
  --slug qyro --format app_demo --concept 1
```

Con coste 0. El pipeline genera, brandea, hace QC, sube y pushea a Pulse.
