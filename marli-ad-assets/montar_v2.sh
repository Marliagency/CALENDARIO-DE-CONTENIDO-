#!/bin/bash
# Marli Agency — Video Final v3
# Clips 1-2: voiceover ElevenLabs promocional + musica
# UGC 1-2:   audio original del hablante + musica muy baja (sin voiceover)
# Texto:     estilo Apple / Instagram Reels (Helvetica Neue Bold)
# Musica:    Am-F-C-G con tremolo ritmico dinamico
# Ejecutar:  bash montar_v2.sh

set -e
BOLD='\033[1m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
DIR="$HOME/Desktop/marli-higgsfield"
mkdir -p "$DIR" && cd "$DIR"

PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null || echo "")
[ -z "$PYTHON" ] && echo -e "${RED}Error: Python no encontrado.${NC}" && exit 1

echo -e "${BOLD}${BLUE}============================================"
echo -e "  Marli Agency — Video Final v3"
echo -e "  Texto Apple-style + UGC audio limpio"
echo -e "============================================${NC}"

# ── CONFIG ────────────────────────────────────────────────────────────────────
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

# ── 2. DESCARGAR CLIPS ────────────────────────────────────────────────────────
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

dl "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/hf_20260527_134248_01b9c033-21d9-4ba3-82b6-d15a398e6a75.mp4" \
   "clip1.mp4" "Clip 1 — Psicologa + robot (15s)"
dl "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/hf_20260527_134242_b9a39831-68c3-477e-bb67-615217d9b776.mp4" \
   "clip2.mp4" "Clip 2 — Sesion + hero + CTA (15s)"
dl "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/hf_20260527_150734_5c2da191-8aff-4c90-9378-93d187f122cb.mp4" \
   "ugc1.mp4" "UGC 1 — Testimonio (10s)"
dl "https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm/hf_20260527_144456_a21f0d68-f19b-4023-97fb-d6ba092fd073.mp4" \
   "ugc2.mp4" "UGC 2 — Beneficios + CTA (15s)"

# ── 3. VOCES (solo clips 1 y 2 — UGC usa su propio audio) ────────────────────
echo -e "\n[3/6] ${BOLD}Generando voces promocionales...${NC}"
echo -e "  UGC 1 y 2 usan el audio del hablante (sin voiceover)"

$PYTHON << PYEOF
from __future__ import print_function
import json, sys

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

# Voz: preferencia 1 = espanol+masculino+comercial, 2 = espanol, 3 = masculino
# Default: Adam — voz grave y autoritaria (comercial)
voice_id = "pNInz6obpgDQGcFmaJgB"
try:
    data = api_get("/v1/voices")
    voices = data.get("voices", [])
    found = None
    for v in voices:
        lb = str(v.get("labels", {})).lower()
        nm = v.get("name","").lower()
        if any(x in lb for x in ["spanish","espanol","latin"]) and \
           any(x in lb for x in ["male","news","commercial","dynamic"]):
            found = v; break
    if not found:
        for v in voices:
            lb = str(v.get("labels", {})).lower()
            if any(x in lb for x in ["spanish","espanol","latin"]):
                found = v; break
    if not found:
        for v in voices:
            lb = str(v.get("labels", {})).lower()
            if "male" in lb and "female" not in lb:
                found = v; break
    if found:
        voice_id = found["voice_id"]
        print("  Voz seleccionada: " + found.get("name","?") + " (" + voice_id[:8] + "...)")
    else:
        print("  Usando voz default: Adam (" + voice_id[:8] + "...)")
except Exception as e:
    print("  API error, usando default: " + str(e))

MODELS = ["eleven_flash_v2_5","eleven_turbo_v2_5","eleven_turbo_v2","eleven_multilingual_v2"]

def gen_voz(texto, salida, desc):
    for model in MODELS:
        body = json.dumps({
            "text": texto,
            "model_id": model,
            "voice_settings": {
                "stability": 0.22,
                "similarity_boost": 0.85,
                "style": 0.68,
                "use_speaker_boost": True
            }
        })
        req = Request(
            BASE + "/v1/text-to-speech/" + voice_id,
            data=body.encode("utf-8"),
            headers={"xi-api-key": API_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"}
        )
        try:
            r = urlopen(req, timeout=45)
            data = r.read()
            if len(data) > 1000:
                f = open(salida, "wb"); f.write(data); f.close()
                print("  OK " + desc + " [" + model + "] (" + str(len(data)//1024) + "KB)")
                return True
        except HTTPError as e:
            if e.code == 402:
                print("  402 " + model + " — probando siguiente...")
                continue
            print("  HTTP " + str(e.code) + " en " + desc); return False
        except Exception as e:
            print("  Error: " + str(e)); return False
    print("  Sin creditos ElevenLabs para " + desc)
    return False

# Texto mas energico y directo — solo voz 1 y voz 2
textos = [
    ("Agenda caotica. Pacientes perdidos. BASTA. Marli Agency lo cambia todo.", "voz1.mp3", "Clip 1"),
    ("Marli Agency. Inteligencia artificial para psicologos. Tu consulta. Perfectamente transformada.", "voz2.mp3", "Clip 2"),
]
ok = sum(1 for t, s, d in textos if gen_voz(t, s, d))
print("\n  " + str(ok) + "/2 voces ElevenLabs OK")
PYEOF

# Fallback say — preferir voz masculina espanola (mas comercial/dinamica)
VOZ_ES=$(say -v '?' 2>/dev/null | grep -iE "\bJorge\b|\bDiego\b" | head -1 | awk '{print $1}')
[ -z "$VOZ_ES" ] && VOZ_ES=$(say -v '?' 2>/dev/null | grep -iE "es_|Monica|Paulina|Spanish" | head -1 | awk '{print $1}')
[ -z "$VOZ_ES" ] && VOZ_ES="Jorge"

for i in 1 2; do
  SZ=$(stat -f%z "voz${i}.mp3" 2>/dev/null || stat -c%s "voz${i}.mp3" 2>/dev/null || echo 0)
  if [ ! -f "voz${i}.mp3" ] || [ "$SZ" -lt 1000 ]; then
    echo -e "  say ($VOZ_ES) para voz${i}..."
    case $i in
      1) TX="Agenda caotica. Pacientes perdidos. BASTA. Marli Agency lo cambia todo." ;;
      2) TX="Marli Agency. Inteligencia artificial para psicologos. Tu consulta. Perfectamente transformada." ;;
    esac
    say -v "$VOZ_ES" -r 188 "$TX" -o "voz${i}_raw.aiff" 2>/dev/null && \
      "$FF" -y -i "voz${i}_raw.aiff" -ar 44100 -ac 1 "voz${i}.mp3" -loglevel error < /dev/null && \
      rm -f "voz${i}_raw.aiff" && \
      echo -e "  ${GREEN}✓${NC} voz${i} ($VOZ_ES, 188 wpm)" || \
      echo -e "  ${RED}✗${NC} Error voz${i}"
  fi
done

# WAV solo para voz1 y voz2
for i in 1 2; do
  "$FF" -y -i "voz${i}.mp3" -ar 44100 -ac 1 "voz${i}.wav" -loglevel error < /dev/null 2>/dev/null && \
    echo -e "  ${GREEN}✓${NC} voz${i}.wav" || echo -e "  ${RED}✗${NC} voz${i}.mp3 no encontrado"
done

# ── 4. MUSICA DINAMICA (Am-F-C-G + tremolo ritmico) ──────────────────────────
echo -e "\n[4/6] ${BOLD}Generando musica dinamica...${NC}"

# Tremolo a ~118 BPM:  f=2 = corcheas suaves | f=4 = semicorcheas energicas
# Clip 1 (Am, 0-15s):  tremolo=f=2:d=0.25 — construccion moderada
# Clip 2 (F, 15-30s):  tremolo=f=4:d=0.42 — maximo ritmo / energia
# UGC 1 (C, 30-40s):   tremolo=f=1.5:d=0.15 — emocional / bajo volumen en mix
# UGC 2 (G, 40-55s):   tremolo=f=4:d=0.48 — climax energico + fade out

"$FF" -y \
  -f lavfi -i "aevalsrc=sin(2*PI*110*t)*0.25+sin(2*PI*220*t)*0.20+sin(2*PI*261.6*t)*0.17+sin(2*PI*329.6*t)*0.13+sin(2*PI*440*t)*0.08+sin(2*PI*220.6*t)*0.07:s=44100:d=15" \
  -f lavfi -i "aevalsrc=sin(2*PI*87.3*t)*0.25+sin(2*PI*174.6*t)*0.22+sin(2*PI*220*t)*0.16+sin(2*PI*261.6*t)*0.13+sin(2*PI*349.2*t)*0.09+sin(2*PI*175.2*t)*0.07:s=44100:d=15" \
  -f lavfi -i "aevalsrc=sin(2*PI*130.8*t)*0.25+sin(2*PI*164.8*t)*0.20+sin(2*PI*196*t)*0.16+sin(2*PI*261.6*t)*0.13+sin(2*PI*392*t)*0.07+sin(2*PI*131.2*t)*0.06:s=44100:d=10" \
  -f lavfi -i "aevalsrc=sin(2*PI*98*t)*0.28+sin(2*PI*146.8*t)*0.22+sin(2*PI*196*t)*0.17+sin(2*PI*246.9*t)*0.13+sin(2*PI*392*t)*0.08+sin(2*PI*98.5*t)*0.06:s=44100:d=15" \
  -filter_complex \
    "[0]afade=t=in:st=0:d=2,tremolo=f=2:d=0.25[a0];
     [1]tremolo=f=4:d=0.42,afade=t=in:st=0:d=0.4[a1];
     [2]tremolo=f=1.5:d=0.15,afade=t=in:st=0:d=0.4[a2];
     [3]tremolo=f=4:d=0.48,afade=t=in:st=0:d=0.4,afade=t=out:st=12:d=3[a3];
     [a0][a1][a2][a3]concat=n=4:v=0:a=1,volume=0.80[aout]" \
  -map "[aout]" music.wav -loglevel error < /dev/null

echo -e "  ${GREEN}✓${NC} Musica Am-F-C-G con tremolo ritmico (55s)"

# ── 5. TEXTO APPLE/INSTAGRAM + MEZCLA AUDIO ──────────────────────────────────
echo -e "\n[5/6] ${BOLD}Aplicando texto estilo Apple/Reels...${NC}"

# Fuente: Helvetica Neue Bold (apple-like) — viene en macOS desde siempre
# Arial Bold como fallback
FONT_NAME="Helvetica Neue Bold"
# Verificar que fontconfig la encuentre; si no, usar Arial Bold
if ! fc-list 2>/dev/null | grep -qi "helvetica neue"; then
  FONT_NAME="Arial Bold"
fi

# Fade suave 0.4s in, 0.35s out (mas rapido = mas dinamico)
fade() { echo "if(lt(t,$1),0,if(lt(t,$1+0.4),(t-$1)/0.4,if(lt(t,$2-0.35),1,if(lt(t,$2),($2-t)/0.35,0))))"; }

# CLIP 1 y 2: voiceover + musica al 28%
# Audio clip original muy bajo (0.18) para presencia ambiental
mix_cinematic() {
  local clip="$1" voz_wav="$2" out="$3" t_mus_start="$4" t_mus_end="$5"
  shift 5; local vf="$@"
  "$FF" -y -i "$clip" -i "$voz_wav" -i music.wav \
    -filter_complex "
      [0:a]volume=0.18[va];
      [1:a]volume=1.0[vv];
      [2]atrim=${t_mus_start}:${t_mus_end},aresample=44100,volume=0.28[vm];
      [va][vv][vm]amix=inputs=3:duration=first:weights='0.18 1.0 0.28'[aout]
    " \
    -map "0:v" -map "[aout]" -vf "$vf" \
    -c:v libx264 -crf 16 -preset fast -c:a aac -b:a 192k \
    "$out" -loglevel error < /dev/null
}

# UGC 1 y 2: audio del hablante limpio + musica muy baja (0.08)
# Sin voiceover — la persona en el clip ES el audio principal
mix_ugc() {
  local clip="$1" out="$2" t_mus_start="$3" t_mus_end="$4"
  shift 4; local vf="$@"
  "$FF" -y -i "$clip" -i music.wav \
    -filter_complex "
      [0:a]volume=1.15[va];
      [1]atrim=${t_mus_start}:${t_mus_end},aresample=44100,volume=0.08[vm];
      [va][vm]amix=inputs=2:duration=first:weights='1.15 0.08'[aout]
    " \
    -map "0:v" -map "[aout]" -vf "$vf" \
    -c:v libx264 -crf 16 -preset fast -c:a aac -b:a 192k \
    "$out" -loglevel error < /dev/null
}

# ── CLIP 1: Problema → Reveal de marca ──────────────────────────────────────
# Texto grande, impacto inmediato estilo Apple
A1=$(fade 0.3 4.2); A2=$(fade 4.6 8.8); A3=$(fade 9.2 14.2)
mix_cinematic clip1.mp4 voz1.wav clip1_final.mp4 0 15 \
  "drawtext=font='${FONT_NAME}':text='AGENDA CAOTICA':fontsize=76:fontcolor=white:borderw=3:bordercolor=black@0.92:x=(w-text_w)/2:y=h*0.40:alpha='${A1}':enable='between(t,0.3,4.2)',
  drawtext=font='${FONT_NAME}':text='BASTA.':fontsize=104:fontcolor=#E24B4A:borderw=3:bordercolor=black@0.92:x=(w-text_w)/2:y=h*0.50:alpha='${A1}':enable='between(t,0.3,4.2)',
  drawtext=font='${FONT_NAME}':text='Pacientes perdidos.':fontsize=48:fontcolor=white@0.88:borderw=2:bordercolor=black@0.75:x=(w-text_w)/2:y=h*0.82:alpha='${A2}':enable='between(t,4.6,8.8)',
  drawtext=font='${FONT_NAME}':text='Noches sin dormir.':fontsize=48:fontcolor=white@0.88:borderw=2:bordercolor=black@0.75:x=(w-text_w)/2:y=h*0.89:alpha='${A2}':enable='between(t,4.6,8.8)',
  drawtext=font='${FONT_NAME}':text='MARLI AGENCY':fontsize=90:fontcolor=white:borderw=4:bordercolor=black@0.95:x=(w-text_w)/2:y=h*0.38:alpha='${A3}':enable='between(t,9.2,14.2)',
  drawtext=font='Helvetica Neue':text='lo cambia todo.':fontsize=52:fontcolor=#FFCFC5:borderw=2:bordercolor=black@0.80:x=(w-text_w)/2:y=h*0.53:alpha='${A3}':enable='between(t,9.2,14.2)'"
echo -e "  ${GREEN}✓${NC} Clip 1"

# ── CLIP 2: Beneficio → Marca → CTA ─────────────────────────────────────────
B1=$(fade 0.4 5.8); B2=$(fade 6.2 10.2); B3=$(fade 10.6 14.6)
mix_cinematic clip2.mp4 voz2.wav clip2_final.mp4 15 30 \
  "drawtext=font='Helvetica Neue':text='IA creada para':fontsize=54:fontcolor=white:borderw=2:bordercolor=black@0.82:x=(w-text_w)/2:y=h*0.80:alpha='${B1}':enable='between(t,0.4,5.8)',
  drawtext=font='${FONT_NAME}':text='PSICOLOGOS':fontsize=82:fontcolor=#E24B4A:borderw=3:bordercolor=black@0.92:x=(w-text_w)/2:y=h*0.87:alpha='${B1}':enable='between(t,0.4,5.8)',
  drawtext=font='${FONT_NAME}':text='MARLI AGENCY':fontsize=82:fontcolor=white:borderw=4:bordercolor=black@0.95:x=(w-text_w)/2:y=h*0.35:alpha='${B2}':enable='between(t,6.2,10.2)',
  drawtext=font='Helvetica Neue':text='Tu consulta. Transformada.':fontsize=46:fontcolor=#FFCFC5:borderw=2:bordercolor=black@0.80:x=(w-text_w)/2:y=h*0.46:alpha='${B2}':enable='between(t,6.2,10.2)',
  drawtext=font='${FONT_NAME}':text='marliagency.com':fontsize=68:fontcolor=white:box=1:boxcolor=#E24B4A@0.93:boxborderw=24:x=(w-text_w)/2:y=h*0.43:alpha='${B3}':enable='between(t,10.6,14.6)',
  drawtext=font='Helvetica Neue':text='Empieza GRATIS hoy':fontsize=44:fontcolor=white@0.92:borderw=2:bordercolor=#E24B4A@0.70:x=(w-text_w)/2:y=h*0.57:alpha='${B3}':enable='between(t,10.6,14.6)'"
echo -e "  ${GREEN}✓${NC} Clip 2"

# ── UGC 1: Testimonio — audio limpio, musica al fondo ───────────────────────
# Solo texto de contexto (chyron) y quote final — NO voiceover
C1=$(fade 0.4 5.0); C2=$(fade 5.4 9.2)
mix_ugc ugc1.mp4 ugc1_final.mp4 30 40 \
  "drawtext=font='Helvetica Neue':text='Psicologa clinica':fontsize=36:fontcolor=white:box=1:boxcolor=black@0.60:boxborderw=14:x=w*0.05:y=h*0.88:alpha='${C1}':enable='between(t,0.4,5.0)',
  drawtext=font='${FONT_NAME}':text='Marli Agency lo cambio todo':fontsize=46:fontcolor=white:borderw=2:bordercolor=#E24B4A@0.92:x=(w-text_w)/2:y=h*0.87:alpha='${C2}':enable='between(t,5.4,9.2)'"
echo -e "  ${GREEN}✓${NC} UGC 1 — audio original, sin voiceover"

# ── UGC 2: Beneficios + CTA final ───────────────────────────────────────────
D1=$(fade 0.3 4.8); D2=$(fade 5.2 9.2); D3=$(fade 9.6 13.2); D4=$(fade 13.5 14.8)
mix_ugc ugc2.mp4 ugc2_final.mp4 40 55 \
  "drawtext=font='${FONT_NAME}':text='Agenda automatica':fontsize=50:fontcolor=white:borderw=2:bordercolor=black@0.88:x=w*0.06:y=h*0.50:alpha='${D1}':enable='between(t,0.3,4.8)',
  drawtext=font='${FONT_NAME}':text='Recordatorios inteligentes':fontsize=50:fontcolor=white:borderw=2:bordercolor=black@0.88:x=w*0.06:y=h*0.60:alpha='${D1}':enable='between(t,0.3,4.8)',
  drawtext=font='${FONT_NAME}':text='Seguimiento personalizado':fontsize=50:fontcolor=white:borderw=2:bordercolor=black@0.88:x=w*0.06:y=h*0.70:alpha='${D1}':enable='between(t,0.3,4.8)',
  drawtext=font='${FONT_NAME}':text='TODO incluido':fontsize=68:fontcolor=#E24B4A:borderw=3:bordercolor=black@0.92:x=(w-text_w)/2:y=h*0.42:alpha='${D2}':enable='between(t,5.2,9.2)',
  drawtext=font='Helvetica Neue':text='desde el Dia 1':fontsize=50:fontcolor=white:borderw=2:bordercolor=black@0.82:x=(w-text_w)/2:y=h*0.52:alpha='${D2}':enable='between(t,5.2,9.2)',
  drawtext=font='${FONT_NAME}':text='marliagency.com':fontsize=72:fontcolor=white:box=1:boxcolor=#E24B4A@0.94:boxborderw=26:x=(w-text_w)/2:y=h*0.42:alpha='${D3}':enable='between(t,9.6,13.2)',
  drawtext=font='${FONT_NAME}':text='EMPIEZA GRATIS':fontsize=60:fontcolor=white:borderw=3:bordercolor=black@0.92:x=(w-text_w)/2:y=h*0.56:alpha='${D4}':enable='between(t,13.5,14.8)'"
echo -e "  ${GREEN}✓${NC} UGC 2 — audio original, sin voiceover"

# ── 6. VIDEO FINAL ────────────────────────────────────────────────────────────
echo -e "\n[6/6] ${BOLD}Montando video final...${NC}"
printf "file 'clip1_final.mp4'\nfile 'clip2_final.mp4'\nfile 'ugc1_final.mp4'\nfile 'ugc2_final.mp4'\n" > concat_v3.txt

"$FF" -y -f concat -safe 0 -i concat_v3.txt \
  -c:v libx264 -crf 15 -preset medium \
  -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  Marli_Final_v3_55s.mp4 -loglevel error < /dev/null

rm -f clip1_final.mp4 clip2_final.mp4 ugc1_final.mp4 ugc2_final.mp4 \
      concat_v3.txt voz1.mp3 voz2.mp3 voz1.wav voz2.wav

SIZE=$(du -sh Marli_Final_v3_55s.mp4 | cut -f1)
echo ""
echo -e "${GREEN}${BOLD}============================================"
echo -e "  LISTO: Marli_Final_v3_55s.mp4"
echo -e "  Tamano: ${SIZE} | 55s | 1080x1920"
echo -e "  Voz: ElevenLabs/say (clips 1-2) | Audio original (UGC)"
echo -e "  Musica: Am-F-C-G tremolo ritmico"
echo -e "  Texto: Helvetica Neue Bold (Apple-style)"
echo -e "============================================${NC}"
echo ""
echo -e "  Guardado en: $DIR/"

open "$DIR"
