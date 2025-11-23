#!/bin/bash
echo "=== REDIRECT ANALYSE: /pong ==="
echo ""

echo "1️⃣ Vollständiger Header:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -k -I https://localhost:8443/pong 2>/dev/null

echo ""
echo "2️⃣ Wohin geht der Redirect?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
LOCATION=$(curl -k -s -I https://localhost:8443/pong 2>/dev/null | grep -i "location:" | cut -d' ' -f2- | tr -d '\r')
echo "Redirect Ziel: $LOCATION"

echo ""
echo "3️⃣ Was ist am Ziel?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "$LOCATION" ]; then
  # Folge dem Redirect
  curl -k -L -s https://localhost:8443/pong | head -5
  echo "..."
  
  # Check Content-Type
  FINAL_TYPE=$(curl -k -L -s -I https://localhost:8443/pong 2>/dev/null | grep -i "content-type:" | cut -d' ' -f2-)
  echo ""
  echo "Finaler Content-Type: $FINAL_TYPE"
fi

echo ""
echo "BEWERTUNG:"
if [[ $LOCATION == *"pong"* ]] || [[ $LOCATION == "/" ]]; then
  echo "✅ Redirect zu internem Pfad - NORMAL"
  echo "   Wahrscheinlich: /pong → /pong/ (trailing slash)"
else
  echo "⚠️  Redirect zu externem Ziel - PRÜFEN!"
fi

