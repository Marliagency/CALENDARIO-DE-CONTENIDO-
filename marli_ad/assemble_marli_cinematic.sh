#!/usr/bin/env bash
# MONTAJE FINAL Marli (3 formatos en 1) — ejecutar en el Mac.
# Combina: 2 CINEMATIC (Li) + 1 UGC (psicologa) ya generados en Higgsfield,
# + las text cards de marca (card_problem/benefit/cta.mp4) + music.wav (incluidos en el repo).
# Orden: CINEMATIC, TEXT, UGC, CINEMATIC, TEXT, CTA.
set -e
cd "$(dirname "$0")"
FF=$(command -v ffmpeg || echo ffmpeg)

# --- fuente para overlays (Inter de marca primero, luego SF Pro / Helvetica) ---
FONT=""
for f in "$HOME/Library/Fonts/Inter-Bold.otf" "/Library/Fonts/Inter-Bold.otf" \
         "$HOME/Library/Fonts/InterDisplay-ExtraBold.otf" \
         "/System/Library/Fonts/SFNSDisplay-Bold.otf" "/System/Library/Fonts/SFNS.ttf" \
         "/System/Library/Fonts/HelveticaNeue.ttc" "/Library/Fonts/Arial Bold.ttf" \
         "/usr/share/fonts/opentype/inter/Inter-Bold.otf"; do
  [ -f "$f" ] && FONT="$f" && break
done
[ -z "$FONT" ] && { echo "No se encontro fuente bold"; exit 1; }
echo "Fuente overlays: $FONT"

RED=0xE24B4A; WHITE=white
BASE="https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm"
C1="$BASE/hf_20260527_220517_53863e3d-8f4b-4d1c-a06b-2921fef81701.mp4"   # CINEMATIC Li push-in
C2="$BASE/hf_20260527_220520_86d6f353-46b4-428e-affa-2a5c8016dc4d.mp4"   # CINEMATIC Li + cards
UG="$BASE/hf_20260527_220522_f0151fb8-8c89-4810-8519-186f4e87e9c3.mp4"   # UGC psicologa (con voz)

echo "Descargando clips IA..."
curl -L -o raw_c1.mp4 "$C1"; curl -L -o raw_c2.mp4 "$C2"; curl -L -o raw_ug.mp4 "$UG"

NORM="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30"
SCRIM="drawbox=x=0:y=ih*0.66:w=iw:h=ih*0.34:color=black@0.42:t=fill"
ov() { echo "drawtext=fontfile=${FONT}:text='$1':fontsize=$2:fontcolor=$3:alpha='clip((t-$4)/0.4\,0\,1)':borderw=4:bordercolor=black@0.8:shadowcolor=black@0.6:shadowx=2:shadowy=3:x=(w-text_w)/2:y='$5+45*(1-clip((t-$4)/0.4\,0\,1))'"; }

# --- CINEMATIC 1 (slot 1): musica sola + overlay (sin audio original) ---
"$FF" -y -t 5 -i raw_c1.mp4 -i music.wav -filter_complex \
 "[0:v]${NORM},${SCRIM},$(ov 'Tu consulta funciona.' 56 $WHITE 0.4 1340),$(ov 'Pero depende solo de ti.' 56 $RED 0.95 1430),format=yuv420p[v];[1:a]atrim=0:5,asetpts=PTS-STARTPTS,volume=0.8[a]" \
 -map "[v]" -map "[a]" -r 30 -t 5 -c:v libx264 -crf 16 -preset medium -c:a aac -b:a 192k beat1.mp4 -loglevel error < /dev/null

# --- TEXT 1 (slot 2): card_problem + musica ---
"$FF" -y -i card_problem.mp4 -i music.wav -filter_complex "[1:a]atrim=5:10,asetpts=PTS-STARTPTS,volume=0.8[a]" -map 0:v -map "[a]" -t 5 -c:v libx264 -crf 16 -preset medium -c:a aac -b:a 192k beat2.mp4 -loglevel error < /dev/null

# --- UGC (slot 3): voz original 100% + musica MUY baja + subtitulo de rol ---
"$FF" -y -t 5 -i raw_ug.mp4 -i music.wav -filter_complex \
 "[0:v]${NORM},drawbox=x=(iw-720)/2:y=1640:w=720:h=84:color=black@0.55:t=fill,drawtext=fontfile=${FONT}:text='PSICÓLOGA · CONSULTA PRIVADA':fontsize=40:fontcolor=white:x=(w-text_w)/2:y=1664,format=yuv420p[v];[0:a]volume=1.15[va];[1:a]atrim=10:15,asetpts=PTS-STARTPTS,volume=0.07[vm];[va][vm]amix=inputs=2:duration=first:weights='1.15 0.07'[a]" \
 -map "[v]" -map "[a]" -r 30 -t 5 -c:v libx264 -crf 16 -preset medium -c:a aac -b:a 192k beat3.mp4 -loglevel error < /dev/null

# --- CINEMATIC 2 (slot 4): musica sola + overlay ---
"$FF" -y -t 5 -i raw_c2.mp4 -i music.wav -filter_complex \
 "[0:v]${NORM},${SCRIM},$(ov 'Conoce a Li.' 70 $RED 0.4 1330),$(ov 'Tu asistente que nunca descansa.' 44 $WHITE 0.95 1440),format=yuv420p[v];[1:a]atrim=15:20,asetpts=PTS-STARTPTS,volume=0.8[a]" \
 -map "[v]" -map "[a]" -r 30 -t 5 -c:v libx264 -crf 16 -preset medium -c:a aac -b:a 192k beat4.mp4 -loglevel error < /dev/null

# --- TEXT 2 (slot 5): card_benefit + musica ---
"$FF" -y -i card_benefit.mp4 -i music.wav -filter_complex "[1:a]atrim=20:25,asetpts=PTS-STARTPTS,volume=0.8[a]" -map 0:v -map "[a]" -t 5 -c:v libx264 -crf 16 -preset medium -c:a aac -b:a 192k beat5.mp4 -loglevel error < /dev/null

# --- CTA (slot 6): card_cta + musica con fade out ---
"$FF" -y -i card_cta.mp4 -i music.wav -filter_complex "[1:a]atrim=25:30,asetpts=PTS-STARTPTS,volume=0.8,afade=t=out:st=4.3:d=0.7[a]" -map 0:v -map "[a]" -t 5 -c:v libx264 -crf 16 -preset medium -c:a aac -b:a 192k beat6.mp4 -loglevel error < /dev/null

printf "file 'beat1.mp4'\nfile 'beat2.mp4'\nfile 'beat3.mp4'\nfile 'beat4.mp4'\nfile 'beat5.mp4'\nfile 'beat6.mp4'\n" > concat_final.txt
"$FF" -y -f concat -safe 0 -i concat_final.txt -c:v libx264 -crf 15 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart marli_ad_final.mp4 -loglevel error < /dev/null
echo "LISTO -> marli_ad_final.mp4 (30s, 3 formatos combinados)"
