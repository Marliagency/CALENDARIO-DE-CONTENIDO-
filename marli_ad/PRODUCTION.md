# Marli — Sistema de producción de anuncios verticales (ComfyUI / RunPod)

Sistema para producir anuncios verticales 9:16 de **30 s** combinando varios formatos de
vídeo IA, con **variaciones de estilo y tiempo** parametrizables. El proyecto está
diseñado para ejecutar la generación en un pod de **RunPod con ComfyUI** y el montaje
final en el Mac con `ffmpeg`.

---

## 1. Los 4 formatos de vídeo

| Formato | Qué es | Modelo ComfyUI | Audio | Duración típica |
|---|---|---|---|---|
| **CINEMATIC** | Plano cinematográfico, Li en consulta o producto/escena, sin texto. | **Wan 2.2 14B T2V** | OFF (música sola) | 3 / 5 / 8 s |
| **UGC** | Persona hablando a cámara, look selfie de iPhone. | Wan 2.2 14B T2V + lip-sync (Sonic / LatentSync) | Voz (ElevenLabs o grabada) + música muy baja | 5 / 8 s |
| **TEXT_CARD** | Fondo IA premium + texto nítido en post (DM Serif + Space Grotesk). | **FLUX.1 dev** para fondo | Música | 5 s |
| **SLIDESHOW_5** | **5 imágenes** que cambian **cada segundo** (5 s total). Ideal para *5 razones*, *5 errores*, *antes/después múltiple*. | **FLUX.1 dev** ×5 | Música + sting de tambor por cambio | 5 s (1 s × 5) |

Naming de outputs (fundamental para el orquestador):

```
beat<n>_<type>_<id>.mp4
   e.g. beat1_cinematic_hook.mp4
        beat2_textcard_problem.mp4
        beat3_ugc_testimonial.mp4
        beat4_slideshow5_razones.mp4
```

---

## 2. Sistema de variaciones

Todo es **parametrizable por config YAML** (ver §5). Cuatro ejes:

### 2.1 Estilo visual (prompt suffix)

| Preset | Sufijo de prompt que añade el orquestador |
|---|---|
| `editorial` | `, premium editorial advertising style, soft cream tones, Sony A7R look, shallow depth of field` |
| `cinematic` | `, cinematic, anamorphic lens, dramatic key light, film grain, ARRI Alexa look` |
| `handheld` | `, handheld phone selfie, slight natural shake, iPhone front-camera aesthetic` |
| `studio` | `, clean studio backdrop, soft box lighting, product photography` |
| `golden-hour` | `, warm golden-hour window light, long soft shadows` |
| `noir` | `, low-key noir lighting, deep shadows, single hard key light` |

### 2.2 Cámara (sólo CINEMATIC / UGC / SLIDESHOW con Ken Burns)

| Preset | Cómo se traduce |
|---|---|
| `static` | sin movimiento |
| `slow-push-in` | `slow gentle cinematic push-in` |
| `slow-orbit` | `smooth slow orbiting camera around subject` |
| `dolly-left` / `dolly-right` | `smooth dolly to the left/right` |
| `handheld` | `slight natural handheld movement` |

### 2.3 Tiempo

- **Duración por beat**: `3 | 5 | 8 | 10` (segundos). En SLIDESHOW_5 fija = 5.
- **Frecuencia de cambio en SLIDESHOW**: `slide_dur: 0.5 | 1.0 | 1.5` s. Si cambias a `0.5` y dejas 5 slides, total = 2.5 s; el orquestador ajusta el número de slides para llenar el beat.
- **fps**: `24` por defecto (1080p). `30` opcional.

### 2.4 Seed

- `seed: 42` → repetible.
- `seed: random` → cada corrida genera una variación distinta del mismo prompt. Útil para sacar 3-4 takes del mismo beat.

---

## 3. Setup mínimo en ComfyUI (RunPod)

Asumiendo que ya tienes el pod corriendo. Una sola vez:

```bash
cd /workspace/ComfyUI/custom_nodes
git clone https://github.com/ltdrdata/ComfyUI-Manager.git
git clone https://github.com/kijai/ComfyUI-WanVideoWrapper.git
# para UGC con lip-sync (opcional, cuando la marca lo pida):
git clone https://github.com/kijai/ComfyUI-LatentSyncWrapper.git
# reinicia ComfyUI
```

Modelos (Manager → Install Models o `wget` directo en `/workspace/ComfyUI/models/`):

| Carpeta | Archivo | Para |
|---|---|---|
| `unet/` | `flux1-dev.safetensors` | TEXT_CARD + SLIDESHOW_5 (imagen) |
| `vae/` | `ae.safetensors` | FLUX VAE |
| `clip/` | `clip_l.safetensors` + `t5xxl_fp16.safetensors` | FLUX text encoders |
| `diffusion_models/` | `wan2_2-T2V-A14B_fp8.safetensors` | CINEMATIC + UGC |
| `clip/` | `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | Wan text encoder |
| `vae/` | `wan_2.1_vae.safetensors` | Wan VAE |

Habilita la **API de ComfyUI** (ya viene activa por defecto en el puerto 8188). El
orquestador habla con ella en `http://<POD-IP>:8188/prompt`.

---

## 4. Workflows base (4 archivos, uno por formato)

Guarda estos en `comfy_workflows/` dentro del repo. Los exportas desde la UI de
ComfyUI con **Save (API Format)** después de armar cada gráfico.

```
comfy_workflows/
├─ cinematic_wan22.json         # text-to-video, 5 s @ 24 fps, 9:16
├─ ugc_wan22.json                # text-to-video con look selfie + node de LatentSync
├─ image_flux_dev.json           # genera 1 imagen 1080×1920
└─ slideshow_flux_dev_batch5.json  # batch de 5 imágenes con el mismo seed_base y prompts distintos
```

En cada workflow el orquestador parchea los siguientes nodos:

- `CLIPTextEncode` (positive) → prompt final con sufijos de estilo/cámara.
- `CLIPTextEncode` (negative) → `text, letters, logos, watermarks, distorted hands, blurry`.
- `EmptyLatentImage` o `EmptyHunyuanLatentVideo` → resolución 1080×1920 (Wan) / 1080×1920 (FLUX).
- Duración / nº de frames → `dur × fps`.
- `KSampler.seed` → del config.

---

## 5. Config YAML (define un anuncio entero)

`configs/marli_v2.yaml`:

```yaml
ad:
  name: marli_v2
  music: music.wav            # ya está en el repo, no se regenera
  fonts:
    headline: fonts/DMSerifDisplay-Regular.ttf
    body:     fonts/SpaceGrotesk.ttf
  brand:
    red:  "0xE24B4A"
    ink:  "0x2C2C2C"
    cream: "0xFAF6F1"
    grey: "0x6B6B6B"

beats:
  - id: hook
    type: CINEMATIC
    duration: 5
    style: editorial
    camera: slow-push-in
    seed: 42
    prompt: "small friendly geometric red robot mascot with glossy carbon-fiber body and white articulated joints, calm soft smiley screen face, sitting on a wooden desk in a minimalist cream psychology consultation room"
    overlay:                          # texto en post sobre el clip
      lines:
        - {text: "Tu consulta funciona.", font: body, size: 56, color: white, t_in: 0.4, y: 1340}
        - {text: "Pero depende solo de ti.", font: headline, size: 56, color: red, t_in: 0.95, y: 1430}
      scrim: bottom-40                # caja semitransparente bajo el texto

  - id: problem
    type: TEXT_CARD
    duration: 5
    background:
      style: editorial
      prompt: "empty minimalist cream psychology office at dawn, soft natural window light, papers softly on the desk"
      seed: 7
    headline: "+8 HORAS"
    subhead: "a la semana en tareas administrativas"
    kicker:  "EL PROBLEMA"

  - id: testimonial
    type: UGC
    duration: 5
    style: handheld
    camera: handheld
    seed: random
    prompt: "warm female therapist 30s in a cream consultation room with soft window light, looking calmly into the phone camera"
    audio:
      source: tts                     # tts | recorded
      text: "Llevo seis meses sin redactar un informe a mano. Marli me devolvió mi tiempo."
      voice_id: "your-elevenlabs-voice-id"
    subtitle: "PSICÓLOGA · CONSULTA PRIVADA"

  - id: razones
    type: SLIDESHOW_5
    duration: 5
    slide_dur: 1.0
    transition: hard-cut              # hard-cut | xfade-0.15 | flash
    sting: drum                       # drum | none — un golpe de tom en cada cambio
    style: editorial
    seed_base: 100
    slides:
      - {prompt: "close-up of a calm therapist's hands on a clean desk, cream office", overlay: "1 · Cero papeleo"}
      - {prompt: "phone screen showing a confirmed appointment notification, soft warm light", overlay: "2 · Citas automáticas"}
      - {prompt: "minimalist dashboard floating with red accents, cream office", overlay: "3 · Informes en segundos"}
      - {prompt: "happy patient leaving the consultation room", overlay: "4 · Más tiempo para tus pacientes"}
      - {prompt: "red robot mascot Li resting peacefully on a shelf, golden hour light", overlay: "5 · Un sistema propio"}

  - id: solution
    type: CINEMATIC
    duration: 5
    style: editorial
    camera: slow-orbit
    seed: 84
    prompt: "small friendly red robot mascot, soft translucent floating cards drifting around it with red accents, cream psychology office"
    overlay:
      lines:
        - {text: "Conoce a Li.", font: headline, size: 70, color: red, t_in: 0.4, y: 1330}
        - {text: "Tu asistente que nunca descansa.", font: body, size: 44, color: white, t_in: 0.95, y: 1440}
      scrim: bottom-40

  - id: cta
    type: TEXT_CARD
    duration: 5
    background:
      prompt: "soft cream studio with empty space at center for type, golden hour light"
      seed: 999
    headline: "en menos de 1 hora"
    pre_headline: "Automatiza tu consulta"
    subhead: "Sin cuotas. Sin técnicos."
    cta_pill: "AGENDA TU LLAMADA GRATIS"
    cta_url:  "marliagency.com"

audio_mix:                              # se aplica beat a beat sobre music.wav
  cinematic: {music: 0.85, voice: 0.0}
  text_card: {music: 0.85, voice: 0.0}
  ugc:       {music: 0.07, voice: 1.15} # voz dominante, música muy baja
  slideshow: {music: 0.85, sting: 1.0}
```

**Variaciones rápidas**: duplicas el YAML, cambias `style: editorial` por `style: noir`,
o `seed: 42` por `seed: random`, y tienes otra variante. Para sacar 3 takes del hook
distintos: `seed: random` y corres 3 veces.

---

## 6. Orquestador (`comfy_generate.py`)

Un solo script Python (sin dependencias externas más allá de `requests` opcional /
`urllib`). Lo dejo como **plantilla** — copiable al repo nuevo. Hace:

1. Lee el YAML.
2. Por cada beat carga el workflow JSON correspondiente y patchea: prompt, negative,
   seed, dimensiones, número de frames.
3. POST a `http://<POD>:8188/prompt` → obtiene `prompt_id`.
4. Polling a `/history/{id}` hasta completar.
5. Descarga el output (`/view?filename=...`) a local con el nombre canónico
   (`beat<n>_<type>_<id>.mp4` o `.png`).
6. Para TEXT_CARD: aplica `ffmpeg drawtext` con DM Serif (headline) + Space Grotesk
   (subhead/kicker) + brand sig "marli" + pill rojo si `cta_pill`.
7. Para SLIDESHOW_5: pega los 5 PNG con `ffmpeg concat` (1 s cada uno), opcional
   `xfade 0.15`, opcional sting de tambor por cambio.
8. Para UGC: si `audio.source: tts`, llama a ElevenLabs (necesitas `ELEVENLABS_KEY`),
   guarda voz, sincroniza con el clip (si activas LatentSync) o la mete encima.
9. Mezcla audio por beat según `audio_mix`.
10. Concatena los 6 beats y muxea `music.wav` → `<ad.name>.mp4`.

Esqueleto del script en el repo, listo para extender. Lee el config y produce el .mp4 final.

---

## 7. Montaje final en el Mac (idéntico al pipeline actual)

Si prefieres mantener la generación en RunPod y el ensamblado en el Mac:

1. En el pod, ejecutas `python3 comfy_generate.py configs/marli_v2.yaml` y se
   producen los `beat*.mp4` locales en `/workspace/output/marli_v2/`.
2. Bajas la carpeta entera (botón Files de RunPod o `rsync`).
3. En el Mac, dentro de `marli_ad/`:
   ```bash
   bash assemble_marli_cinematic.sh   # ya hace concat + mux con music.wav
   open marli_ad_v2.mp4
   ```

---

## 8. Coste de producción y tiempo por take

Con un pod **A40 (48 GB) a ~$0.80/h**:

| Beat | Resolución | Tiempo aprox |
|---|---|---|
| CINEMATIC 5 s (Wan 2.2) | 1080×1920 | ~2-3 min |
| UGC 5 s (Wan + LatentSync) | 720×1280 | ~4-5 min |
| TEXT_CARD (FLUX 1 img) | 1080×1920 | ~30 s |
| SLIDESHOW_5 (FLUX × 5) | 1080×1920 | ~2-3 min |

**Take completo del anuncio (6 beats)**: 15-20 min de pod + 2 min de montaje en Mac
≈ **$0.25-0.40 por take**. Iterar 10 takes ≈ **$3-4** + 2-3 h de tu tiempo.

Comparado con fal.ai (~$2 por take, sin setup): ComfyUI gana a partir de **~3-4 takes
o cuando quieres iterar estilos**. Para 1 take aislado, fal.ai es más rápido.

---

## 9. Próximos pasos sugeridos para el nuevo repo

1. Mueve `marli_ad/` (cards, fonts, music, scripts ffmpeg) al nuevo repo.
2. Añade `comfy_workflows/` con los 4 JSONs exportados de ComfyUI en API format.
3. Añade `configs/` con 2-3 YAMLs base (v2 estándar, v2 noir, v2 sin UGC).
4. Adapta `comfy_generate.py` para apuntar a la IP de tu pod y autenticar si pones
   un reverse proxy delante.
5. Mantén `assemble_marli_cinematic.sh` como punto de montaje final (es agnóstico
   al método de generación — sólo consume `beat<n>.mp4` + `music.wav`).
