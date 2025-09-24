#!/bin/bash

# Neustart-Skript für Transcendence Projekt

echo "=== Transcendence Projekt Neustart ==="
echo "Dieses Skript bereinigt und startet das Projekt neu"
echo ""

# Schritt 1: Alle Docker Container stoppen
echo "Schritt 1: Stoppe alle Docker Container..."
docker compose down -v

# Schritt 2: Entferne alle Docker Images vom Projekt
echo "Schritt 2: Entferne Projekt-spezifische Docker Images..."
docker rmi $(docker images | grep transcend | awk '{print $3}') -f 2>/dev/null || true

# Schritt 3: Bereinige Docker System (optional)
echo "Schritt 3: Bereinige Docker System..."
docker system prune -f

# Schritt 4: Lösche node_modules und temporäre Dateien
echo "Schritt 4: Lösche node_modules und temporäre Dateien..."
rm -rf frontend/node_modules
rm -rf backend/node_modules
rm -rf frontend/build
rm -f frontend/.env.local
rm -f backend/.env.local

# Schritt 5: Installiere Dependencies neu
echo "Schritt 5: Installiere Dependencies..."
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Schritt 6: Baue Docker Images neu
echo "Schritt 6: Baue Docker Images neu..."
docker compose build --no-cache

# Schritt 7: Starte alle Services
echo "Schritt 7: Starte alle Services..."
docker compose up -d

# Schritt 8: Zeige Container Status
echo ""
echo "Schritt 8: Container Status:"
docker compose ps

# Schritt 9: Zeige Logs
echo ""
echo "=== Logs (letzte 50 Zeilen) ==="
docker compose logs --tail=50

echo ""
echo "=== Fertig! ==="
echo "Frontend erreichbar unter: http://localhost:3000"
echo "Backend erreichbar unter: http://localhost:5000"
echo "Datenbank-Admin unter: http://localhost:8080"
echo ""
echo "Für Live-Logs verwende: docker compose logs -f"