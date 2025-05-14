#!/bin/bash

# Script list Raw datein aus gewuenschten Ordner des Repo aus

# Benutzer-Konfiguration
USER="ELREKO"        
REPO="trancsendenc_Phase_1_test_public"         
BRANCH="main"



# Eingabe des Zielordners
read -p "Welcher Ordner im Repository soll durchsucht werden? " FOLDER

# Prüfen, ob Ordner existiert
if [ ! -d "$FOLDER" ]; then
  echo "❌ Ordner '$FOLDER' existiert nicht."
  exit 1
fi

# Verzeichnisse, die ausgeschlossen werden sollen
EXCLUDE_DIRS=("node_modules" "db")

echo "🔗 Raw-Links aller Dateien in '$FOLDER', ohne ${EXCLUDE_DIRS[*]}:"
echo

# Ausschluss-Ausdruck mit -prune
find_cmd=(find "$FOLDER")
for dir in "${EXCLUDE_DIRS[@]}"; do
  find_cmd+=(-path "$FOLDER/$dir" -prune -o)
done
find_cmd+=(-type f -print)

# Ausführen und Raw-Links erzeugen
"${find_cmd[@]}" | while IFS= read -r file; do
  clean_file="${file#./}"
  raw_link="https://raw.githubusercontent.com/$USER/$REPO/$BRANCH/$clean_file"
  
  # Falls 'refs/heads/' in der URL auftaucht, entfernen
  raw_link=$(echo "$raw_link" | sed 's/refs\/heads\///')

  echo "$raw_link"
done
