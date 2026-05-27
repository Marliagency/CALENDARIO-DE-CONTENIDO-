#!/bin/bash
# Sube los 4 clips de Higgsfield a GitHub para que Claude los procese
# Ejecutar UNA VEZ: bash subir_clips.sh

set -e
GREEN='\033[0;32m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'

echo -e "${BOLD}======================================"
echo -e "  Marli Agency — Subiendo clips a GitHub"
echo -e "======================================${NC}"

CLIPS_DIR="$HOME/Desktop/marli-higgsfield"

# Buscar el repositorio git
REPO_DIR=""
for dir in \
  "$HOME/CALENDARIO-DE-CONTENIDO-" \
  "$HOME/Desktop/CALENDARIO-DE-CONTENIDO-" \
  "$HOME/Documents/CALENDARIO-DE-CONTENIDO-" \
  "$HOME/Downloads/CALENDARIO-DE-CONTENIDO-"; do
  if [ -d "$dir/.git" ]; then
    REPO_DIR="$dir"
    break
  fi
done

if [ -z "$REPO_DIR" ]; then
  echo -e "${RED}No se encontró el repositorio. Clonando...${NC}"
  cd "$HOME/Desktop"
  git clone https://github.com/marliagency/CALENDARIO-DE-CONTENIDO-.git
  REPO_DIR="$HOME/Desktop/CALENDARIO-DE-CONTENIDO-"
fi

echo -e "  Repositorio: $REPO_DIR"
cd "$REPO_DIR"
git fetch origin claude/admiring-tesla-AasgU 2>/dev/null || true
git checkout claude/admiring-tesla-AasgU 2>/dev/null || git checkout -b claude/admiring-tesla-AasgU

mkdir -p "$REPO_DIR/marli-ad-assets/higgsfield-clips"

FOUND=0
for f in clip1.mp4 clip2.mp4 ugc1.mp4 ugc2.mp4; do
  if [ -f "$CLIPS_DIR/$f" ]; then
    SIZE=$(du -sh "$CLIPS_DIR/$f" | cut -f1)
    echo -e "  ${GREEN}✓${NC} Copiando $f ($SIZE)..."
    cp "$CLIPS_DIR/$f" "$REPO_DIR/marli-ad-assets/higgsfield-clips/$f"
    FOUND=$((FOUND+1))
  else
    echo -e "  ${RED}✗${NC} No encontrado: $f"
  fi
done

if [ $FOUND -eq 0 ]; then
  echo -e "${RED}Error: ningún clip encontrado en $CLIPS_DIR${NC}"
  echo "Asegúrate de haber ejecutado montar_final.sh primero."
  exit 1
fi

echo ""
echo -e "  Subiendo $FOUND clips a GitHub..."
git add marli-ad-assets/higgsfield-clips/*.mp4
git commit -m "Add $FOUND Higgsfield clips for Claude video assembly"
git push -u origin claude/admiring-tesla-AasgU

echo ""
echo -e "${GREEN}${BOLD}======================================"
echo -e "  ✅ Listo! $FOUND clips subidos."
echo -e "  Claude puede descargarlos ahora."
echo -e "======================================${NC}"
