#!/usr/bin/env bash
# Epic brass + drums track with changing tempo/intensity (5 sections concatenated):
# A intro majestuoso -> B marcha que sube -> C climax rapido -> D breakdown -> E final triunfal
# Comma-free aevalsrc (commas break the lavfi parser). relu() gates without sign/if.
set -e
FF=ffmpeg
cd "$(dirname "$0")"

relu(){ echo "((abs(t-$1)+(t-$1))/2)"; }
tomhit(){ local q; q="$(relu $1)"; echo "sin(2*PI*(68+120*exp(-9*${q}))*${q})*exp(-3.6*${q})"; }
sawe(){ local F=$1; echo "(sin(2*PI*${F}*t)+0.5*sin(2*PI*2*${F}*t)+0.34*sin(2*PI*3*${F}*t)+0.25*sin(2*PI*4*${F}*t)+0.2*sin(2*PI*5*${F}*t)+0.16*sin(2*PI*6*${F}*t))"; }
chord(){ echo "($(sawe $1)+$(sawe $2)+$(sawe $3))"; }
mk(){ local out=$1 d=$2; shift 2; local args=(); local fc=""; local i=0
  for e in "$@"; do args+=(-f lavfi -i "aevalsrc=${e}:s=44100:d=${d}"); fc+="[${i}]"; i=$((i+1)); done
  "$FF" -y "${args[@]}" -filter_complex "${fc}amix=inputs=${i}:normalize=0:duration=first[a]" -map "[a]" -t "$d" -ar 44100 "$out" -loglevel error < /dev/null
}

# A — intro majestuoso (5s, lento): swell de metales + dos golpes de tom + redoble que crece
mk sec_a.wav 5 \
  "$(chord 130.81 155.56 196.00)*(1-exp(-1.6*t))*0.040" \
  "($(tomhit 0.05)+$(tomhit 2.6))*1.10" \
  "(2*random(0)-1)*(0.55+0.45*sin(2*PI*19*t))*$(relu 3.3)*0.42"

# B — marcha que sube (8s, ~100 BPM, beat 0.6): kick + caja backbeat + hats + stabs de metal creciendo
mk sec_b.wav 8 \
  "sin(2*PI*(45+150*exp(-26*(t-floor(t*1.66667)*0.6)))*(t-floor(t*1.66667)*0.6))*exp(-6*(t-floor(t*1.66667)*0.6))" \
  "((2*random(0)-1)*0.55+sin(2*PI*190*t)*0.18)*exp(-42*(t-floor(t*0.83333)*1.2-0.6)*(t-floor(t*0.83333)*1.2-0.6))" \
  "(2*random(0)-1)*exp(-55*(t-floor(t*3.33333)*0.3))*0.09" \
  "$(chord 130.81 155.56 196.00)*exp(-7*(t-floor(t*1.66667)*0.6))*(0.020+0.0035*t)"

# C — climax rapido (8s, ~150 BPM, beat 0.4): kick four-on-floor + caja offbeat + hats 16th + stabs fuertes
mk sec_c.wav 8 \
  "sin(2*PI*(48+150*exp(-26*(t-floor(t*2.5)*0.4)))*(t-floor(t*2.5)*0.4))*exp(-6.5*(t-floor(t*2.5)*0.4))" \
  "((2*random(0)-1)*0.5+sin(2*PI*200*t)*0.18)*exp(-55*(t-floor(t*2.5)*0.4-0.2)*(t-floor(t*2.5)*0.4-0.2))" \
  "(2*random(0)-1)*exp(-65*(t-floor(t*5.0)*0.2))*0.11" \
  "$(chord 130.81 155.56 196.00)*exp(-8*(t-floor(t*5.0)*0.2))*0.034"

# D — breakdown (4s): metal grave sostenido + redoble en crescendo (tension)
mk sec_d.wav 4 \
  "$(sawe 98.0)*(1-exp(-3*t))*exp(-0.15*t)*0.05" \
  "(2*random(0)-1)*(0.55+0.45*sin(2*PI*24*t))*(t/4)*0.40"

# E — final triunfal (5s): acorde mayor de metales + crash + gran tom, dejando resonar
mk sec_e.wav 5 \
  "$(chord 130.81 164.81 196.00)*exp(-0.7*t)*0.045" \
  "(2*random(0)-1)*exp(-2.0*t)*0.22" \
  "$(tomhit 0.03)*1.30"

# concat + master (compresion + limitador + fades)
"$FF" -y -i sec_a.wav -i sec_b.wav -i sec_c.wav -i sec_d.wav -i sec_e.wav \
  -filter_complex "[0][1][2][3][4]concat=n=5:v=0:a=1[m];[m]highpass=f=30,acompressor=threshold=-18dB:ratio=3:attack=5:release=160:makeup=4,alimiter=limit=0.97,afade=t=in:st=0:d=0.15,afade=t=out:st=28.7:d=1.3[a]" \
  -map "[a]" -t 30 -ar 44100 music.wav -loglevel error < /dev/null
rm -f sec_a.wav sec_b.wav sec_c.wav sec_d.wav sec_e.wav
echo "music.wav (epic brass+drums) built"; ffprobe -v error -show_entries format=duration -of csv=p=0 music.wav
