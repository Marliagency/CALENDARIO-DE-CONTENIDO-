#!/bin/bash
# Marli Agency — Descarga y monta el anuncio 30s en Mac
# No necesita Python, solo curl (ya incluido en Mac) y ffmpeg
# Ejecutar: bash montar_mac.sh

set -e
DIR="$HOME/Desktop/marli-higgsfield"
mkdir -p "$DIR" && cd "$DIR"

echo "======================================"
echo "  Marli Agency — Anuncio 30s"
echo "  Clips generados con Higgsfield AI"
echo "======================================"

# ── 1. ffmpeg ─────────────────────────────────────────────────
if ! command -v ffmpeg &>/dev/null; then
  echo ""
  echo "[1/5] Descargando ffmpeg para Mac..."
  curl -L "https://evermeet.cx/ffmpeg/ffmpeg-7.1.zip" -o ffmpeg.zip --progress-bar
  unzip -o ffmpeg.zip && rm ffmpeg.zip
  chmod +x ffmpeg
  FFMPEG="./ffmpeg"
else
  FFMPEG="ffmpeg"
  echo "[1/5] ffmpeg ya instalado ✓"
fi

# ── 2. Clips Higgsfield ────────────────────────────────────────
echo ""
echo "[2/5] Descargando clips de Higgsfield AI..."

if [ ! -f clip1.mp4 ]; then
  echo "  Clip 1 (0-15s): Psicóloga + robot Li..."
  curl -L \
    "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/hf_20260527_134248_01b9c033-21d9-4ba3-82b6-d15a398e6a75.mp4" \
    -o clip1.mp4 --progress-bar
else
  echo "  clip1.mp4 ya existe ✓"
fi

if [ ! -f clip2.mp4 ]; then
  echo "  Clip 2 (15-30s): Sesión + robot hero + CTA..."
  curl -L \
    "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/hf_20260527_134242_b9a39831-68c3-477e-bb67-615217d9b776.mp4" \
    -o clip2.mp4 --progress-bar
else
  echo "  clip2.mp4 ya existe ✓"
fi

# ── 3. Audio ──────────────────────────────────────────────────
echo ""
echo "[3/5] Descargando audio (narración + música)..."
BRANCH="claude%2Fadmiring-tesla-AasgU"
BASE="https://raw.githubusercontent.com/marliagency/CALENDARIO-DE-CONTENIDO-/${BRANCH}/marli-ad-assets"

[ ! -f audio1.wav ] && curl -L "${BASE}/audio_clip1.wav" -o audio1.wav --progress-bar || echo "  audio1.wav ya existe ✓"
[ ! -f audio2.wav ] && curl -L "${BASE}/audio_clip2.wav" -o audio2.wav --progress-bar || echo "  audio2.wav ya existe ✓"

# ── 4. Mezcla audio + video ───────────────────────────────────
echo ""
echo "[4/5] Mezclando audio con clips..."
$FFMPEG -y -i clip1.mp4 -i audio1.wav \
  -c:v copy -c:a aac -b:a 192k -shortest \
  clip1_mix.mp4 -loglevel error
echo "  Clip 1 mezclado ✓"

$FFMPEG -y -i clip2.mp4 -i audio2.wav \
  -c:v copy -c:a aac -b:a 192k -shortest \
  clip2_mix.mp4 -loglevel error
echo "  Clip 2 mezclado ✓"

# ── 5. Concatenar ─────────────────────────────────────────────
echo ""
echo "[5/5] Montando video final 30s..."
printf "file 'clip1_mix.mp4'\nfile 'clip2_mix.mp4'\n" > lista.txt

$FFMPEG -y -f concat -safe 0 -i lista.txt \
  -c:v libx264 -crf 18 -preset medium \
  -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  Marli_Final_Higgsfield_30s.mp4 -loglevel error

echo ""
echo "======================================"
echo "  LISTO: $DIR/Marli_Final_Higgsfield_30s.mp4"
echo "  Formato: 1080x1920  |  30s  |  Higgsfield kling3_0 pro"
echo "======================================"
open .
