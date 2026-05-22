---
name: qyro-lifestyle
description: Genera anuncios lifestyle cinematográficos para QYRO. Vídeo de 8-12s con escena de la vida real (alguien tomando café organizando su día, ejecutivo cerrando portátil con calma) y QYRO como solución implícita. Modelo premium — siempre confirmar gasto antes de ejecutar. Usa cuando el usuario pida "lifestyle", "cinematográfico", "premium" o "Veo".
---

# QYRO — Lifestyle ad

Anuncio lifestyle cinematográfico para QYRO. Caro: ~45 créditos Higgsfield
Veo 3.1 por variante. Siempre pedir confirmación antes de generar.

## Cuándo activarla

- "Haz un lifestyle ad para QYRO"
- "Necesito algo cinematográfico para Reels"
- "Genera el anuncio premium con Veo"

## Brief base

- **Workspace**: `qyro`
- **Formato**: `lifestyle_ad`
- **Duración**: 8-10 segundos
- **Plataformas**: IG Reel 9:16 · FB Reel 9:16 · YouTube Short 9:16
- **Tool**: Higgsfield Veo 3.1 (45 créditos × variante = 135+ por publicación)
- **Confirmación**: SIEMPRE. Antes de generar, mostrar:
  ```
  ⚠ Veo 3.1: 45 créditos × 3 variantes = 135 créditos.
  Créditos restantes este mes: {remaining}.
  ¿Confirmar? [S/n]
  ```

## Estructura

```
0:00–0:02  Escena cotidiana — café de la mañana, abrir portátil
0:02–0:05  Persona consulta el móvil — vemos UI de QYRO en mano
0:05–0:08  Calma, foco, día empieza ordenado
0:08–0:10  Logo lockup + tagline "Tu día, optimizado"
```

## Prompt base para Veo 3.1

```
Cinematic lifestyle commercial, vertical 9:16, 10 seconds.
Setting: minimalist apartment, morning light, warm neutral palette.
Subject: a 30-something professional with calm focused expression,
casually dressed. They open a laptop, glance at their phone showing
a clean planning interface, take a sip of coffee. The pace is slow,
shallow depth of field, gentle camera movement.
Mood: precise, calm, confident — never busy or stressful.
End frame: phone screen flat on desk showing app, then fade to
QYRO logo + tagline lockup.
No spoken dialogue. Diegetic ambient sound only.
```

## Reglas

- **NUNCA** usar imágenes de gente estresada, agobiada o angustiada — QYRO
  vende calma, no urgencia.
- **NUNCA** mostrar el móvil de cerca con la UI completa. Es un product
  glimpse, no un demo. Si necesitas demo de UI usa `qyro-app-demo`.
- **Paleta**: blancos, beiges, gris cálido, acentos en `#7C5CFC` (brand
  primary) sutiles. NO verde, NO rojo brillante.
- **Música**: NO en el render base. Pulse la añade desde la biblioteca de
  Meta al publicar.

## Ejecutar

```bash
# Solo después de confirmar gasto
pnpm --filter @pulse/studio studio generate \
  --slug qyro --format lifestyle_ad --concept 2
```
