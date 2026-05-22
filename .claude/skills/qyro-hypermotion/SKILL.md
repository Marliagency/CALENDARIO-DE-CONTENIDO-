---
name: qyro-hypermotion
description: Motion graphics y datos animados para QYRO. Métricas que suben (Life Score subiendo de 42 a 87), gráficas con spring physics, contadores, infografías de uso. Siempre Remotion (gratis, sin créditos). Usa cuando el usuario pida "motion graphic", "datos animados", "stat post", "infografía animada" o "número subiendo".
---

# QYRO — Hypermotion (motion graphics)

Motion graphics y data animations para QYRO. SIEMPRE gratis con Remotion.
Pensados para piezas cortas (8-15s) que comunican un dato o un cambio.

## Cuándo activarla

- "Haz un post con un número subiendo"
- "Quiero una infografía animada del Life Score"
- "Genera un motion graphic del crecimiento de usuarios"
- "Stat post para feed"

## Brief base

- **Workspace**: `qyro`
- **Formato**: `motion_graphic` o `data_animation`
- **Duración**: 8-15 segundos
- **Plataformas**: TikTok 9:16 · IG Reel 9:16 · IG Feed 4:5
- **Tool**: Remotion (free), composición `MetricAnimation` o `DataStory`

## Patrones validados

### A) Contador subiendo (Life Score)

```tsx
<MetricAnimation
  label="Tu Life Score"
  fromValue={42}
  toValue={87}
  duration={6}      // segundos
  easing="spring"
/>
```

Output: número grande en centro, color brand primary, spring physics, fade-in
del label superior.

### B) Comparativa antes / después

```tsx
<DataStory
  scenes={[
    { type: "stat", label: "Antes", value: "12 tareas dispersas" },
    { type: "transition", duration: 1 },
    { type: "stat", label: "Con QYRO", value: "3 prioridades claras" },
  ]}
/>
```

### C) Crecimiento temporal

```tsx
<DataStory
  type="line-graph"
  series={[{ x: "Ene", y: 0 }, { x: "Feb", y: 12 }, ...]}
  highlight="último mes"
/>
```

## Reglas

- **Spring physics** en todas las animaciones (damping=18). NO ease-in-out
  lineal, queda barato.
- **Paleta**: primary `#7C5CFC`, bg `#F4F6FB`, texto `#0B1220`. NUNCA verde
  ni rojo (la app QYRO no tiene estos colores).
- **Tipografía**: sans-serif moderno; tamaño del número principal ~220px
  en 1080×1920.
- **Sin música** en el render — Pulse la añade al publicar.
- **Datos**: tienen que ser realistas. Nunca "1M de usuarios felices" si
  QYRO tiene 10k. Honestidad o ambigüedad creíble.

## Ejecutar

```bash
pnpm --filter @pulse/studio studio generate \
  --slug qyro --format motion_graphic --concept 1
```
