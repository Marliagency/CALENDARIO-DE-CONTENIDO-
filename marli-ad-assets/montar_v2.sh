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

# ── 3. VOCES ELEVENLABS ────────────────────────────────────────────────────────
echo -e "\n[3/6] ${BOLD}Generando voces con ElevenLabs...${NC}"

# Obtener la mejor voz en español disponible
VOICE_ID=$(curl -s -H "xi-api-key: $ELABS_KEY" \
  "https://api.elevenlabs.io/v1/voices" | python3 -c "
import json, sys
data = json.load(sys.stdin)
voices = data.get('voices', [])
# Buscar voz española o latinoamericana
for v in voices:
    labels = str(v.get('labels',{})).lower()
    name = v['name'].lower()
    if any(x in labels for x in ['spanish','español','latin','castilian','hispanic']):
        print(v['voice_id']); sys.exit(0)
# Fallback: primera voz femenina multilingual disponible
for v in voices:
    labels = str(v.get('labels',{})).lower()
    if 'female' in labels or 'femenin' in labels:
        print(v['voice_id']); sys.exit(0)
# Último fallback
if voices:
    print(voices[0]['voice_id'])
" 2>/dev/null)

if [ -z "$VOICE_ID" ]; then
  VOICE_ID="cgSgspJ2msm6clMCkdW9"  # Sarah (multilingual fallback)
fi
echo -e "  Voice ID: $VOICE_ID"

gen_voz() {
  local texto="$1" salida="$2" desc="$3"
  echo -e "  ↓ Generando voz: $desc..."
  curl -s -X POST \
    "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID/stream" \
    -H "xi-api-key: $ELABS_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"text\": \"$texto\",
      \"model_id\": \"$ELABS_MODEL\",
      \"voice_settings\": {
        \"stability\": 0.45,
        \"similarity_boost\": 0.80,
        \"style\": 0.25,
        \"use_speaker_boost\": true
      }
    }" -o "$salida"
  [ -f "$salida" ] && [ $(stat -f%z "$salida" 2>/dev/null || stat -c%s "$salida") -gt 1000 ] \
    && echo -e "  ${GREEN}✓${NC} $desc generada" \
    || echo -e "  ${RED}✗${NC} Error en $desc — usando fallback espeak"
}

# Generar narración para cada segmento
gen_voz "¿Te suena familiar? Pacientes perdidos. Agenda caótica. Noches sin dormir. Hay algo que puede cambiarlo todo." \
  "voz1.mp3" "Narración clip 1"

gen_voz "Marli Agency. Inteligencia artificial diseñada para psicólogos. Tu consulta, perfectamente organizada." \
  "voz2.mp3" "Narración clip 2"

gen_voz "Soy psicóloga y durante años luché con la desorganización. Hasta que descubrí Marli Agency. Ahora mis pacientes están atendidos y yo, tranquila." \
  "voz3.mp3" "Narración UGC 1"

gen_voz "Tres cosas que Marli hace por ti: agenda automática, recordatorios inteligentes y seguimiento personalizado. Empieza gratis en marliagency punto com." \
  "voz4.mp3" "Narración UGC 2"

# Fallback espeak si ElevenLabs falla
for i in 1 2 3 4; do
  if [ ! -f "voz${i}.mp3" ] || [ $(stat -f%z "voz${i}.mp3" 2>/dev/null || stat -c%s "voz${i}.mp3") -lt 1000 ]; then
    echo -e "  Usando espeak fallback para voz$i..."
    case $i in
      1) TEXTO="Te suena familiar. Pacientes perdidos. Agenda caotica. Marli Agency lo cambia todo." ;;
      2) TEXTO="Marli Agency. Inteligencia artificial para psicologos. Tu consulta, organizada." ;;
      3) TEXTO="Soy psicologa y Marli cambio todo. Agenda automatica. Pacientes atendidos." ;;
      4) TEXTO="Agenda automatica. Recordatorios inteligentes. Seguimiento personalizado. Marliagency punto com." ;;
    esac
    espeak-ng -v es+f3 -s 145 -p 45 -a 200 "$TEXTO" --stdout | \
      "$FF" -y -f s16le -ar 22050 -ac 1 -i pipe:0 "voz${i}.mp3" -loglevel error 2>/dev/null
  fi
done

# Convertir MP3 a WAV para procesamiento
for i in 1 2 3 4; do
  "$FF" -y -i "voz${i}.mp3" -ar 44100 -ac 1 "voz${i}.wav" -loglevel error 2>/dev/null
  echo -e "  ${GREEN}✓${NC} voz${i}.wav lista"
done

# ── 4. MÚSICA DINÁMICA ────────────────────────────────────────────────────────
echo -e "\n[4/6] ${BOLD}Generando música cinematográfica...${NC}"
python3 << 'PYEOF'
import numpy as np, wave, struct

SR = 44100
BPM = 118

def note(freq, dur, vol=0.3, attack=0.03, decay=0.05, sustain=0.7, release=0.15):
    n = int(SR * dur)
    t = np.linspace(0, dur, n)
    # Wave with harmonics for richer sound
    wave_arr = (np.sin(2*np.pi*freq*t) * 0.6 +
                np.sin(2*np.pi*freq*2*t) * 0.2 +
                np.sin(2*np.pi*freq*3*t) * 0.1 +
                np.sin(2*np.pi*freq*0.5*t) * 0.1)
    # ADSR envelope
    env = np.ones(n)
    a = int(attack * SR); d = int(decay * SR); r = int(release * SR)
    s_level = sustain
    if a > 0: env[:a] = np.linspace(0, 1, a)
    if d > 0 and a+d < n: env[a:a+d] = np.linspace(1, s_level, d)
    if a+d < n: env[a+d:max(a+d, n-r)] = s_level
    if r > 0: env[max(0, n-r):] = np.linspace(s_level, 0, min(r, n))
    return wave_arr * env * vol

def pad_synth(freq, dur, vol=0.2):
    """Warm pad sound with chorus effect"""
    n = int(SR * dur)
    t = np.linspace(0, dur, n)
    detune = 0.002
    wave_arr = (np.sin(2*np.pi*freq*(1+detune)*t) * 0.5 +
                np.sin(2*np.pi*freq*(1-detune)*t) * 0.5 +
                np.sin(2*np.pi*freq*2*t) * 0.15)
    env = np.ones(n)
    fade = int(0.3 * SR)
    env[:fade] = np.linspace(0, 1, fade)
    env[-fade:] = np.linspace(1, 0, fade)
    return wave_arr * env * vol

def bass_note(freq, dur, vol=0.35):
    n = int(SR * dur)
    t = np.linspace(0, dur, n)
    wave_arr = (np.sin(2*np.pi*freq*t) * 0.7 +
                np.sin(2*np.pi*freq*2*t) * 0.2 +
                np.sin(2*np.pi*freq*0.5*t) * 0.1)
    env = np.ones(n)
    decay = int(0.1 * SR); release = int(0.2 * SR)
    env[:decay] = np.linspace(0, 1, decay)
    env[-release:] = np.linspace(1, 0, release)
    return wave_arr * env * vol

def kick(dur=0.4, vol=0.6):
    n = int(SR * dur)
    t = np.linspace(0, dur, n)
    freq_sweep = 150 * np.exp(-20 * t)
    wave_arr = np.sin(2 * np.pi * np.cumsum(freq_sweep) / SR)
    env = np.exp(-8 * t)
    noise = np.random.randn(n) * 0.05 * np.exp(-30 * t)
    return (wave_arr * env + noise) * vol

def snare(dur=0.2, vol=0.4):
    n = int(SR * dur)
    t = np.linspace(0, dur, n)
    noise = np.random.randn(n)
    tone = np.sin(2 * np.pi * 200 * t)
    env = np.exp(-15 * t)
    return (noise * 0.7 + tone * 0.3) * env * vol

def hihat(dur=0.08, vol=0.15):
    n = int(SR * dur)
    noise = np.random.randn(n)
    env = np.exp(-40 * np.linspace(0, dur, n))
    return noise * env * vol

# Notes: Am - F - C - G (cinematic progression)
NOTES = {
    'A3':220.0,'C4':261.6,'E4':329.6,'F3':174.6,'A4':440.0,
    'C5':523.3,'E5':659.3,'G3':196.0,'B3':246.9,'D4':293.7,
    'G4':392.0,'D5':587.3,'F4':349.2,'B4':493.9,'A2':110.0,
    'F2':87.3,'C3':130.8,'G2':98.0
}

BEAT = 60.0 / BPM
TOTAL = 55.0
full = np.zeros(int(SR * TOTAL))

def add(arr, sig, t_start):
    start = int(t_start * SR)
    end = start + len(sig)
    if end > len(arr): sig = sig[:len(arr)-start]
    arr[start:start+len(sig)] += sig

# ── ESTRUCTURA MUSICAL ─────────────────────────────────────────────────────────
# INTRO (0-4s): fade in suave
for t in np.arange(0, 4, BEAT*4):
    add(full, pad_synth(NOTES['A3'], BEAT*4, 0.15), t)
    add(full, pad_synth(NOTES['E4'], BEAT*4, 0.10), t)

# CLIP 1 (0-15s): tensión + construcción
chord_seq1 = [
    ('A3','C4','E4'),('F3','A3','C4'),('C3','E4','G4'),('G2','B3','D4')
]
for i, (t) in enumerate(np.arange(0, 15, BEAT*4)):
    chord = chord_seq1[i % len(chord_seq1)]
    for n in chord:
        add(full, note(NOTES[n], BEAT*4, 0.12), t)
    add(full, pad_synth(NOTES[chord[0]], BEAT*4, 0.08), t)
    # Bajo
    add(full, bass_note(NOTES[chord[0]]/2, BEAT*2, 0.25), t)
    add(full, bass_note(NOTES[chord[0]]/2, BEAT*2, 0.20), t + BEAT*2)

# Percusión clip 1 (aparece progresivamente a partir de 5s)
for i, t in enumerate(np.arange(5, 15, BEAT)):
    if i % 4 == 0: add(full, kick(vol=0.5), t)
    if i % 4 == 2: add(full, snare(vol=0.3 + (t/15)*0.15), t)
    if i % 2 == 1: add(full, hihat(vol=0.12 + (t/15)*0.05), t)

# CLIP 2 (15-30s): elevación, más energía
chord_seq2 = [
    ('A3','E4','A4'),('F3','C4','F4'),('C3','G4','C5'),('G2','D4','G4')
]
for i, t in enumerate(np.arange(15, 30, BEAT*4)):
    chord = chord_seq2[i % len(chord_seq2)]
    for n in chord:
        add(full, note(NOTES[n], BEAT*4, 0.14), t)
        add(full, pad_synth(NOTES[n], BEAT*4, 0.06), t)
    add(full, bass_note(NOTES[chord[0]]/2, BEAT*2, 0.30), t)
    add(full, bass_note(NOTES[chord[2]]/4, BEAT*2, 0.25), t + BEAT*2)

# Percusión clip 2 (completa, más energía)
for t in np.arange(15, 30, BEAT):
    beat_in_measure = (t - 15) / BEAT % 4
    if beat_in_measure < 0.1: add(full, kick(vol=0.65), t)
    if abs(beat_in_measure - 2) < 0.1: add(full, snare(vol=0.50), t)
    add(full, hihat(vol=0.18), t)
    if abs(beat_in_measure - 1) < 0.1 or abs(beat_in_measure - 3) < 0.1:
        add(full, hihat(dur=0.04, vol=0.10), t)

# UGC 1 (30-40s): más suave, emocional
for i, t in enumerate(np.arange(30, 40, BEAT*4)):
    chord = chord_seq1[i % len(chord_seq1)]
    for n in chord:
        add(full, pad_synth(NOTES[n], BEAT*4, 0.10), t)
    add(full, bass_note(NOTES[chord[0]]/2, BEAT*4, 0.20), t)

for t in np.arange(30, 40, BEAT*2):
    add(full, kick(vol=0.35), t)
    add(full, snare(vol=0.25), t + BEAT)
    add(full, hihat(vol=0.12), t + BEAT*0.5)

# UGC 2 (40-55s): climax + fade out final
for i, t in enumerate(np.arange(40, 53, BEAT*4)):
    chord = chord_seq2[i % len(chord_seq2)]
    for n in chord:
        add(full, note(NOTES[n], BEAT*4, 0.13), t)
        add(full, pad_synth(NOTES[n], BEAT*4, 0.08), t)
    add(full, bass_note(NOTES[chord[0]]/2, BEAT*2, 0.28), t)

for t in np.arange(40, 53, BEAT):
    beat_in_measure = (t - 40) / BEAT % 4
    if beat_in_measure < 0.1: add(full, kick(vol=0.60), t)
    if abs(beat_in_measure - 2) < 0.1: add(full, snare(vol=0.45), t)
    add(full, hihat(vol=0.15), t)

# Fade out final (52-55s)
fade_len = int(3 * SR)
fade_start = int(52 * SR)
fade_end = min(len(full), fade_start + fade_len)
full[fade_start:fade_end] *= np.linspace(1, 0, fade_end - fade_start)

# Normalizar
max_val = np.max(np.abs(full))
if max_val > 0:
    full = full / max_val * 0.82

# Guardar WAV
samples = (full * 32767).astype(np.int16)
with wave.open('music.wav', 'w') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes(samples.tobytes())
print("  ✓ Música cinematográfica lista (55s)")
PYEOF
echo -e "  ${GREEN}✓${NC} Música generada"

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
    "$out" -loglevel error
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
  Marli_Final_v2_ElevenLabs_55s.mp4 -loglevel error

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
