#!/usr/bin/env bash
set -e
FF=ffmpeg
cd "$(dirname "$0")"

# 120 BPM. BEAT=0.5  INV_BEAT=2  HALF_BEAT=0.25  INV_8TH=4
AM='sin(2*PI*110*t)*0.23+sin(2*PI*220*t)*0.18+sin(2*PI*261.6*t)*0.15+sin(2*PI*329.6*t)*0.12+sin(2*PI*196*t)*0.09+sin(2*PI*246.9*t)*0.07'
F='sin(2*PI*87.3*t)*0.23+sin(2*PI*174.6*t)*0.21+sin(2*PI*220*t)*0.16+sin(2*PI*261.6*t)*0.12+sin(2*PI*329.6*t)*0.09'
C='sin(2*PI*130.8*t)*0.23+sin(2*PI*164.8*t)*0.18+sin(2*PI*196*t)*0.15+sin(2*PI*246.9*t)*0.12+sin(2*PI*293.7*t)*0.09'
G='sin(2*PI*98*t)*0.25+sin(2*PI*146.8*t)*0.20+sin(2*PI*196*t)*0.16+sin(2*PI*246.9*t)*0.12+sin(2*PI*293.7*t)*0.08'
KICK='sin(2*PI*80*t)*exp(-22*(t-floor(t*2)*0.5))*0.52+sin(2*PI*42*t)*exp(-28*(t-floor(t*2)*0.5))*0.36'
HH='(2*random(0)-1)*exp(-55*(t-floor(t*4)*0.25))*0.18'

"$FF" -y \
  -f lavfi -i "aevalsrc=${AM}:s=44100:d=7.5" \
  -f lavfi -i "aevalsrc=${F}:s=44100:d=7.5" \
  -f lavfi -i "aevalsrc=${C}:s=44100:d=7.5" \
  -f lavfi -i "aevalsrc=${G}:s=44100:d=7.5" \
  -f lavfi -i "aevalsrc=${KICK}:s=44100:d=30" \
  -f lavfi -i "aevalsrc=${HH}:s=44100:d=30" \
  -filter_complex \
    "[0]afade=t=in:st=0:d=2,tremolo=f=2:d=0.22[am];
     [1]tremolo=f=4:d=0.45,afade=t=in:st=0:d=0.3[fa];
     [2]tremolo=f=1.8:d=0.18,afade=t=in:st=0:d=0.3[do];
     [3]tremolo=f=4:d=0.50,afade=t=in:st=0:d=0.3,afade=t=out:st=4.5:d=3[sol];
     [am][fa][do][sol]concat=n=4:v=0:a=1[pads];
     [4]afade=t=in:st=0:d=5[kick];
     [5]afade=t=in:st=0:d=8[hh];
     [pads][kick][hh]amix=inputs=3:duration=first:normalize=0,volume=0.80,afade=t=out:st=27:d=3[aout]" \
  -map "[aout]" -t 30 music.wav -loglevel error < /dev/null

echo "music.wav built:"; ls -la music.wav
