#!/usr/bin/env bash
# Cerca chiavi/segreti nei file dell'app. Uso: tests/05-segreti.sh <cartella-app>
# Mostra tutte le corrispondenze (anche innocue, come la parola "token" nei CSS o i nomi dei campi "ai_chiave") e poi cerca solo i valori che somigliano a chiavi vere.
D="${1:-${SNAPSHOT:-.}}"
echo "== Corrispondenze generiche (da leggere a mano) =="
grep -rniE "api[_-]?key|secret|token|AIza|password" "$D" --exclude-dir=.git --exclude-dir=tests -I | cut -c1-200
echo
echo "== Valori che somigliano a chiavi vere (AIza..., sk-..., ghp_..., stringhe lunghe base64) =="
if grep -rnE "AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY" "$D" --exclude-dir=.git --exclude-dir=tests -I; then echo "TROVATO: controllare!"; exit 1; else echo "Nessuna chiave vera trovata: OK"; fi
echo
echo "== Indirizzi mail / telefoni / dati personali evidenti =="
grep -rnE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}" "$D" --exclude-dir=.git --exclude-dir=tests -I | cut -c1-200 || true
echo "(fine)"
