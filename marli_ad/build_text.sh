#!/usr/bin/env bash
set -e
FF=ffmpeg
cd "$(dirname "$0")"
FONT=/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf
RED=0xE01030
WHITE=white

# --- dark premium background with centered red glow (built once) ---
if [ ! -f glow_bg.png ]; then
  "$FF" -y -f lavfi -i color=black:s=1080x1920 \
    -vf "geq=r='14+78*exp(-((X-540)^2+(Y-960)^2)/(2*480*480))':g='4+9*exp(-((X-540)^2+(Y-960)^2)/(2*480*480))':b='7+15*exp(-((X-540)^2+(Y-960)^2)/(2*480*480))',noise=alls=5:allf=t,vignette=PI/4" \
    -frames:v 1 glow_bg.png -loglevel error < /dev/null
fi

# line(text, fontsize, color, t_in, baseY) -> one drawtext with fade+slide-up
line() {
  local txt="$1" fs="$2" col="$3" ti="$4" y="$5"
  echo "drawtext=fontfile=${FONT}:text='${txt}':fontsize=${fs}:fontcolor=${col}:alpha='clip((t-${ti})/0.4\,0\,1)':borderw=4:bordercolor=black@0.85:shadowcolor=black@0.6:shadowx=2:shadowy=3:x=(w-text_w)/2:y='${y}+55*(1-clip((t-${ti})/0.4\,0\,1))'"
}

build_card() {
  local out="$1"; shift
  local vf="$1"
  "$FF" -y -loop 1 -t 5 -i glow_bg.png \
    -vf "${vf},format=yuv420p" -r 30 -t 5 \
    -c:v libx264 -crf 16 -preset fast "$out" -loglevel error < /dev/null
  echo "built $out"
}

# T2 PROBLEM
VF2="$(line '¿CUÁNTO TIEMPO' 74 $WHITE 0.20 700),"
VF2="${VF2}$(line 'PIERDES ORGANIZANDO' 60 $WHITE 0.65 840),"
VF2="${VF2}$(line 'EN VEZ DE CREAR?' 66 $RED 1.15 980)"
build_card text_2.mp4 "$VF2"

# T4 BENEFIT
VF4="$(line 'TODAS TUS MARCAS' 70 $WHITE 0.20 700),"
VF4="${VF4}$(line 'UN SOLO PANEL' 70 $WHITE 0.80 840),"
VF4="${VF4}$(line 'CERO CAOS' 92 $RED 1.45 990)"
build_card text_4.mp4 "$VF4"

# T6 CTA  (fade whole card out at the end)
VF6="$(line 'MARLI' 150 $RED 0.20 660),"
VF6="${VF6}$(line 'EMPIEZA GRATIS HOY' 66 $WHITE 0.90 880),"
VF6="${VF6}$(line 'CREA TU WORKSPACE EN MINUTOS' 40 0xBBBBBB 1.5 980),"
VF6="${VF6}fade=t=out:st=4.5:d=0.5"
build_card text_6.mp4 "$VF6"

echo "=== text cards ==="; ls -la text_2.mp4 text_4.mp4 text_6.mp4
