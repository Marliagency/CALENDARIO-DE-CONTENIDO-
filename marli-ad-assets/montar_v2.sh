#!/bin/bash
# Marli Agency - Video Final v3
# Voz: ElevenLabs espanol (language_code=es, multilingual_v2 primero)
# UGC: audio original del hablante, sin voiceover
# Texto: SF Pro Bold / Helvetica Neue Bold, TODO EN MAYUSCULAS
# Musica: Am-F-C-G + kick drum + hi-hat cinematico
# Ejecutar: bash montar_v2.sh

set -e
BOLD='\033[1m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
DIR="$HOME/Desktop/marli-higgsfield"
mkdir -p "$DIR" && cd "$DIR"

PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null || echo "")
[ -z "$PYTHON" ] && echo -e "${RED}Error: Python no encontrado.${NC}" && exit 1

echo -e "${BOLD}${BLUE}============================================"
echo -e "  Marli Agency - Video Final v3"
echo -e "  SF Pro + Espanol + Musica dinamica"
echo -e "============================================${NC}"

ELABS_KEY="sk_c837f0ca86c68656206fe1e198b2e5bc444ff40bf61f59bc"
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

# ── 2. CLIPS ──────────────────────────────────────────────────────────────────
echo -e "\n[2/6] ${BOLD}Descargando clips Higgsfield...${NC}"
dl() {
  local url="$1" file="$2" label="$3"
  if [ -f "$file" ] && [ $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file") -gt 500000 ]; then
    echo -e "  ${GREEN}✓${NC} $label ya existe"
  else
    echo -e "  Descargando $label..."
    curl -L "$url" -o "$file" --progress-bar
    echo -e "  ${GREEN}✓${NC} $label listo"
  fi
}
dl "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/hf_20260527_134248_01b9c033-21d9-4ba3-82b6-d15a398e6a75.mp4" "clip1.mp4" "Clip 1"
dl "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/hf_20260527_134242_b9a39831-68c3-477e-bb67-615217d9b776.mp4" "clip2.mp4" "Clip 2"
dl "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/hf_20260527_150734_5c2da191-8aff-4c90-9378-93d187f122cb.mp4" "ugc1.mp4" "UGC 1"
dl "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/hf_20260527_144456_a21f0d68-f19b-4023-97fb-d6ba092fd073.mp4" "ugc2.mp4" "UGC 2"

# ── 3. VOCES EN ESPANOL (solo clips 1 y 2) ────────────────────────────────────
echo -e "\n[3/6] ${BOLD}Generando voces en espanol...${NC}"

$PYTHON << PYEOF
from __future__ import print_function
import json, sys

try:
    from urllib.request import Request, urlopen
    from urllib.error import HTTPError
except ImportError:
    from urllib2 import Request, urlopen, HTTPError

API_KEY = "$ELABS_KEY"
BASE = "https://api.elevenlabs.io"

def api_get(path):
    req = Request(BASE + path, headers={"xi-api-key": API_KEY})
    r = urlopen(req, timeout=20)
    return json.loads(r.read().decode("utf-8"))

# Buscar voz en espanol buscando en todos los campos label
SPANISH = ["es", "spanish", "espanol", "latin", "mexico", "colombian",
           "castilian", "argentinian", "iberian", "hispano"]
# Default: Adam (pNInz6obpgDQGcFmaJgB) suena bien en espanol con multilingual_v2
voice_id = "pNInz6obpgDQGcFmaJgB"
voice_name = "Adam (default multilingual)"

try:
    data = api_get("/v1/voices")
    voices = data.get("voices", [])
    found = None
    for v in voices:
        labels = v.get("labels", {})
        all_text = " ".join(str(x) for x in list(labels.keys()) + list(labels.values())).lower()
        if any(x in all_text for x in SPANISH):
            found = v
            break
    if found:
        voice_id = found["voice_id"]
        voice_name = found.get("name", "?")
        print("  Voz espanola encontrada: " + voice_name + " (" + voice_id[:8] + "...)")
    else:
        print("  Sin voz espanola en la cuenta. Usando " + voice_name)
        print("  Tip: agrega una voz espanola en elevenlabs.io/voice-library")
except Exception as e:
    print("  Error buscando voz: " + str(e))

# Usar multilingual_v2 primero para mejor calidad en espanol
MODELS = ["eleven_multilingual_v2", "eleven_turbo_v2_5", "eleven_flash_v2_5", "eleven_turbo_v2"]
LANG_MODELS = {"eleven_multilingual_v2", "eleven_turbo_v2_5", "eleven_flash_v2_5"}

def gen_voz(texto, salida, desc):
    for model in MODELS:
        body = {
            "text": texto,
            "model_id": model,
            "voice_settings": {
                "stability": 0.20,
                "similarity_boost": 0.85,
                "style": 0.70,
                "use_speaker_boost": True
            }
        }
        if model in LANG_MODELS:
            body["language_code"] = "es"
        req = Request(
            BASE + "/v1/text-to-speech/" + voice_id,
            data=json.dumps(body).encode("utf-8"),
            headers={"xi-api-key": API_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"}
        )
        try:
            r = urlopen(req, timeout=60)
            data = r.read()
            if len(data) > 1000:
                f = open(salida, "wb"); f.write(data); f.close()
                print("  OK " + desc + " [" + model + "] (" + str(len(data)//1024) + "KB)")
                return True
        except HTTPError as e:
            if e.code == 402:
                print("  402 " + model + " - probando siguiente...")
                continue
            print("  HTTP " + str(e.code) + " en " + desc)
            return False
        except Exception as e:
            print("  Error: " + str(e))
            return False
    print("  Sin creditos ElevenLabs para " + desc)
    return False

textos = [
    ("Agenda caotica. Pacientes perdidos. BASTA. Marli Agency lo cambia todo.", "voz1.mp3", "Clip 1"),
    ("Marli Agency. IA para psicologos. Tu consulta. Perfectamente transformada.", "voz2.mp3", "Clip 2"),
]
ok = sum(1 for t, s, d in textos if gen_voz(t, s, d))
print("\n  " + str(ok) + "/2 voces ElevenLabs OK")
PYEOF

# Fallback say: voz masculina espanola (Jorge/Diego = mas comercial)
VOZ_ES=$(say -v '?' 2>/dev/null | grep -iE "\bJorge\b|\bDiego\b" | head -1 | awk '{print $1}')
[ -z "$VOZ_ES" ] && VOZ_ES=$(say -v '?' 2>/dev/null | grep -iE "es_|Monica|Paulina|Spanish" | head -1 | awk '{print $1}')
[ -z "$VOZ_ES" ] && VOZ_ES="Jorge"

for i in 1 2; do
  SZ=$(stat -f%z "voz${i}.mp3" 2>/dev/null || stat -c%s "voz${i}.mp3" 2>/dev/null || echo 0)
  if [ ! -f "voz${i}.mp3" ] || [ "$SZ" -lt 1000 ]; then
    case $i in
      1) TX="Agenda caotica. Pacientes perdidos. BASTA. Marli Agency lo cambia todo." ;;
      2) TX="Marli Agency. IA para psicologos. Tu consulta. Perfectamente transformada." ;;
    esac
    say -v "$VOZ_ES" -r 190 "$TX" -o "voz${i}_raw.aiff" 2>/dev/null && \
      "$FF" -y -i "voz${i}_raw.aiff" -ar 44100 -ac 1 "voz${i}.mp3" -loglevel error < /dev/null && \
      rm -f "voz${i}_raw.aiff" && echo -e "  ${GREEN}✓${NC} voz${i} say ($VOZ_ES)" || \
      echo -e "  ${RED}✗${NC} Error voz${i}"
  fi
done
for i in 1 2; do
  "$FF" -y -i "voz${i}.mp3" -ar 44100 -ac 1 "voz${i}.wav" -loglevel error < /dev/null 2>/dev/null && \
    echo -e "  ${GREEN}✓${NC} voz${i}.wav" || echo -e "  ${RED}✗${NC} voz${i}.mp3 faltante"
done

# ── 4. MUSICA CON EMOCION Y RITMO ─────────────────────────────────────────────
# Am9-F-C-G/Am con kick drum (80Hz sweep) + hi-hat (noise burst)
# 118 BPM: beat = 0.5085s | 8th note = 0.2542s
# Clips cinematicos:  musica al 28% en mix final
# UGC:                musica al 7% (persona hablando es el audio)
echo -e "\n[4/6] ${BOLD}Generando musica cinematica...${NC}"

"$FF" -y \
  -f lavfi -i "aevalsrc=sin(2*PI*110*t)*0.23+sin(2*PI*220*t)*0.18+sin(2*PI*261.6*t)*0.15+sin(2*PI*329.6*t)*0.12+sin(2*PI*196*t)*0.09+sin(2*PI*246.9*t)*0.07+sin(2*PI*220.6*t)*0.06:s=44100:d=15" \
  -f lavfi -i "aevalsrc=sin(2*PI*87.3*t)*0.23+sin(2*PI*174.6*t)*0.21+sin(2*PI*220*t)*0.16+sin(2*PI*261.6*t)*0.12+sin(2*PI*329.6*t)*0.09+sin(2*PI*175.2*t)*0.06:s=44100:d=15" \
  -f lavfi -i "aevalsrc=sin(2*PI*130.8*t)*0.23+sin(2*PI*164.8*t)*0.18+sin(2*PI*196*t)*0.15+sin(2*PI*246.9*t)*0.12+sin(2*PI*293.7*t)*0.09+sin(2*PI*131.2*t)*0.06:s=44100:d=10" \
  -f lavfi -i "aevalsrc=sin(2*PI*98*t)*0.25+sin(2*PI*146.8*t)*0.20+sin(2*PI*196*t)*0.16+sin(2*PI*246.9*t)*0.12+sin(2*PI*293.7*t)*0.08+sin(2*PI*98.4*t)*0.06:s=44100:d=15" \
  -f lavfi -i "aevalsrc=sin(2*PI*80*t)*exp(-22*fmod(t\,0.5085))*0.52+sin(2*PI*42*t)*exp(-28*fmod(t\,0.5085))*0.36:s=44100:d=55" \
  -f lavfi -i "aevalsrc=(2*random(0)-1)*exp(-55*fmod(t\,0.2542))*0.18:s=44100:d=55" \
  -filter_complex \
    "[0]afade=t=in:st=0:d=2,tremolo=f=2:d=0.22[am];
     [1]tremolo=f=4:d=0.45,afade=t=in:st=0:d=0.3[fa];
     [2]tremolo=f=1.8:d=0.18,afade=t=in:st=0:d=0.3[do];
     [3]tremolo=f=4:d=0.50,afade=t=in:st=0:d=0.3,afade=t=out:st=12:d=3[sol];
     [am][fa][do][sol]concat=n=4:v=0:a=1[pads];
     [4]afade=t=in:st=0:d=5[kick];
     [5]afade=t=in:st=0:d=8[hh];
     [pads][kick][hh]amix=inputs=3:duration=first:normalize=0,volume=0.80[aout]" \
  -map "[aout]" music.wav -loglevel error < /dev/null

echo -e "  ${GREEN}✓${NC} Musica: Am9-F-C-G + kick 118bpm + hihat (55s)"

# ── 5. TEXTO SF PRO BOLD + VIDEO ──────────────────────────────────────────────
echo -e "\n[5/6] ${BOLD}Renderizando texto y mezclando audio...${NC}"

# Fuente: buscar SF Pro (San Francisco) en macOS, fallback Helvetica Neue Bold
FBP=""  # font bold param para drawtext
FRP=""  # font regular param
for f in \
  "/System/Library/Fonts/SFNS.ttf" \
  "/System/Library/Fonts/SFNSDisplay-Bold.otf" \
  "/System/Library/Fonts/SFNSText-Bold.otf" \
  "/Library/Fonts/SFPro-Bold.ttf" \
  "/Library/Fonts/SF-Pro-Display-Bold.otf"; do
  if [ -f "$f" ]; then
    FBP="fontfile='${f}'"
    FRP="fontfile='${f}'"
    echo -e "  Fuente: SF Pro ($f)"
    break
  fi
done
if [ -z "$FBP" ]; then
  FBP="font='Helvetica Neue Bold'"
  FRP="font='Helvetica Neue'"
  echo -e "  Fuente: Helvetica Neue Bold (SF Pro no encontrado en este sistema)"
fi

# Fade rapido 0.35s in / 0.28s out — dinamico, moderno
fade() { echo "if(lt(t,$1),0,if(lt(t,$1+0.35),(t-$1)/0.35,if(lt(t,$2-0.28),1,if(lt(t,$2),($2-t)/0.28,0))))"; }

# Clips cinematicos: voiceover + musica
mix_cinematic() {
  local clip="$1" voz="$2" out="$3" t0="$4" t1="$5"; shift 5; local vf="$@"
  "$FF" -y -i "$clip" -i "$voz" -i music.wav \
    -filter_complex "
      [0:a]volume=0.15[va];[1:a]volume=1.0[vv];
      [2]atrim=${t0}:${t1},aresample=44100,volume=0.28[vm];
      [va][vv][vm]amix=inputs=3:duration=first:weights='0.15 1.0 0.28'[aout]
    " \
    -map "0:v" -map "[aout]" -vf "$vf" \
    -c:v libx264 -crf 16 -preset fast -c:a aac -b:a 192k \
    "$out" -loglevel error < /dev/null
}

# UGC: audio original + musica casi silenciosa (hablante es el protagonista)
mix_ugc() {
  local clip="$1" out="$2" t0="$3" t1="$4"; shift 4; local vf="$@"
  "$FF" -y -i "$clip" -i music.wav \
    -filter_complex "
      [0:a]volume=1.15[va];
      [1]atrim=${t0}:${t1},aresample=44100,volume=0.07[vm];
      [va][vm]amix=inputs=2:duration=first:weights='1.15 0.07'[aout]
    " \
    -map "0:v" -map "[aout]" -vf "$vf" \
    -c:v libx264 -crf 16 -preset fast -c:a aac -b:a 192k \
    "$out" -loglevel error < /dev/null
}

# ── CLIP 1: Problema brutal + reveal de marca ─────────────────────────────────
A1=$(fade 0.3 4.2); A2=$(fade 4.6 8.8); A3=$(fade 9.2 14.2)
mix_cinematic clip1.mp4 voz1.wav clip1_final.mp4 0 15 \
  "drawtext=${FBP}:text='AGENDA CAOTICA':fontsize=78:fontcolor=white:borderw=3:bordercolor=black@0.92:x=(w-text_w)/2:y=h*0.40:alpha='${A1}':enable='between(t,0.3,4.2)',
  drawtext=${FBP}:text='BASTA.':fontsize=110:fontcolor=#E24B4A:borderw=4:bordercolor=black@0.93:x=(w-text_w)/2:y=h*0.50:alpha='${A1}':enable='between(t,0.3,4.2)',
  drawtext=${FRP}:text='PACIENTES PERDIDOS.':fontsize=48:fontcolor=white@0.88:borderw=2:bordercolor=black@0.76:x=(w-text_w)/2:y=h*0.82:alpha='${A2}':enable='between(t,4.6,8.8)',
  drawtext=${FRP}:text='NOCHES SIN DORMIR.':fontsize=48:fontcolor=white@0.88:borderw=2:bordercolor=black@0.76:x=(w-text_w)/2:y=h*0.89:alpha='${A2}':enable='between(t,4.6,8.8)',
  drawtext=${FBP}:text='MARLI AGENCY':fontsize=90:fontcolor=white:borderw=4:bordercolor=black@0.95:x=(w-text_w)/2:y=h*0.38:alpha='${A3}':enable='between(t,9.2,14.2)',
  drawtext=${FRP}:text='LO CAMBIA TODO.':fontsize=52:fontcolor=#FFCFC5:borderw=2:bordercolor=black@0.82:x=(w-text_w)/2:y=h*0.53:alpha='${A3}':enable='between(t,9.2,14.2)'"
echo -e "  ${GREEN}✓${NC} Clip 1"

# ── CLIP 2: IA para psicologos + CTA ─────────────────────────────────────────
B1=$(fade 0.4 5.8); B2=$(fade 6.2 10.2); B3=$(fade 10.6 14.6)
mix_cinematic clip2.mp4 voz2.wav clip2_final.mp4 15 30 \
  "drawtext=${FRP}:text='IA CREADA PARA':fontsize=54:fontcolor=white:borderw=2:bordercolor=black@0.82:x=(w-text_w)/2:y=h*0.80:alpha='${B1}':enable='between(t,0.4,5.8)',
  drawtext=${FBP}:text='PSICOLOGOS':fontsize=84:fontcolor=#E24B4A:borderw=3:bordercolor=black@0.92:x=(w-text_w)/2:y=h*0.87:alpha='${B1}':enable='between(t,0.4,5.8)',
  drawtext=${FBP}:text='MARLI AGENCY':fontsize=82:fontcolor=white:borderw=4:bordercolor=black@0.95:x=(w-text_w)/2:y=h*0.35:alpha='${B2}':enable='between(t,6.2,10.2)',
  drawtext=${FRP}:text='TU CONSULTA. TRANSFORMADA.':fontsize=44:fontcolor=#FFCFC5:borderw=2:bordercolor=black@0.80:x=(w-text_w)/2:y=h*0.46:alpha='${B2}':enable='between(t,6.2,10.2)',
  drawtext=${FBP}:text='marliagency.com':fontsize=68:fontcolor=white:box=1:boxcolor=#E24B4A@0.93:boxborderw=24:x=(w-text_w)/2:y=h*0.43:alpha='${B3}':enable='between(t,10.6,14.6)',
  drawtext=${FRP}:text='EMPIEZA GRATIS HOY':fontsize=44:fontcolor=white@0.92:borderw=2:bordercolor=#E24B4A@0.72:x=(w-text_w)/2:y=h*0.57:alpha='${B3}':enable='between(t,10.6,14.6)'"
echo -e "  ${GREEN}✓${NC} Clip 2"

# ── UGC 1: Testimonio — audio limpio, musica casi nula ────────────────────────
C1=$(fade 0.4 5.0); C2=$(fade 5.4 9.2)
mix_ugc ugc1.mp4 ugc1_final.mp4 30 40 \
  "drawtext=${FRP}:text='PSICOLOGA CLINICA':fontsize=36:fontcolor=white:box=1:boxcolor=black@0.62:boxborderw=14:x=w*0.05:y=h*0.88:alpha='${C1}':enable='between(t,0.4,5.0)',
  drawtext=${FBP}:text='MARLI AGENCY LO CAMBIO TODO':fontsize=44:fontcolor=white:borderw=2:bordercolor=#E24B4A@0.93:x=(w-text_w)/2:y=h*0.87:alpha='${C2}':enable='between(t,5.4,9.2)'"
echo -e "  ${GREEN}✓${NC} UGC 1 (audio original)"

# ── UGC 2: Beneficios + CTA final ────────────────────────────────────────────
D1=$(fade 0.3 4.8); D2=$(fade 5.2 9.2); D3=$(fade 9.6 13.2); D4=$(fade 13.5 14.8)
mix_ugc ugc2.mp4 ugc2_final.mp4 40 55 \
  "drawtext=${FBP}:text='AGENDA AUTOMATICA':fontsize=50:fontcolor=white:borderw=2:bordercolor=black@0.88:x=w*0.06:y=h*0.50:alpha='${D1}':enable='between(t,0.3,4.8)',
  drawtext=${FBP}:text='RECORDATORIOS INTELIGENTES':fontsize=50:fontcolor=white:borderw=2:bordercolor=black@0.88:x=w*0.06:y=h*0.60:alpha='${D1}':enable='between(t,0.3,4.8)',
  drawtext=${FBP}:text='SEGUIMIENTO PERSONALIZADO':fontsize=50:fontcolor=white:borderw=2:bordercolor=black@0.88:x=w*0.06:y=h*0.70:alpha='${D1}':enable='between(t,0.3,4.8)',
  drawtext=${FBP}:text='TODO INCLUIDO':fontsize=72:fontcolor=#E24B4A:borderw=3:bordercolor=black@0.93:x=(w-text_w)/2:y=h*0.42:alpha='${D2}':enable='between(t,5.2,9.2)',
  drawtext=${FRP}:text='DESDE EL DIA 1':fontsize=50:fontcolor=white:borderw=2:bordercolor=black@0.82:x=(w-text_w)/2:y=h*0.52:alpha='${D2}':enable='between(t,5.2,9.2)',
  drawtext=${FBP}:text='marliagency.com':fontsize=72:fontcolor=white:box=1:boxcolor=#E24B4A@0.94:boxborderw=26:x=(w-text_w)/2:y=h*0.42:alpha='${D3}':enable='between(t,9.6,13.2)',
  drawtext=${FBP}:text='EMPIEZA GRATIS':fontsize=62:fontcolor=white:borderw=3:bordercolor=black@0.93:x=(w-text_w)/2:y=h*0.56:alpha='${D4}':enable='between(t,13.5,14.8)'"
echo -e "  ${GREEN}✓${NC} UGC 2 (audio original)"

# ── 6. VIDEO FINAL ────────────────────────────────────────────────────────────
echo -e "\n[6/6] ${BOLD}Montando video final...${NC}"
printf "file 'clip1_final.mp4'\nfile 'clip2_final.mp4'\nfile 'ugc1_final.mp4'\nfile 'ugc2_final.mp4'\n" > concat_v3.txt
"$FF" -y -f concat -safe 0 -i concat_v3.txt \
  -c:v libx264 -crf 15 -preset medium \
  -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart \
  Marli_Final_v3_55s.mp4 -loglevel error < /dev/null
rm -f clip1_final.mp4 clip2_final.mp4 ugc1_final.mp4 ugc2_final.mp4 \
      concat_v3.txt voz1.mp3 voz2.mp3 voz1.wav voz2.wav

SIZE=$(du -sh Marli_Final_v3_55s.mp4 | cut -f1)
echo ""
echo -e "${GREEN}${BOLD}============================================"
echo -e "  LISTO: Marli_Final_v3_55s.mp4"
echo -e "  Tamano: ${SIZE} | 55s | 1080x1920"
echo -e "  Voz: ElevenLabs espanol language_code=es"
echo -e "  Musica: Am9-F-C-G + kick 118bpm + hihat"
echo -e "  Texto: SF Pro / Helvetica Neue Bold CAPS"
echo -e "============================================${NC}"
echo -e "  Guardado en: $DIR/"
open "$DIR"
