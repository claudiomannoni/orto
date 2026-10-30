#!/usr/bin/env bash
# Lancia tutte le prove della Fase 1.
# Uso: tests/run-fase1.sh <cartella-app> [porta]
#   <cartella-app>: la cartella da servire (per la Fase 1: la copia congelata del commit 4b46bad)
set -u
APP="${1:?indica la cartella dell app}"
PORTA="${2:-8101}"
QUI="$(cd "$(dirname "$0")" && pwd)"
python3 -m http.server "$PORTA" --directory "$APP" >/dev/null 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null' EXIT
sleep 1
export BASE="http://localhost:$PORTA" SNAPSHOT="$APP"
KO=0
for t in 01-schermate 02-flussi 03-ia 04-offline-sw; do
  echo "=== $t ==="; node "$QUI/$t.mjs" || KO=1
done
echo "=== 05-segreti ==="; "$QUI/05-segreti.sh" "$APP" | tail -8 || KO=1
exit $KO
