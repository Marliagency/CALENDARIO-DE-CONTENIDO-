#!/usr/bin/env bash
set -e
FF=ffmpeg
cd "$(dirname "$0")"
FONT=/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf
RED=0xE01030
WHITE=white
GREY=0xBBBBBB

line() {
  local txt="$1" fs="$2" col="$3" ti="$4" y="$5"
  echo "drawtext=fontfile=${FONT}:text='${txt}':fontsize=${fs}:fontcolor=${col}:alpha='clip((t-${ti})/0.4\,0\,1)':borderw=4:bordercolor=black@0.85:shadowcolor=black@0.6:shadowx=2:shadowy=3:x=(w-text_w)/2:y='${y}+55*(1-clip((t-${ti})/0.4\,0\,1))'"
}
# red underline accent appearing at t
bar() { echo "drawbox=x=(iw-280)/2:y=$1:w=280:h=8:color=${RED}:t=fill:enable='gte(t,$2)'"; }

build() {
  local out="$1" vf="$2"
  "$FF" -y -loop 1 -t 5 -i glow_bg.png \
    -vf "${vf},format=yuv420p" -r 30 -t 5 \
    -c:v libx264 -crf 16 -preset fast "$out" -loglevel error < /dev/null
  echo "built $out"
}

# SCENE 1 - HOOK
V1="$(line 'MARLI' 56 $RED 0.10 560),"
V1="${V1}$(bar 660 0.55),"
V1="${V1}$(line '¿PUBLICAS EN 5 REDES' 58 $WHITE 0.45 780),"
V1="${V1}$(line 'UNA POR UNA?' 58 $WHITE 0.95 900)"
build scene_1.mp4 "$V1"

# SCENE 3 - SOLUTION
V3="$(line 'LA SOLUCIÓN' 50 $RED 0.10 540),"
V3="${V3}$(bar 630 0.5),"
V3="${V3}$(line 'TE PRESENTAMOS' 60 $WHITE 0.45 760),"
V3="${V3}$(line 'MARLI' 150 $RED 0.95 880),"
V3="${V3}$(line 'TU CENTRO DE CONTENIDO' 40 $GREY 1.6 1110)"
build scene_3.mp4 "$V3"

# SCENE 5 - FEATURES / PROOF
V5="$(line 'TODO EN UN PANEL' 50 $RED 0.10 540),"
V5="${V5}$(bar 630 0.5),"
V5="${V5}$(line 'PROGRAMA' 84 $WHITE 0.45 740),"
V5="${V5}$(line 'PUBLICA' 84 $WHITE 0.90 860),"
V5="${V5}$(line 'ANALIZA' 84 $RED 1.35 980)"
build scene_5.mp4 "$V5"

echo "=== scenes ==="; ls -la scene_1.mp4 scene_3.mp4 scene_5.mp4
