#!/usr/bin/env bash
# Epic brass+drums music with REAL instrument samples (GM SoundFont via fluidsynth).
# Requires: fluidsynth + a GM soundfont + python3-mido. On the Mac you can just use the
# committed music.wav; this script documents how it was produced.
#   apt-get install -y fluidsynth fluid-soundfont-gm ; pip install mido
set -e
cd "$(dirname "$0")"
SF2="${SF2:-/usr/share/sounds/sf2/FluidR3_GM.sf2}"
[ -f "$SF2" ] || { echo "SoundFont no encontrado: $SF2 (define SF2=...)"; exit 1; }

python3 compose_music.py
fluidsynth -ni -g 1.2 -F /tmp/music_raw.wav -r 44100 "$SF2" epic.mid >/dev/null 2>&1
ffmpeg -y -i /tmp/music_raw.wav -af "highpass=f=28,acompressor=threshold=-16dB:ratio=3:attack=8:release=180:makeup=3,aecho=0.85:0.7:55|85:0.18|0.10,alimiter=limit=0.98,loudnorm=I=-12:TP=-1:LRA=11,afade=t=in:st=0:d=0.2,afade=t=out:st=28.8:d=1.2" -t 30 -ar 44100 music.wav -loglevel error < /dev/null
rm -f /tmp/music_raw.wav
echo "music.wav (real brass+drums) built"; ffprobe -v error -show_entries format=duration -of csv=p=0 music.wav
