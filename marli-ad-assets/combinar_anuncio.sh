#!/bin/bash
# ============================================================
# MARLI AGENCY — Combinar anuncio 30s
# ============================================================
# Uso: ./combinar_anuncio.sh
#
# Pon los 4 clips descargados de Higgsfield en la misma carpeta
# con estos nombres antes de ejecutar:
#   clip_hook.mp4      → Psicóloga agotada (6s)
#   clip_robot.mp4     → Robot Li organizando (8s)
#   clip_tvspot.mp4    → TV Spot Marketing Studio (15s)
#   clip_cta.mp4       → Psicóloga serena + CTA (8s)
#
# Resultado: marli_anuncio_30s.mp4
# ============================================================
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/marli_anuncio_30s.mp4"
W=1080; H=1920; FPS=30

# Verificar clips
for f in clip_hook.mp4 clip_robot.mp4 clip_tvspot.mp4 clip_cta.mp4; do
  [ -f "$DIR/$f" ] || { echo "ERROR: Falta $f — descárgalo de Higgsfield primero"; exit 1; }
done

echo "=== MARLI AGENCY — Compilando anuncio 30s ==="
echo "[1/5] Normalizando clips a 1080x1920 @30fps..."

ffmpeg -y -i "$DIR/clip_hook.mp4" \
  -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=FAF6F1" \
  -r $FPS -c:v libx264 -crf 18 -preset fast -c:a aac -ar 44100 -ac 2 \
  "$DIR/_n1_hook.mp4" -v quiet && echo "  hook OK"

ffmpeg -y -i "$DIR/clip_robot.mp4" \
  -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=FAF6F1" \
  -r $FPS -c:v libx264 -crf 18 -preset fast -c:a aac -ar 44100 -ac 2 \
  "$DIR/_n2_robot.mp4" -v quiet && echo "  robot OK"

ffmpeg -y -i "$DIR/clip_tvspot.mp4" \
  -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=FAF6F1" \
  -r $FPS -c:v libx264 -crf 18 -preset fast -c:a aac -ar 44100 -ac 2 \
  "$DIR/_n3_tvspot.mp4" -v quiet && echo "  tvspot OK"

ffmpeg -y -i "$DIR/clip_cta.mp4" \
  -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=FAF6F1" \
  -r $FPS -c:v libx264 -crf 18 -preset fast -c:a aac -ar 44100 -ac 2 \
  "$DIR/_n4_cta.mp4" -v quiet && echo "  cta OK"

echo "[2/5] Añadiendo textos en paleta Marli..."

# HOOK — "¿Cuántas horas de tu semana se van en esto?"
ffmpeg -y -i "$DIR/_n1_hook.mp4" \
  -vf "
    drawbox=x=0:y=H-210:w=W:h=210:color=2C2C2C@0.80:t=fill,
    drawtext=text='¿Cuántas horas de tu semana':fontsize=50:fontcolor=FAF6F1:x=(W-text_w)/2:y=H-190:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf,
    drawtext=text='se van en esto?':fontsize=50:fontcolor=E24B4A:x=(W-text_w)/2:y=H-130:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
  " -c:v libx264 -crf 18 -preset fast -c:a copy \
  "$DIR/_t1_hook.mp4" -v quiet && echo "  texto hook OK"

# ROBOT Li — "Li trabaja mientras tú te dedicas a lo que importa"
ffmpeg -y -i "$DIR/_n2_robot.mp4" \
  -vf "
    drawbox=x=0:y=H-240:w=W:h=240:color=2C2C2C@0.80:t=fill,
    drawtext=text='Li trabaja mientras tú':fontsize=48:fontcolor=FAF6F1:x=(W-text_w)/2:y=H-215:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf,
    drawtext=text='te dedicas a lo que importa.':fontsize=44:fontcolor=E24B4A:x=(W-text_w)/2:y=H-158:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf,
    drawtext=text='CRM · Informes Automáticos · Chatbot IA':fontsize=32:fontcolor=FAF6F1:x=(W-text_w)/2:y=H-100:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
  " -c:v libx264 -crf 18 -preset fast -c:a copy \
  "$DIR/_t2_robot.mp4" -v quiet && echo "  texto robot OK"

# TV SPOT — sin texto adicional (ya tiene storyboard)
cp "$DIR/_n3_tvspot.mp4" "$DIR/_t3_tvspot.mp4" && echo "  tvspot (sin texto extra) OK"

# CTA — MARLI AGENCY + URL
ffmpeg -y -i "$DIR/_n4_cta.mp4" \
  -vf "
    drawbox=x=0:y=H-290:w=W:h=290:color=E24B4A@0.92:t=fill,
    drawtext=text='MARLI AGENCY':fontsize=72:fontcolor=FAF6F1:x=(W-text_w)/2:y=H-268:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:shadowcolor=black:shadowx=2:shadowy=2,
    drawtext=text='La IA para psicólogos':fontsize=46:fontcolor=FAF6F1:x=(W-text_w)/2:y=H-185:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf,
    drawtext=text='Pago único · Sin cuotas · Para siempre':fontsize=34:fontcolor=FAF6F1@0.9:x=(W-text_w)/2:y=H-125:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf,
    drawtext=text='marliagency.com':fontsize=44:fontcolor=FAF6F1:x=(W-text_w)/2:y=H-62:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
  " -c:v libx264 -crf 18 -preset fast -c:a copy \
  "$DIR/_t4_cta.mp4" -v quiet && echo "  texto CTA OK"

echo "[3/5] Aplicando transiciones fade..."

ffmpeg -y -i "$DIR/_t1_hook.mp4"   -vf "fade=in:st=0:d=0.4,fade=out:st=5.6:d=0.4"  -c:v libx264 -crf 18 -preset fast -c:a copy "$DIR/_f1.mp4" -v quiet
ffmpeg -y -i "$DIR/_t2_robot.mp4"  -vf "fade=in:st=0:d=0.4,fade=out:st=7.6:d=0.4"  -c:v libx264 -crf 18 -preset fast -c:a copy "$DIR/_f2.mp4" -v quiet
ffmpeg -y -i "$DIR/_t3_tvspot.mp4" -vf "fade=in:st=0:d=0.4,fade=out:st=14.6:d=0.4" -c:v libx264 -crf 18 -preset fast -c:a copy "$DIR/_f3.mp4" -v quiet
ffmpeg -y -i "$DIR/_t4_cta.mp4"    -vf "fade=in:st=0:d=0.4,fade=out:st=7.6:d=0.4"  -c:v libx264 -crf 18 -preset fast -c:a copy "$DIR/_f4.mp4" -v quiet
echo "  fades OK"

echo "[4/5] Concatenando (Hook → Robot Li → TV Spot → CTA)..."
cat > "$DIR/_concat.txt" << EOF
file '_f1.mp4'
file '_f2.mp4'
file '_f3.mp4'
file '_f4.mp4'
EOF

ffmpeg -y -f concat -safe 0 -i "$DIR/_concat.txt" \
  -c:v libx264 -crf 17 -preset medium -c:a aac -b:a 192k \
  "$DIR/_draft.mp4" -v quiet

echo "[5/5] Recortando a 30s exactos y exportando..."
ffmpeg -y -i "$DIR/_draft.mp4" -t 30 \
  -c:v libx264 -crf 17 -preset medium -c:a aac -b:a 192k \
  "$OUT"

# Limpiar temporales
rm -f "$DIR"/_n*.mp4 "$DIR"/_t*.mp4 "$DIR"/_f*.mp4 "$DIR"/_draft.mp4 "$DIR"/_concat.txt

echo ""
echo "✅ ¡Anuncio listo! → $OUT"
DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$OUT")
echo "   Duración: ${DUR}s | Formato: 1080×1920 @30fps"
