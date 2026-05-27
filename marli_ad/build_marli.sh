#!/usr/bin/env bash
# Marli Agency brand cards (cream / Inter / red Marli) + 30s preview animatic.
# Real text cards: card_problem / card_benefit / card_cta  (used in final cut too)
# Placeholder cards: ph_cine1 / ph_ugc / ph_cine2  (only for the local preview)
set -e
FF=ffmpeg
cd "$(dirname "$0")"
HEAD=/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf
BOLD=/usr/share/fonts/opentype/inter/Inter-Bold.otf
SEMI=/usr/share/fonts/opentype/inter/Inter-SemiBold.otf
CREAM=0xFAF6F1; INK=0x2C2C2C; RED=0xE24B4A; REDV=0xFF3B30; GREY=0x6B6B6B

# backgrounds (built once)
[ -f bg_cream.png ] || "$FF" -y -f lavfi -i "gradients=s=1080x1920:c0=0xFFFFFF:c1=0xF1EAE2:type=radial:x0=540:y0=640:nb_colors=2" -frames:v 1 bg_cream.png -loglevel error < /dev/null
[ -f bg_ph.png ]    || "$FF" -y -f lavfi -i "color=0xEDE7DF:s=1080x1920" -vf "drawbox=x=70:y=70:w=940:h=1780:color=0x2C2C2C@0.18:t=4" -frames:v 1 bg_ph.png -loglevel error < /dev/null

# line: text fontsize color t_in y fontfile
line() { echo "drawtext=fontfile=$6:text='$1':fontsize=$2:fontcolor=$3:alpha='clip((t-$4)/0.4\,0\,1)':x=(w-text_w)/2:y='$5+45*(1-clip((t-$4)/0.4\,0\,1))'"; }
# red pill button with white label, appears at t
pill() { echo "drawbox=x=(iw-780)/2:y=$2:w=780:h=112:color=${RED}:t=fill:enable='gte(t,$3)',drawtext=fontfile=${BOLD}:text='$1':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=$2+34:enable='gte(t,$3)'"; }
sig() { echo "drawtext=fontfile=${HEAD}:text='marli':fontsize=46:fontcolor=${RED}:x=(w-text_w)/2:y=1770"; }

card() { # out bg vf
  "$FF" -y -loop 1 -t 5 -i "$2" -vf "$3,format=yuv420p" -r 30 -t 5 -c:v libx264 -crf 16 -preset fast "$1" -loglevel error < /dev/null
  echo "built $1"
}

# ---- REAL TEXT CARDS ----
# PROBLEM (slot 2)
P="$(line 'EL PROBLEMA' 44 $GREY 0.10 560 $SEMI),"
P="${P}$(line '+8 HORAS' 150 $RED 0.45 720 $HEAD),"
P="${P}$(line 'a la semana en tareas' 56 $INK 1.05 920 $BOLD),"
P="${P}$(line 'administrativas' 56 $INK 1.25 990 $BOLD),"
P="${P}$(sig)"
card card_problem.mp4 bg_cream.png "$P"

# BENEFIT (slot 5)
B="$(line 'LA DIFERENCIA' 44 $GREY 0.10 560 $SEMI),"
B="${B}$(line 'PAGO ÚNICO' 120 $RED 0.45 700 $HEAD),"
B="${B}$(line 'Se queda contigo para siempre' 50 $INK 1.05 900 $BOLD),"
B="${B}$(line 'Sin cuotas. Sin sorpresas.' 44 $GREY 1.4 980 $SEMI),"
B="${B}$(sig)"
card card_benefit.mp4 bg_cream.png "$B"

# CTA (slot 6)
C="$(line 'Automatiza tu consulta' 60 $INK 0.20 600 $BOLD),"
C="${C}$(line 'en menos de 1 hora' 72 $RED 0.65 700 $HEAD),"
C="${C}$(line 'Sin cuotas. Sin técnicos.' 44 $GREY 1.1 830 $SEMI),"
C="${C}$(pill 'AGENDA TU LLAMADA GRATIS' 1050 1.5),"
C="${C}$(line 'marliagency.com' 46 $INK 2.0 1230 $BOLD),"
C="${C}fade=t=out:st=4.5:d=0.5"
card card_cta.mp4 bg_cream.png "$C"

# ---- PLACEHOLDERS (preview only) ----
H1="$(line '[ CINEMATIC ]' 46 $RED 0.10 560 $BOLD),"
H1="${H1}$(line 'Li en tu consulta' 64 $INK 0.4 660 $HEAD),"
H1="${H1}$(line 'overlay: TU CONSULTA DEPENDE' 40 $GREY 0.8 900 $SEMI),"
H1="${H1}$(line 'SOLO DE TI' 40 $GREY 0.95 960 $SEMI),"
H1="${H1}$(line '(clip IA generado)' 36 $GREY 1.3 1700 $SEMI)"
card ph_cine1.mp4 bg_ph.png "$H1"

H3="$(line '[ UGC ]' 46 $RED 0.10 560 $BOLD),"
H3="${H3}$(line 'Testimonio psicologa' 60 $INK 0.4 660 $HEAD),"
H3="${H3}$(line 'Llevo 6 meses sin redactar' 40 $GREY 0.8 900 $SEMI),"
H3="${H3}$(line 'un informe a mano' 40 $GREY 0.95 960 $SEMI),"
H3="${H3}$(line '(clip IA con voz real)' 36 $GREY 1.3 1700 $SEMI)"
card ph_ugc.mp4 bg_ph.png "$H3"

H4="$(line '[ CINEMATIC ]' 46 $RED 0.10 560 $BOLD),"
H4="${H4}$(line 'Li organiza tu dia' 64 $INK 0.4 660 $HEAD),"
H4="${H4}$(line 'overlay: CONOCE A LI' 40 $GREY 0.8 900 $SEMI),"
H4="${H4}$(line '(clip IA generado)' 36 $GREY 1.3 1700 $SEMI)"
card ph_cine2.mp4 bg_ph.png "$H4"

# ---- PREVIEW ANIMATIC: C,T,U,C,T,CTA ----
printf "file 'ph_cine1.mp4'\nfile 'card_problem.mp4'\nfile 'ph_ugc.mp4'\nfile 'ph_cine2.mp4'\nfile 'card_benefit.mp4'\nfile 'card_cta.mp4'\n" > concat_preview.txt
"$FF" -y -f concat -safe 0 -i concat_preview.txt -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p preview_video.mp4 -loglevel error < /dev/null
[ -f music.wav ] || bash build_music.sh
"$FF" -y -i preview_video.mp4 -i music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t 30 -movflags +faststart marli_preview.mp4 -loglevel error < /dev/null
echo "DONE -> marli_preview.mp4"
