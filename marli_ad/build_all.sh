#!/usr/bin/env bash
# Rebuilds the self-contained graphics version (text + music, no AI footage).
# Output: marli_ad_final.mp4
set -e
cd "$(dirname "$0")"
FF=$(command -v ffmpeg || echo ffmpeg)

bash build_music.sh
bash build_text.sh
bash build_scenes.sh

printf "file 'scene_1.mp4'\nfile 'text_2.mp4'\nfile 'scene_3.mp4'\nfile 'text_4.mp4'\nfile 'scene_5.mp4'\nfile 'text_6.mp4'\n" > concat_list.txt
"$FF" -y -f concat -safe 0 -i concat_list.txt -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p ad_video.mp4 -loglevel error < /dev/null
"$FF" -y -i ad_video.mp4 -i music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t 30 -movflags +faststart marli_ad_final.mp4 -loglevel error < /dev/null
echo "DONE -> marli_ad_final.mp4"
