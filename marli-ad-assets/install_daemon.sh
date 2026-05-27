#!/bin/bash
# Marli Agency — Higgsfield Auto-Sync
# Instala un daemon que descarga automáticamente los videos de Higgsfield
# a Google Drive cuando se generan.
# Ejecutar UNA SOLA VEZ: bash install_daemon.sh

set -e
BOLD='\033[1m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BOLD}${BLUE}============================================"
echo -e "  Marli Agency — Higgsfield Auto-Sync"
echo -e "  Configuración del daemon automático"
echo -e "============================================${NC}"

API_KEY="64c86182-ad20-4505-af72-6e38a5fb9e9b"
DAEMON_DIR="$HOME/.marli-sync"
SYNC_DIR="$HOME/Desktop/higgsfield-sync"
PLIST="$HOME/Library/LaunchAgents/com.marli.higgsfield-sync.plist"
LOG="$HOME/Library/Logs/marli-sync.log"

mkdir -p "$DAEMON_DIR" "$SYNC_DIR"

# ── Detectar Google Drive Desktop ───────────────────────────────────────────
GDRIVE=""
for path in \
  "$HOME/Google Drive/My Drive" \
  "$HOME/Google Drive" \
  "$HOME/Library/CloudStorage/GoogleDrive-marli.agency@gmail.com/My Drive" \
  "$HOME/Library/CloudStorage/GoogleDrive-diegogeins@gmail.com/My Drive"; do
  if [ -d "$path" ]; then
    GDRIVE="$path"
    break
  fi
done

if [ -n "$GDRIVE" ]; then
  UPLOAD_DIR="$GDRIVE/Higgsfield-Videos"
  mkdir -p "$UPLOAD_DIR"
  echo -e "${GREEN}✓${NC} Google Drive encontrado: $GDRIVE"
  echo -e "  Videos se sincronizarán a: $UPLOAD_DIR"
else
  UPLOAD_DIR="$SYNC_DIR"
  echo -e "⚠️  Google Drive Desktop no encontrado."
  echo -e "   Videos se guardarán en: $SYNC_DIR"
  echo -e "   Instala Google Drive Desktop para sync automático."
fi

# ── Escribir el daemon script ────────────────────────────────────────────────
cat > "$DAEMON_DIR/sync.sh" << DAEMON_EOF
#!/bin/bash
API_KEY="${API_KEY}"
UPLOAD_DIR="${UPLOAD_DIR}"
SEEN_FILE="${DAEMON_DIR}/seen_ids.txt"
LOG="${LOG}"

log() { echo "\$(date '+%H:%M:%S') \$1" >> "\$LOG"; }

touch "\$SEEN_FILE"
log "Daemon iniciado — vigilando Higgsfield..."

while true; do
  # Obtener generaciones completadas de Higgsfield
  RESPONSE=\$(curl -s -m 15 \
    -H "Authorization: Bearer \$API_KEY" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6)" \
    "https://api.higgsfield.ai/v1/generations?limit=20&status=completed" 2>/dev/null)

  if [ -z "\$RESPONSE" ]; then
    sleep 60
    continue
  fi

  # Extraer IDs y URLs con python (viene en macOS)
  python3 - << 'PYEOF' 2>/dev/null || python - << 'PYEOF' 2>/dev/null
import json, sys, os

data_str = ''''\'''\'''\''
PYEOF_INNER
# Use env vars instead
import subprocess
response = os.environ.get('HF_RESPONSE','{}')
try:
    data = json.loads(response)
    items = data.get('items', data.get('data', data if isinstance(data, list) else []))
    for item in items:
        vid_id = item.get('id','')
        status = item.get('status','')
        results = item.get('results', {})
        url = results.get('rawUrl','') if isinstance(results, dict) else ''
        if status == 'completed' and vid_id and url:
            print(f"{vid_id}|{url}")
except:
    pass
PYEOF

  # Fallback con grep si python falla
  PAIRS=\$(echo "\$RESPONSE" | grep -o '"id":"[^"]*","type":"video","status":"completed"' | \
    grep -o '"id":"[^"]*"' | grep -o '[^"]*"$' | tr -d '"' || true)

  # Parsear con python3 correctamente
  VIDEOS=\$(echo "\$RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    items = data.get('items', [])
    for item in items:
        vid_id = item.get('id','')
        status = item.get('status','')
        results = item.get('results', {})
        url = results.get('rawUrl','') if isinstance(results, dict) else ''
        model = item.get('model','')
        if status == 'completed' and vid_id and url:
            print(f'{vid_id}|{url}|{model}')
except Exception as e:
    pass
" 2>/dev/null)

  while IFS='|' read -r VID_ID VID_URL MODEL; do
    [ -z "\$VID_ID" ] && continue
    # Ya descargado?
    grep -qF "\$VID_ID" "\$SEEN_FILE" 2>/dev/null && continue

    FNAME="\${VID_ID:0:8}_\${MODEL}.mp4"
    DEST="\$UPLOAD_DIR/\$FNAME"

    log "Nuevo video: \$VID_ID (\$MODEL)"
    if curl -L -s -m 120 \
      -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6)" \
      "\$VID_URL" -o "\$DEST" 2>/dev/null; then
      SIZE=\$(du -sh "\$DEST" 2>/dev/null | cut -f1)
      log "✓ Descargado: \$FNAME (\$SIZE)"
      echo "\$VID_ID" >> "\$SEEN_FILE"
    else
      log "✗ Error descargando: \$VID_ID"
      rm -f "\$DEST"
    fi
  done <<< "\$VIDEOS"

  sleep 60
done
DAEMON_EOF

chmod +x "$DAEMON_DIR/sync.sh"

# ── LaunchAgent plist ─────────────────────────────────────────────────────────
cat > "$PLIST" << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.marli.higgsfield-sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${DAEMON_DIR}/sync.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>${LOG}</string>
    <key>StandardOutPath</key>
    <string>${LOG}</string>
    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>
PLIST_EOF

# ── Iniciar el daemon ──────────────────────────────────────────────────────────
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo ""
echo -e "${GREEN}${BOLD}============================================"
echo -e "  ✅ Daemon instalado y activo"
echo -e "============================================${NC}"
echo ""
echo -e "  📁 Videos → ${UPLOAD_DIR}"
echo -e "  📋 Logs   → ${LOG}"
echo -e "  ⏱  Revisa Higgsfield cada 60 segundos"
echo -e "  🔄 Se inicia automáticamente con el Mac"
echo ""
echo -e "  Para ver el log en tiempo real:"
echo -e "  tail -f ${LOG}"
echo ""
echo -e "  Para desinstalar:"
echo -e "  launchctl unload ${PLIST} && rm ${PLIST}"
