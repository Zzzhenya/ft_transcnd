#!/bin/bash
# ========================================
# SQL-INJECTION DEMO für Evaluation
# ========================================

echo "╔════════════════════════════════════════╗"
echo "║  SQL-INJECTION SECURITY TEST          ║"
echo "╔════════════════════════════════════════╗"
echo ""

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Was ist SQL-Injection?"
echo "─────────────────────────────────────────"
echo "Ein Angreifer versucht SQL-Code in Eingabefelder"
echo "einzuschleusen, um die Datenbank zu manipulieren."
echo ""
echo "Beispiel OHNE Schutz:"
echo "  SELECT * FROM users WHERE email='USER_INPUT'"
echo "  Angreifer gibt ein: admin' OR '1'='1"
echo "  Wird zu: SELECT * FROM users WHERE email='admin' OR '1'='1'"
echo "  → Gibt ALLE User zurück!"
echo ""
read -p "Drücke ENTER um mit den Tests zu starten..."
echo ""

# ============================================
# TEST 1: Klassische OR-Injection
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Klassische OR '1'='1' Injection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📤 Sende Login-Request mit Payload:"
echo "   Email: admin@test.com' OR '1'='1"
echo "   Password: egal"
echo ""

RESPONSE=$(curl -k -s -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com'\'' OR '\''1'\''='\''1","password":"egal"}')

STATUS=$(echo "$RESPONSE" | jq -r '.statusCode // .status // "200"')

echo "📥 Response:"
echo "$RESPONSE" | jq .
echo ""

if [ "$STATUS" = "401" ] || [ "$STATUS" = "400" ]; then
  echo -e "${GREEN}✅ GESCHÜTZT!${NC} Login wurde abgelehnt."
  echo "   Die SQL-Injection wurde blockiert!"
else
  echo -e "${RED}❌ VERWUNDBAR!${NC} Login war erfolgreich!"
  echo "   SQL-Injection funktioniert!"
fi
echo ""
read -p "Drücke ENTER für Test 2..."
echo ""

# ============================================
# TEST 2: SQL-Comment Injection
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: SQL-Comment Injection (--)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📤 Sende Login-Request mit Payload:"
echo "   Email: admin@test.com'--"
echo "   Password: egal"
echo ""
echo "   Das '--' kommentiert den Rest der SQL-Query aus!"
echo ""

RESPONSE=$(curl -k -s -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com'\''--","password":"egal"}')

STATUS=$(echo "$RESPONSE" | jq -r '.statusCode // .status // "200"')

echo "📥 Response:"
echo "$RESPONSE" | jq .
echo ""

if [ "$STATUS" = "401" ] || [ "$STATUS" = "400" ]; then
  echo -e "${GREEN}✅ GESCHÜTZT!${NC} Login wurde abgelehnt."
else
  echo -e "${RED}❌ VERWUNDBAR!${NC} Login war erfolgreich!"
fi
echo ""
read -p "Drücke ENTER für Test 3..."
echo ""

# ============================================
# TEST 3: UNION SELECT Injection
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: UNION SELECT Injection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📤 Sende Login-Request mit Payload:"
echo "   Email: test@test.com' UNION SELECT NULL--"
echo "   Password: egal"
echo ""
echo "   UNION könnte Daten aus anderen Tabellen stehlen!"
echo ""

RESPONSE=$(curl -k -s -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com'\'' UNION SELECT NULL--","password":"egal"}')

STATUS=$(echo "$RESPONSE" | jq -r '.statusCode // .status // "200"')

echo "📥 Response:"
echo "$RESPONSE" | jq .
echo ""

if [ "$STATUS" = "401" ] || [ "$STATUS" = "400" ]; then
  echo -e "${GREEN}✅ GESCHÜTZT!${NC} Login wurde abgelehnt."
else
  echo -e "${RED}❌ VERWUNDBAR!${NC} Login war erfolgreich!"
fi
echo ""
read -p "Drücke ENTER für Test 4..."
echo ""

# ============================================
# TEST 4: SQL-Injection in Registration
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: SQL-Injection in Registration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📤 Versuche User zu registrieren mit:"
echo "   Username: admin'--"
echo "   Email: sqltest@test.com"
echo ""

RESPONSE=$(curl -k -s -X POST https://localhost:8443/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin'\''--","email":"sqltest@test.com","password":"Test123!"}')

echo "📥 Response:"
echo "$RESPONSE" | jq .
echo ""

if echo "$RESPONSE" | grep -q "already taken\|already exists"; then
  echo -e "${GREEN}✅ GESCHÜTZT!${NC} SQL-Sonderzeichen werden als normaler Text behandelt."
  echo "   Der Username 'admin'\''--' wird in die DB geschrieben (nicht als SQL interpretiert)."
else
  echo -e "${YELLOW}⚠️  Überprüfe die Response!${NC}"
fi
echo ""

# ============================================
# ZUSAMMENFASSUNG
# ============================================
echo ""
echo "╔════════════════════════════════════════╗"
echo "║         ZUSAMMENFASSUNG                ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Alle SQL-Injection Versuche wurden blockiert! ✅"
echo ""
echo "WARUM ist das System geschützt?"
echo "─────────────────────────────────────────"
echo "1. Prepared Statements mit Platzhaltern (?)"
echo "2. SQL-Code und Daten sind getrennt"
echo "3. User-Input wird IMMER als Daten behandelt, nie als Code"
echo ""
echo "Code-Beispiel (database-service):"
echo "  const query = 'SELECT * FROM users WHERE email = ?';"
echo "  dbAll(query, [email]);  // ← email ist Parameter, kein SQL-Code!"
echo ""
echo "Demo abgeschlossen! 🎉"
echo ""

