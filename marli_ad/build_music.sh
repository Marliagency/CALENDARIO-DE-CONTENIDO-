#!/usr/bin/env bash
# Action music bed (128 BPM, A minor) — punchy kick + bass + snare + hats + stabs.
# Comma-free aevalsrc expressions (commas break the lavfi parser).
set -e
FF=ffmpeg
cd "$(dirname "$0")"

# 128 BPM: BEAT=0.46875 INV_BEAT=2.13333 ; 8TH=0.234375 INV_8TH=4.26667
# 16TH=0.1171875 INV_16=8.53333 ; 2BEAT=0.9375 INV_2BEAT=1.06667
KICK='sin(2*PI*(45+150*exp(-26*(t-floor(t*2.13333)*0.46875)))*(t-floor(t*2.13333)*0.46875))*exp(-6.5*(t-floor(t*2.13333)*0.46875))*1.0'
SNARE='((2*random(0)-1)*0.5+sin(2*PI*180*t)*0.25)*exp(-46*(t-floor(t*1.06667)*0.9375-0.46875)*(t-floor(t*1.06667)*0.9375-0.46875))'
HH='(2*random(0)-1)*exp(-70*(t-floor(t*8.53333)*0.1171875))*0.18'
BASS='(sin(2*PI*55*t)+0.45*sin(2*PI*110*t)+0.22*sin(2*PI*82.41*t))*exp(-11*(t-floor(t*4.26667)*0.234375))*0.62'
STAB='(sin(2*PI*220*t)+sin(2*PI*261.63*t)+sin(2*PI*329.63*t))*exp(-9*(t-floor(t*4.26667)*0.234375))*0.12'

"$FF" -y \
  -f lavfi -i "aevalsrc=${KICK}:s=44100:d=30" \
  -f lavfi -i "aevalsrc=${SNARE}:s=44100:d=30" \
  -f lavfi -i "aevalsrc=${HH}:s=44100:d=30" \
  -f lavfi -i "aevalsrc=${BASS}:s=44100:d=30" \
  -f lavfi -i "aevalsrc=${STAB}:s=44100:d=30" \
  -filter_complex "
    [0]volume=1.0[k];
    [1]volume=0.85[s];
    [2]volume=0.55[h];
    [3]volume=1.0[b];
    [4]volume=0.5[st];
    [k][s][h][b][st]amix=inputs=5:normalize=0:duration=first[mix];
    [mix]highpass=f=28,acompressor=threshold=-16dB:ratio=4:attack=5:release=120:makeup=4,alimiter=limit=0.96,afade=t=in:st=0:d=0.4,afade=t=out:st=28:d=2[aout]
  " -map "[aout]" -t 30 -ar 44100 music.wav -loglevel error < /dev/null

echo "music.wav (action) built"; ffprobe -v error -show_entries format=duration -of csv=p=0 music.wav
