#!/bin/bash
# Marli Agency — Video Final v2
# Voz: ElevenLabs Neural (español profesional)
# Clips: Higgsfield kling3_0 pro (1080×1920)
# Texto: overlays cinematográficos animados
# Ejecutar: bash montar_v2.sh

set -e
BOLD='\033[1m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
DIR="$HOME/Desktop/marli-higgsfield"
mkdir -p "$DIR" && cd "$DIR"

# Detectar Python disponible (Mojave tiene python 2.7, no python3)
PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null || echo "")
if [ -z "$PYTHON" ]; then
  echo -e "${RED}Error: Python no encontrado. Instala Python desde python.org${NC}"
  exit 1
fi
echo -e "  Python: $PYTHON ($(${PYTHON} --version 2>&1))"

echo -e "${BOLD}${BLUE}============================================"
echo -e "  Marli Agency — Video Final v2"
echo -e "  ElevenLabs + Higgsfield + Música"
echo -e "============================================${NC}"

# ── CONFIG ────────────────────────────────────────────────────────────────────
ELABS_KEY="sk_c837f0ca86c68656206fe1e198b2e5bc444ff40bf61f59bc"
ELABS_MODEL="eleven_multilingual_v2"
FF=$(command -v ffmpeg || echo "./ffmpeg")

# ── 1. FFMPEG ─────────────────────────────────────────────────────────────────
echo -e "\n[1/6] ${BOLD}Verificando ffmpeg...${NC}"
if ! command -v ffmpeg &>/dev/null; then
  echo "  Descargando ffmpeg 6.0..."
  curl -L "https://evermeet.cx/ffmpeg/ffmpeg-6.0.zip" -o ff.zip --progress-bar
  unzip -o ff.zip -d . && rm -f ff.zip && chmod +x ffmpeg
  FF="$(pwd)/ffmpeg"
fi
echo -e "  ${GREEN}✓${NC} ffmpeg listo"

# ── 2. DESCARGAR CLIPS HIGGSFIELD ─────────────────────────────────────────────
echo -e "\n[2/6] ${BOLD}Descargando clips Higgsfield...${NC}"
dl() {
  local url="$1" file="$2" label="$3"
  if [ -f "$file" ] && [ $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file") -gt 500000 ]; then
    echo -e "  ${GREEN}✓${NC} $label ya existe"
  else
    echo -e "  ↓ Descargando $label..."
    curl -L "$url" -o "$file" --progress-bar
    echo -e "  ${GREEN}✓${NC} $label listo"
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

# ── 3. VOCES ──────────────────────────────────────────────────────────────────
echo -e "\n[3/6] ${BOLD}Generando voces...${NC}"

# Python 2/3 compatible — intenta ElevenLabs con modelos en orden de precio
$PYTHON << PYEOF
from __future__ import print_function
import json, sys, os

try:
    from urllib.request import Request, urlopen
    from urllib.error import HTTPError
except ImportError:
    from urllib2 import Request, urlopen, HTTPError

API_KEY = "$ELABS_KEY"
BASE    = "https://api.elevenlabs.io"

def api_get(path):
    req = Request(BASE + path, headers={"xi-api-key": API_KEY})
    r = urlopen(req, timeout=20)
    return json.loads(r.read().decode("utf-8"))

# Obtener mejor voz
voice_id = "21m00Tcm4TlvDq8ikWAM"
try:
    data = api_get("/v1/voices")
    voices = data.get("voices", [])
    for v in voices:
        labels = str(v.get("labels", {})).lower()
        if any(x in labels for x in ["spanish","espanol","latin","castilian"]):
            voice_id = v["voice_id"]; break
    else:
        for v in voices:
            if "female" in str(v.get("labels", {})).lower():
                voice_id = v["voice_id"]; break
    print("  Voice: " + voice_id + " (" + str(len(voices)) + " disponibles)")
except Exception as e:
    print("  Voz fallback: " + voice_id + " (" + str(e) + ")")

# Probar modelos de menor a mayor costo
MODELS = [
    "eleven_flash_v2_5",   # mas barato y rapido
    "eleven_turbo_v2_5",
    "eleven_turbo_v2",
    "eleven_multilingual_v2",
]

def gen_voz(texto, salida, desc):
    for model in MODELS:
        body = json.dumps({
            "text": texto,
            "model_id": model,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
        })
        payload = body.encode("utf-8")
        req = Request(
            BASE + "/v1/text-to-speech/" + voice_id,
            data=payload,
            headers={"xi-api-key": API_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"}
        )
        try:
            r = urlopen(req, timeout=45)
            data = r.read()
            if len(data) > 1000:
                with open(salida, "wb") as f:
                    f.write(data)
                print("  OK " + desc + " [" + model + "] (" + str(len(data)//1024) + "KB)")
                return True
        except HTTPError as e:
            if e.code == 402:
                print("  402 con " + model + ", probando siguiente...")
                continue
            print("  HTTP " + str(e.code) + " en " + desc)
            return False
        except Exception as e:
            print("  Error: " + str(e))
            return False
    print("  Sin creditos ElevenLabs para " + desc)
    return False

textos = [
    ("Te suena familiar? Pacientes perdidos. Agenda caotica. Noches sin dormir. Marli Agency lo cambia todo.", "voz1.mp3", "Clip 1"),
    ("Marli Agency. Inteligencia artificial para psicologos. Tu consulta, perfectamente organizada.", "voz2.mp3", "Clip 2"),
    ("Soy psicologa y Marli Agency cambio todo. Agenda automatica. Pacientes atendidos. Yo, tranquila.", "voz3.mp3", "UGC 1"),
    ("Agenda automatica. Recordatorios inteligentes. Seguimiento personalizado. Empieza gratis en marliagency punto com.", "voz4.mp3", "UGC 2"),
]

ok = sum(1 for t, s, d in textos if gen_voz(t, s, d))
print("\n  " + str(ok) + "/4 voces ElevenLabs OK")
PYEOF

# Fallback con "say" (TTS nativo de Mac — mucho mejor que espeak)
# Detectar voz española disponible en el sistema
VOZ_ES=$(say -v '?' 2>/dev/null | grep -iE "es_|Monica|Paulina|Jorge|Spanish" | head -1 | awk '{print $1}')
[ -z "$VOZ_ES" ] && VOZ_ES="Paulina"  # default español México

for i in 1 2 3 4; do
  SZ=$(stat -f%z "voz${i}.mp3" 2>/dev/null || stat -c%s "voz${i}.mp3" 2>/dev/null || echo 0)
  if [ ! -f "voz${i}.mp3" ] || [ "$SZ" -lt 1000 ]; then
    echo -e "  Usando 'say' (Mac TTS) para voz$i con voz $VOZ_ES..."
    case $i in
      1) TEXTO="Te suena familiar? Pacientes perdidos. Agenda caotica. Noches sin dormir. Marli Agency lo cambia todo." ;;
      2) TEXTO="Marli Agency. Inteligencia artificial para psicologos. Tu consulta, perfectamente organizada." ;;
      3) TEXTO="Soy psicologa y Marli Agency cambio todo. Agenda automatica. Pacientes atendidos. Yo, tranquila." ;;
      4) TEXTO="Agenda automatica. Recordatorios inteligentes. Seguimiento personalizado. Empieza gratis en marliagency punto com." ;;
    esac
    say -v "$VOZ_ES" -r 155 "$TEXTO" -o "voz${i}_raw.aiff" 2>/dev/null && \
      "$FF" -y -i "voz${i}_raw.aiff" -ar 44100 -ac 1 "voz${i}.mp3" -loglevel error < /dev/null && \
      rm -f "voz${i}_raw.aiff" && \
      echo -e "  ${GREEN}✓${NC} voz${i} generada con say ($VOZ_ES)" || \
      echo -e "  ${RED}✗${NC} Error generando voz${i}"
  fi
done

# Convertir MP3 a WAV
for i in 1 2 3 4; do
  "$FF" -y -i "voz${i}.mp3" -ar 44100 -ac 1 "voz${i}.wav" -loglevel error < /dev/null 2>/dev/null && \
    echo -e "  ${GREEN}✓${NC} voz${i}.wav lista" || echo -e "  ${RED}✗${NC} voz${i}.mp3 faltante"
done

# ── 4. MÚSICA CINEMATOGRÁFICA (ffmpeg nativo, sin Python/numpy) ───────────────
echo -e "\n[4/6] ${BOLD}Generando música cinematográfica...${NC}"

# Progresion Am-F-C-G con cuatro segmentos concatenados via ffmpeg aevalsrc
# Am (0-15s): A110+A220+C261.6+E329.6
# F  (15-30s): F87.3+F174.6+A220+C261.6
# C  (30-40s): C130.8+E164.8+G196+C261.6
# Gm (40-55s): G98+D146.8+G196+B246.9

"$FF" -y -f lavfi \
  -i "aevalsrc=sin(2*PI*110*t)*0.28+sin(2*PI*220*t)*0.22+sin(2*PI*261.6*t)*0.18+sin(2*PI*329.6*t)*0.14+sin(2*PI*220*t*1.002)*0.08:s=44100:d=15" \
  -f lavfi \
  -i "aevalsrc=sin(2*PI*87.3*t)*0.28+sin(2*PI*174.6*t)*0.22+sin(2*PI*220*t)*0.18+sin(2*PI*261.6*t)*0.14+sin(2*PI*174.6*t*1.002)*0.08:s=44100:d=15" \
  -f lavfi \
  -i "aevalsrc=sin(2*PI*130.8*t)*0.28+sin(2*PI*164.8*t)*0.22+sin(2*PI*196*t)*0.18+sin(2*PI*261.6*t)*0.14+sin(2*PI*130.8*t*1.002)*0.08:s=44100:d=10" \
  -f lavfi \
  -i "aevalsrc=sin(2*PI*98*t)*0.28+sin(2*PI*146.8*t)*0.22+sin(2*PI*196*t)*0.18+sin(2*PI*246.9*t)*0.14+sin(2*PI*98*t*1.002)*0.08:s=44100:d=15" \
  -filter_complex \
    "[0]afade=t=in:st=0:d=2[a0];
     [1]afade=t=in:st=0:d=0.3[a1];
     [2]afade=t=in:st=0:d=0.3[a2];
     [3]afade=t=in:st=0:d=0.3,afade=t=out:st=12:d=3[a3];
     [a0][a1][a2][a3]concat=n=4:v=0:a=1,volume=0.75[aout]" \
  -map "[aout]" music.wav -loglevel error < /dev/null

echo -e "  ${GREEN}✓${NC} Música generada (Am-F-C-G cinematic, 55s)"

# ── 5. TEXTO CINEMATOGRÁFICO + MEZCLA AUDIO ───────────────────────────────────
echo -e "\n[5/6] ${BOLD}Añadiendo texto y mezclando audio...${NC}"

FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
[ ! -f "$FONT" ] && FONT="/System/Library/Fonts/Helvetica.ttc"
[ ! -f "$FONT" ] && FONT="/System/Library/Fonts/Arial.ttf"

# Función fade para alpha de texto
fade() { echo "if(lt(t,$1),0,if(lt(t,$1+0.5),(t-$1)/0.5,if(lt(t,$2-0.4),1,if(lt(t,$2),($2-t)/0.4,0))))"; }

mix_and_text() {
  local clip="$1" voz_wav="$2" out="$3" t_mus_start="$4" t_mus_end="$5"
  shift 5
  local vf_filter="$@"

  "$FF" -y -i "$clip" -i "$voz_wav" -i music.wav \
    -filter_complex "
      [0:a]volume=0.3[va];
      [1:a]volume=1.0[vv];
      [2]atrim=${t_mus_start}:${t_mus_end},aresample=44100,volume=0.35[vm];
      [va][vv][vm]amix=inputs=3:duration=first:weights='0.3 1.0 0.35'[aout]
    " \
    -map "0:v" -map "[aout]" \
    -vf "$vf_filter" \
    -c:v libx264 -crf 16 -preset fast \
    -c:a aac -b:a 192k \
    "$out" -loglevel error < /dev/null
}

# CLIP 1: Psicóloga agotada → robot aparece
A1=$(fade 0.4 4.0); A2=$(fade 4.5 8.5); A3=$(fade 9.0 13.5); A4=$(fade 9.3 13.5)
mix_and_text clip1.mp4 voz1.wav clip1_final.mp4 0 15 \
  "drawtext=text='¿Te suena familiar?':font='Arial Bold':fontsize=58:fontcolor=white:shadowcolor=black@0.75:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h*0.12:alpha='${A1}':enable='between(t,0.4,4)',
  drawtext=text='Agenda caótica.':font='Arial':fontsize=42:fontcolor=white@0.9:shadowcolor=black@0.6:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h*0.86:alpha='${A2}':enable='between(t,4.5,8.5)',
  drawtext=text='MARLI':font='Arial Bold':fontsize=96:fontcolor=white:shadowcolor=#E24B4A@0.9:shadowx=4:shadowy=4:x=(w-text_w)/2:y=h*0.40:alpha='${A3}':enable='between(t,9,13.5)',
  drawtext=text='AGENCY':font='Arial Bold':fontsize=96:fontcolor=#E24B4A:shadowcolor=black@0.8:shadowx=3:shadowy=3:x=(w-text_w)/2:y=h*0.52:alpha='${A4}':enable='between(t,9.3,13.5)'"
echo -e "  ${GREEN}✓${NC} Clip 1 con voz y texto"

# CLIP 2: Sesión tranquila → robot hero → CTA
B1=$(fade 0.5 5.5); B2=$(fade 6.0 10.0); B3=$(fade 6.3 10.0); B4=$(fade 10.5 14.5); B5=$(fade 10.8 14.5)
mix_and_text clip2.mp4 voz2.wav clip2_final.mp4 15 30 \
  "drawtext=text='Tu consulta,':font='Arial Bold':fontsize=60:fontcolor=white:shadowcolor=black@0.8:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h*0.82:alpha='${B1}':enable='between(t,0.5,5.5)',
  drawtext=text='perfectamente organizada.':font='Arial':fontsize=40:fontcolor=white@0.9:x=(w-text_w)/2:y=h*0.90:alpha='${B1}':enable='between(t,0.5,5.5)',
  drawtext=text='MARLI AGENCY':font='Arial Bold':fontsize=82:fontcolor=white:shadowcolor=black@0.9:shadowx=4:shadowy=4:x=(w-text_w)/2:y=h*0.36:alpha='${B2}':enable='between(t,6,10)',
  drawtext=text='IA para Psicólogos':font='Arial':fontsize=48:fontcolor=#FFCFC5:shadowcolor=black@0.6:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h*0.47:alpha='${B3}':enable='between(t,6.3,10)',
  drawtext=text='marliagency.com':font='Arial Bold':fontsize=74:fontcolor=white:shadowcolor=#E24B4A@0.9:shadowx=3:shadowy=3:x=(w-text_w)/2:y=(h-text_h)/2:alpha='${B4}':enable='between(t,10.5,14.5)',
  drawtext=text='Empieza gratis hoy':font='Arial':fontsize=44:fontcolor=#FFCFC5:x=(w-text_w)/2:y=h*0.60:alpha='${B5}':enable='between(t,10.8,14.5)'"
echo -e "  ${GREEN}✓${NC} Clip 2 con voz y texto"

# UGC 1: Testimonio psicóloga (voz como protagonista)
C1=$(fade 0.3 4.5); C2=$(fade 5.0 9.0)
mix_and_text ugc1.mp4 voz3.wav ugc1_final.mp4 30 40 \
  "drawtext=text='Soy psicóloga...':font='Arial Bold':fontsize=52:fontcolor=white:shadowcolor=black@0.7:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h*0.88:alpha='${C1}':enable='between(t,0.3,4.5)',
  drawtext=text='Marli Agency lo cambió todo':font='Arial Bold':fontsize=50:fontcolor=#E24B4A:shadowcolor=black@0.8:shadowx=3:shadowy=3:x=(w-text_w)/2:y=h*0.88:alpha='${C2}':enable='between(t,5,9)'"
echo -e "  ${GREEN}✓${NC} UGC 1 con voz"

# UGC 2: 3 beneficios → CTA
D1=$(fade 0.4 4.0); D2=$(fade 4.5 8.5); D3=$(fade 9.0 12.0); D4=$(fade 12.5 14.5)
mix_and_text ugc2.mp4 voz4.wav ugc2_final.mp4 40 55 \
  "drawtext=text='✓ Agenda automática':font='Arial Bold':fontsize=50:fontcolor=white:shadowcolor=black@0.7:shadowx=2:shadowy=2:x=w*0.07:y=h*0.55:alpha='${D1}':enable='between(t,0.4,4)',
  drawtext=text='✓ Recordatorios inteligentes':font='Arial Bold':fontsize=50:fontcolor=white:shadowcolor=black@0.7:shadowx=2:shadowy=2:x=w*0.07:y=h*0.65:alpha='${D1}':enable='between(t,0.4,4)',
  drawtext=text='✓ Seguimiento personalizado':font='Arial Bold':fontsize=50:fontcolor=white:shadowcolor=black@0.7:shadowx=2:shadowy=2:x=w*0.07:y=h*0.75:alpha='${D1}':enable='between(t,0.4,4)',
  drawtext=text='marliagency.com':font='Arial Bold':fontsize=80:fontcolor=white:shadowcolor=#E24B4A@0.9:shadowx=4:shadowy=4:x=(w-text_w)/2:y=(h-text_h)/2:alpha='${D3}':enable='between(t,9,12)',
  drawtext=text='Empieza GRATIS':font='Arial Bold':fontsize=56:fontcolor=#E24B4A:shadowcolor=black@0.8:shadowx=3:shadowy=3:x=(w-text_w)/2:y=h*0.60:alpha='${D4}':enable='between(t,12.5,14.5)'"
echo -e "  ${GREEN}✓${NC} UGC 2 con voz y CTA"

# ── 6. CONCATENAR FINAL ────────────────────────────────────────────────────────
echo -e "\n[6/6] ${BOLD}Montando video final...${NC}"
printf "file 'clip1_final.mp4'\nfile 'clip2_final.mp4'\nfile 'ugc1_final.mp4'\nfile 'ugc2_final.mp4'\n" > concat_v2.txt

"$FF" -y -f concat -safe 0 -i concat_v2.txt \
  -c:v libx264 -crf 16 -preset medium \
  -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  Marli_Final_v2_ElevenLabs_55s.mp4 -loglevel error < /dev/null

# Limpiar temporales
rm -f clip1_final.mp4 clip2_final.mp4 ugc1_final.mp4 ugc2_final.mp4 \
      concat_v2.txt voz1.mp3 voz2.mp3 voz3.mp3 voz4.mp3 \
      voz1.wav voz2.wav voz3.wav voz4.wav

SIZE=$(du -sh Marli_Final_v2_ElevenLabs_55s.mp4 | cut -f1)
echo ""
echo -e "${GREEN}${BOLD}============================================"
echo -e "  ✅ LISTO: Marli_Final_v2_ElevenLabs_55s.mp4"
echo -e "  Tamaño: ${SIZE} | 55s | 1080×1920"
echo -e "  Voz: ElevenLabs Neural Español"
echo -e "  Música: Cinematográfica Am-F-C-G"
echo -e "  4 clips Higgsfield kling3_0 pro"
echo -e "============================================${NC}"
echo ""
echo -e "  📁 Guardado en: $DIR/"

open "$DIR"
