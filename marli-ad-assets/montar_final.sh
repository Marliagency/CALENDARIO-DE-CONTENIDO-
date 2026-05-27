#!/bin/bash
# Marli Agency — Video final completo con clips reales de Higgsfield
# Ejecutar: bash montar_final.sh
set -e

DIR="$HOME/Desktop/marli-higgsfield"
mkdir -p "$DIR" && cd "$DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'; BOLD='\033[1m'
echo -e "${BOLD}======================================"
echo -e "  Marli Agency — Video Final 55s"
echo -e "  4 clips Higgsfield + texto + música"
echo -e "======================================${NC}"

# ── 1. FFMPEG ─────────────────────────────────────────────────────────────
if ! command -v ffmpeg &>/dev/null; then
  echo -e "\n[1/6] Descargando ffmpeg..."
  # Try version 6 (Mojave compatible)
  curl -L "https://evermeet.cx/ffmpeg/ffmpeg-6.0.zip" -o ff.zip --progress-bar 2>/dev/null || \
  curl -L "https://evermeet.cx/ffmpeg/getrelease/6.0/zip" -o ff.zip --progress-bar
  unzip -o ff.zip -d . && rm -f ff.zip
  chmod +x ffmpeg
  FF="$(pwd)/ffmpeg"
else
  FF="ffmpeg"
  echo -e "\n[1/6] ffmpeg ya instalado ✓"
fi

# ── 2. DESCARGAR CLIPS HIGGSFIELD ─────────────────────────────────────────
echo -e "\n[2/6] Descargando 4 clips de Higgsfield AI..."

dl() {
  local url="$1" file="$2" label="$3"
  if [ -f "$file" ] && [ $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file") -gt 100000 ]; then
    echo -e "  ${GREEN}✓${NC} $label ya existe"
  else
    echo -e "  ↓ $label..."
    curl -L "$url" -o "$file" --progress-bar
    echo -e "  ${GREEN}✓${NC} $label descargado"
  fi
}

dl "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/hf_20260527_134248_01b9c033-21d9-4ba3-82b6-d15a398e6a75.mp4" \
   "clip1.mp4" "Clip 1 — Psicóloga + robot (15s)"

dl "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/hf_20260527_134242_b9a39831-68c3-477e-bb67-615217d9b776.mp4" \
   "clip2.mp4" "Clip 2 — Sesión + hero + CTA (15s)"

dl "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/hf_20260527_150734_5c2da191-8aff-4c90-9378-93d187f122cb.mp4" \
   "ugc1.mp4" "UGC 1 — Testimonio psicóloga (10s)"

dl "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/hf_20260527_144456_a21f0d68-f19b-4023-97fb-d6ba092fd073.mp4" \
   "ugc2.mp4" "UGC 2 — 3 beneficios + CTA (15s)"

# ── 3. DESCARGAR MÚSICA ───────────────────────────────────────────────────
echo -e "\n[3/6] Descargando música dinámica..."
BRANCH="claude%2Fadmiring-tesla-AasgU"
BASE="https://raw.githubusercontent.com/marliagency/CALENDARIO-DE-CONTENIDO-/${BRANCH}/marli-ad-assets"
[ ! -f "music.wav" ] && curl -L "${BASE}/audio_clip1.wav" -o music_part1.wav --progress-bar
[ ! -f "music.wav" ] && curl -L "${BASE}/audio_clip2.wav" -o music_part2.wav --progress-bar
if [ ! -f "music.wav" ] && [ -f "music_part1.wav" ] && [ -f "music_part2.wav" ]; then
  "$FF" -y -i music_part1.wav -i music_part2.wav \
    -filter_complex "[0][1]concat=n=2:v=0:a=1" music.wav -loglevel error
fi
echo -e "  ${GREEN}✓${NC} Música lista"

# ── 4. TEXTO ANIMADO EN CLIPS CINEMATOGRÁFICOS ────────────────────────────
echo -e "\n[4/6] Añadiendo texto animado a clips cinematográficos..."

FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
[ ! -f "$FONT" ] && FONT="/System/Library/Fonts/Helvetica.ttc"
[ ! -f "$FONT" ] && FONT="/System/Library/Fonts/Arial.ttf"

fade() { echo "if(lt(t,$1),0,if(lt(t,$1+0.4),(t-$1)/0.4,if(lt(t,$2-0.4),1,if(lt(t,$2),($2-t)/0.4,0))))"; }

A1=$(fade 0.3 4.5)
A2=$(fade 5.8 9.0)
A3=$(fade 10.2 12.8)
A4=$(fade 10.5 12.8)

"$FF" -y -i clip1.mp4 \
  -vf "drawtext=text='¿Cansada de perder pacientes?':font='Arial Bold':fontsize=52:fontcolor=white:shadowcolor=black@0.7:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h*0.10:alpha='${A1}':enable='between(t,0.3,4.5)',
drawtext=text='El cambio está llegando...':font='Arial':fontsize=38:fontcolor=white@0.9:shadowcolor=black@0.6:shadowx=1:shadowy=1:x=(w-text_w)/2:y=h*0.88:alpha='${A2}':enable='between(t,5.8,9)',
drawtext=text='Descubrí':font='Arial Bold':fontsize=70:fontcolor=white:shadowcolor=black@0.8:shadowx=3:shadowy=3:x=(w-text_w)/2:y=h*0.42:alpha='${A3}':enable='between(t,10.2,12.8)',
drawtext=text='MARLI AGENCY':font='Arial Bold':fontsize=84:fontcolor=#E24B4A:shadowcolor=black@0.8:shadowx=3:shadowy=3:x=(w-text_w)/2:y=h*0.52:alpha='${A4}':enable='between(t,10.5,12.8)'" \
  -c:v libx264 -crf 17 -preset fast -c:a copy \
  clip1_text.mp4 -loglevel error
echo -e "  ${GREEN}✓${NC} Clip 1 con texto"

B1=$(fade 0.5 6.0)
B2=$(fade 1.0 6.0)
B3=$(fade 7.0 11.0)
B4=$(fade 7.3 11.0)
B5=$(fade 11.5 14.5)
B6=$(fade 11.8 14.5)

"$FF" -y -i clip2.mp4 \
  -vf "drawtext=text='Tu consulta,':font='Arial Bold':fontsize=56:fontcolor=white:shadowcolor=black@0.7:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h*0.84:alpha='${B1}':enable='between(t,0.5,6)',
drawtext=text='en orden.':font='Arial Bold':fontsize=56:fontcolor=white:shadowcolor=black@0.7:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h*0.91:alpha='${B2}':enable='between(t,1,6)',
drawtext=text='MARLI AGENCY':font='Arial Bold':fontsize=80:fontcolor=white:shadowcolor=black@0.9:shadowx=4:shadowy=4:x=(w-text_w)/2:y=h*0.38:alpha='${B3}':enable='between(t,7,11)',
drawtext=text='IA para Psicólogos':font='Arial':fontsize=46:fontcolor=#FFCFC5:shadowcolor=black@0.6:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h*0.48:alpha='${B4}':enable='between(t,7.3,11)',
drawtext=text='marliagency.com':font='Arial Bold':fontsize=72:fontcolor=white:shadowcolor=#E24B4A@0.8:shadowx=3:shadowy=3:x=(w-text_w)/2:y=(h-text_h)/2:alpha='${B5}':enable='between(t,11.5,14.5)',
drawtext=text='Empieza gratis hoy':font='Arial':fontsize=42:fontcolor=#FFCFC5:x=(w-text_w)/2:y=h*0.60:alpha='${B6}':enable='between(t,11.8,14.5)'" \
  -c:v libx264 -crf 17 -preset fast -c:a copy \
  clip2_text.mp4 -loglevel error
echo -e "  ${GREEN}✓${NC} Clip 2 con texto"

# ── 5. MEZCLAR MÚSICA CON TODOS LOS CLIPS ────────────────────────────────
echo -e "\n[5/6] Mezclando música dinámica..."

mix_audio() {
  local vid="$1" out="$2" ts="$3" te="$4" vol_vid="${5:-0.8}" vol_mus="${6:-0.45}"
  "$FF" -y -i "$vid" -i music.wav \
    -filter_complex \
    "[0:a]volume=${vol_vid}[va];[1]atrim=${ts}:${te},aresample=44100,volume=${vol_mus}[vmu];[va][vmu]amix=inputs=2:duration=first[out]" \
    -map "0:v" -map "[out]" \
    -c:v copy -c:a aac -b:a 192k "$out" -loglevel error
}

mix_audio clip1_text.mp4 clip1_final.mp4  0  15
echo -e "  ${GREEN}✓${NC} Clip 1 + música"
mix_audio clip2_text.mp4 clip2_final.mp4 15  30
echo -e "  ${GREEN}✓${NC} Clip 2 + música"
mix_audio ugc1.mp4        ugc1_final.mp4  30  40  1.0  0.35
echo -e "  ${GREEN}✓${NC} UGC 1 + música"
mix_audio ugc2.mp4        ugc2_final.mp4  40  55  1.0  0.35
echo -e "  ${GREEN}✓${NC} UGC 2 + música"

# ── 6. CONCATENAR LOS 4 ───────────────────────────────────────────────────
echo -e "\n[6/6] Uniendo los 4 clips en video final..."
printf "file 'clip1_final.mp4'\nfile 'clip2_final.mp4'\nfile 'ugc1_final.mp4'\nfile 'ugc2_final.mp4'\n" > concat_final.txt

"$FF" -y -f concat -safe 0 -i concat_final.txt \
  -c:v libx264 -crf 17 -preset medium \
  -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  Marli_Final_Higgsfield_55s.mp4 -loglevel error

SIZE=$(du -sh Marli_Final_Higgsfield_55s.mp4 | cut -f1)
echo -e "\n${GREEN}${BOLD}======================================"
echo -e "  ✅ LISTO: Marli_Final_Higgsfield_55s.mp4"
echo -e "  Tamaño: ${SIZE}  |  55s  |  1080×1920"
echo -e "  4 clips Higgsfield kling3_0 pro"
echo -e "======================================${NC}"

# Limpiar temporales
rm -f clip1_text.mp4 clip2_text.mp4 clip1_final.mp4 clip2_final.mp4 \
      ugc1_final.mp4 ugc2_final.mp4 concat_final.txt music_part1.wav music_part2.wav

open .
