#!/usr/bin/env bash
# Premium cinematic cut: splices the 3 Higgsfield/Veo AI clips into the ad.
# Run this on the Mac (it can reach the media CDN; the cloud sandbox could not).
# Reuses text_2.mp4 / text_4.mp4 / text_6.mp4 / music.wav already in this folder.
set -e
cd "$(dirname "$0")"
FF=$(command -v ffmpeg || echo ffmpeg)

# --- font detection (macOS first, per Marli doc) ---
FONT=""
for f in "/System/Library/Fonts/SFNSDisplay-Bold.otf" \
         "/System/Library/Fonts/SFNS.ttf" \
         "/System/Library/Fonts/HelveticaNeue.ttc" \
         "/Library/Fonts/Arial Bold.ttf" \
         "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"; do
  [ -f "$f" ] && FONT="$f" && break
done
[ -z "$FONT" ] && { echo "No bold font found"; exit 1; }
echo "Using font: $FONT"

# regenerate shared assets if missing
[ -f music.wav ]  || bash build_music.sh
[ -f text_2.mp4 ] || bash build_text.sh

RED=0xE01030; WHITE=white
BASE="https://d8j0ntlcm91z4.cloudfront.net/user_3DuupfRLOT8CVNxJIjSDN3j9Elm"

# clip_id  ->  role
HOOK_URL="$BASE/hf_20260527_214430_67fb71fa-ea4f-4fa9-bf1e-cd8856645e32.mp4"
SOL_URL="$BASE/hf_20260527_214432_0efbfa36-0de0-42a6-88d3-bfd65308a309.mp4"
HERO_URL="$BASE/hf_20260527_214434_529d0a9d-f73a-4e9e-a3cd-8aa7e69b990a.mp4"

echo "Downloading AI clips..."
curl -L -o raw_hook.mp4 "$HOOK_URL"
curl -L -o raw_sol.mp4  "$SOL_URL"
curl -L -o raw_hero.mp4 "$HERO_URL"

# common normalize: 1080x1920, 5s, 30fps
NORM="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30"
# lower-third dark scrim for text legibility
SCRIM="drawbox=x=0:y=ih*0.60:w=iw:h=ih*0.40:color=black@0.45:t=fill"

ov() { # text fontsize color t_in y
  echo "drawtext=fontfile=${FONT}:text='$1':fontsize=$2:fontcolor=$3:alpha='clip((t-$4)/0.4\,0\,1)':borderw=4:bordercolor=black@0.85:shadowcolor=black@0.7:shadowx=2:shadowy=3:x=(w-text_w)/2:y='$5+50*(1-clip((t-$4)/0.4\,0\,1))'"
}

# CINEMATIC 1 - HOOK
"$FF" -y -t 5 -i raw_hook.mp4 -vf \
 "${NORM},${SCRIM},$(ov '¿PUBLICAS EN 5 REDES' 56 $WHITE 0.4 1300),$(ov 'UNA POR UNA?' 56 $WHITE 0.9 1420),format=yuv420p" \
 -an -r 30 -t 5 -c:v libx264 -crf 16 -preset medium cinematic_1.mp4 -loglevel error < /dev/null
echo "built cinematic_1.mp4"

# CINEMATIC 3 - SOLUTION
"$FF" -y -t 5 -i raw_sol.mp4 -vf \
 "${NORM},${SCRIM},$(ov 'TE PRESENTAMOS' 58 $WHITE 0.4 1280),$(ov 'MARLI' 130 $RED 0.9 1380),format=yuv420p" \
 -an -r 30 -t 5 -c:v libx264 -crf 16 -preset medium cinematic_3.mp4 -loglevel error < /dev/null
echo "built cinematic_3.mp4"

# CINEMATIC 5 - PROOF / FEATURES
"$FF" -y -t 5 -i raw_hero.mp4 -vf \
 "${NORM},${SCRIM},$(ov 'PROGRAMA  PUBLICA' 60 $WHITE 0.4 1320),$(ov 'ANALIZA' 60 $RED 0.9 1440),format=yuv420p" \
 -an -r 30 -t 5 -c:v libx264 -crf 16 -preset medium cinematic_5.mp4 -loglevel error < /dev/null
echo "built cinematic_5.mp4"

# concat: cinematic + text alternating
printf "file 'cinematic_1.mp4'\nfile 'text_2.mp4'\nfile 'cinematic_3.mp4'\nfile 'text_4.mp4'\nfile 'cinematic_5.mp4'\nfile 'text_6.mp4'\n" > concat_cine.txt
"$FF" -y -f concat -safe 0 -i concat_cine.txt -c:v libx264 -crf 15 -preset medium -pix_fmt yuv420p cine_video.mp4 -loglevel error < /dev/null
"$FF" -y -i cine_video.mp4 -i music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t 30 -movflags +faststart marli_ad_cinematic.mp4 -loglevel error < /dev/null

echo "DONE -> marli_ad_cinematic.mp4"
