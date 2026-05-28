#!/usr/bin/env bash
# v2 brand cards (DM Serif Display + Space Grotesk) + 30s preview animatic
# con musica v3 (trompetas/tambores reales). Los slots de IA (CINEMATIC/UGC)
# quedan como placeholders crema hasta correr fal_generate.py en el Mac.
set -e
FF=ffmpeg
cd "$(dirname "$0")"
DM=fonts/DMSerifDisplay-Regular.ttf
SG=fonts/SpaceGrotesk.ttf
CREAM=0xFAF6F1; INK=0x2C2C2C; RED=0xE24B4A; GREY=0x6B6B6B

[ -f bg_cream.png ] || "$FF" -y -f lavfi -i "gradients=s=1080x1920:c0=0xFFFFFF:c1=0xF1EAE2:type=radial:x0=540:y0=640:nb_colors=2" -frames:v 1 bg_cream.png -loglevel error </dev/null
[ -f bg_ph.png ]    || "$FF" -y -f lavfi -i "color=0xEDE7DF:s=1080x1920" -vf "drawbox=x=70:y=70:w=940:h=1780:color=0x2C2C2C@0.18:t=4" -frames:v 1 bg_ph.png -loglevel error </dev/null

line(){ echo "drawtext=fontfile=$6:text='$1':fontsize=$2:fontcolor=$3:alpha='clip((t-$4)/0.4\,0\,1)':x=(w-text_w)/2:y='$5+45*(1-clip((t-$4)/0.4\,0\,1))'"; }
pill(){ echo "drawbox=x=(iw-780)/2:y=$2:w=780:h=112:color=${RED}:t=fill:enable='gte(t,$3)',drawtext=fontfile=${SG}:text='$1':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=$2+34:enable='gte(t,$3)'"; }
sig(){ echo "drawtext=fontfile=${DM}:text='marli':fontsize=52:fontcolor=${RED}:x=(w-text_w)/2:y=1760"; }

card(){ "$FF" -y -loop 1 -t 5 -i "$2" -vf "$3,format=yuv420p" -r 30 -t 5 -c:v libx264 -crf 16 -preset fast "$1" -loglevel error </dev/null; echo "built $1"; }

# REAL cards (DM Serif headlines + Space Grotesk subtext)
P="$(line 'EL PROBLEMA' 44 $GREY 0.10 540 $SG),"
P="${P}$(line '+8 HORAS' 160 $RED 0.45 670 $DM),"
P="${P}$(line 'a la semana en tareas' 54 $INK 1.05 920 $SG),"
P="${P}$(line 'administrativas' 54 $INK 1.25 990 $SG),"
P="${P}$(sig)"
card card_problem.mp4 bg_cream.png "$P"

B="$(line 'LA DIFERENCIA' 44 $GREY 0.10 540 $SG),"
B="${B}$(line 'Pago único' 140 $RED 0.45 680 $DM),"
B="${B}$(line 'Se queda contigo para siempre' 50 $INK 1.05 880 $SG),"
B="${B}$(line 'Sin cuotas. Sin sorpresas.' 42 $GREY 1.4 960 $SG),"
B="${B}$(sig)"
card card_benefit.mp4 bg_cream.png "$B"

C="$(line 'Automatiza tu consulta' 60 $INK 0.20 600 $SG),"
C="${C}$(line 'en menos de 1 hora' 78 $RED 0.65 700 $DM),"
C="${C}$(line 'Sin cuotas. Sin técnicos.' 42 $GREY 1.10 850 $SG),"
C="${C}$(pill 'AGENDA TU LLAMADA GRATIS' 1050 1.5),"
C="${C}$(line 'marliagency.com' 46 $INK 2.0 1230 $SG),"
C="${C}fade=t=out:st=4.5:d=0.5"
card card_cta.mp4 bg_cream.png "$C"

# Placeholders for AI slots (replaced by fal_generate.py on Mac)
H1="$(line '[ CINEMATIC ]' 46 $RED 0.10 540 $SG),"
H1="${H1}$(line 'Li en la consulta' 70 $INK 0.4 650 $DM),"
H1="${H1}$(line 'Slow push-in - Kling 3.0' 40 $GREY 0.8 880 $SG),"
H1="${H1}$(line '(clip IA, fal.ai)' 36 $GREY 1.3 1700 $SG)"
card ph_cine1.mp4 bg_ph.png "$H1"

H3="$(line '[ UGC ]' 46 $RED 0.10 540 $SG),"
H3="${H3}$(line 'Testimonio psicologa' 60 $INK 0.4 650 $DM),"
H3="${H3}$(line 'Voz en espanol - Kling Avatar v2' 36 $GREY 0.8 880 $SG),"
H3="${H3}$(line '(clip IA con audio, fal.ai)' 36 $GREY 1.3 1700 $SG)"
card ph_ugc.mp4 bg_ph.png "$H3"

H4="$(line '[ CINEMATIC ]' 46 $RED 0.10 540 $SG),"
H4="${H4}$(line 'Li organiza el dia' 70 $INK 0.4 650 $DM),"
H4="${H4}$(line 'Slow orbit - Kling 3.0' 40 $GREY 0.8 880 $SG),"
H4="${H4}$(line '(clip IA, fal.ai)' 36 $GREY 1.3 1700 $SG)"
card ph_cine2.mp4 bg_ph.png "$H4"

printf "file 'ph_cine1.mp4'\nfile 'card_problem.mp4'\nfile 'ph_ugc.mp4'\nfile 'ph_cine2.mp4'\nfile 'card_benefit.mp4'\nfile 'card_cta.mp4'\n" > concat_v2_preview.txt
"$FF" -y -f concat -safe 0 -i concat_v2_preview.txt -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p preview_v2_video.mp4 -loglevel error </dev/null
"$FF" -y -i preview_v2_video.mp4 -i music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t 30 -movflags +faststart marli_v2_preview.mp4 -loglevel error </dev/null
rm -f preview_v2_video.mp4 concat_v2_preview.txt
echo "DONE -> marli_v2_preview.mp4"
