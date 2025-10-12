#!/bin/bash
# Script listet Raw-Dateien aus gewünschtem Ordner des Repos auf

# Benutzer-Konfiguration
USER="Zzzhenya"
REPO="ft_transcnd"
BRANCH="rene_codebase/legacy"

# Eingabe des Zielordners
read -p "Welcher Ordner im Repository soll durchsucht werden? " FOLDER

# Prüfen, ob Ordner existiert
if [ ! -d "$FOLDER" ]; then
    echo "❌ Ordner '$FOLDER' existiert nicht."
    exit 1
fi

# Verzeichnisse, die ausgeschlossen werden sollen
if [ "$FOLDER" = "." ]; then
    EXCLUDE_DIRS="node_modules db .git dist build docs Orga .bashrc list_raws.sh README.md restart.sh"
else
    EXCLUDE_DIRS="node_modules db .git dist build"
fi

echo "🔗 Raw-Links aller Dateien in '$FOLDER', ohne $EXCLUDE_DIRS:"
echo

# Erstelle find-Befehl mit Ausschlüssen
exclude_pattern=""
for dir in $EXCLUDE_DIRS; do
    if [ -z "$exclude_pattern" ]; then
        exclude_pattern="-path */$dir -prune"
    else
        exclude_pattern="$exclude_pattern -o -path */$dir -prune"
    fi
done

# Führe find aus und erstelle Raw-Links
find "$FOLDER" $exclude_pattern -o -type f -print | grep -v "^$FOLDER/\($(echo $EXCLUDE_DIRS | tr ' ' '|')\)" | while IFS= read -r file; do
    # Entferne führende ./ falls vorhanden
    clean_file="${file#./}"
    
    # Erstelle Raw-Link (mit refs/heads/ für korrektes GitHub Format)
    raw_link="https://raw.githubusercontent.com/$USER/$REPO/refs/heads/$BRANCH/$clean_file"
    
    echo "$raw_link"
done