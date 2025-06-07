#!/bin/bash

# setup-features.sh
# Interaktives Script zum Konfigurieren der Transcendence Features

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════╗"
echo "║            🚀 TRANSCENDENCE SETUP 🚀            ║"
echo "║           Feature Configuration Tool             ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Environment file path
ENV_FILE="backend/.env"

# Create backup of existing .env
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%s)"
    echo -e "${YELLOW}📋 Backup created: $ENV_FILE.backup.*${NC}"
fi

# Initialize .env content
echo "# Transcendence Configuration" > "$ENV_FILE"
echo "# Generated on $(date)" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"

# Function to ask yes/no questions
ask_yes_no() {
    while true; do
        read -p "$1 [y/N]: " yn
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* | "" ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

# Function to ask for input with default
ask_input() {
    read -p "$1 [$2]: " input
    echo "${input:-$2}"
}

echo -e "${BLUE}📋 Configuring Basic Settings...${NC}"
echo ""

# Basic App Settings
PORT=$(ask_input "Backend Port" "5000")
echo "PORT=$PORT" >> "$ENV_FILE"

JWT_SECRET=$(ask_input "JWT Secret (leave empty for auto-generation)" "")
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "auto-generated-secret-$(date +%s)")
fi
echo "JWT_SECRET=$JWT_SECRET" >> "$ENV_FILE"

echo "" >> "$ENV_FILE"
echo "# Feature Switches" >> "$ENV_FILE"

# Feature Configuration
echo -e "${CYAN}🎯 Feature Configuration${NC}"
echo "Configure which features should be enabled:"
echo ""

# Email Verification
echo -e "${YELLOW}📧 E-Mail Verifizierung${NC}"
echo "   Benutzer müssen ihre E-Mail-Adresse bei der Registrierung bestätigen"
if ask_yes_no "   Aktivieren?"; then
    echo "ENABLE_EMAIL_VERIFICATION=true" >> "$ENV_FILE"
    
    echo ""
    echo -e "${BLUE}📧 E-Mail Configuration${NC}"
    SMTP_HOST=$(ask_input "   SMTP Host" "smtp.gmail.com")
    SMTP_PORT=$(ask_input "   SMTP Port" "587")
    SMTP_USER=$(ask_input "   SMTP Username/Email" "your-email@gmail.com")
    SMTP_PASSWORD=$(ask_input "   SMTP Password/App-Password" "your-app-password")
    EMAIL_FROM=$(ask_input "   From Email" "$SMTP_USER")
    
    echo "" >> "$ENV_FILE"
    echo "# Email Settings" >> "$ENV_FILE"
    echo "SMTP_HOST=$SMTP_HOST" >> "$ENV_FILE"
    echo "SMTP_PORT=$SMTP_PORT" >> "$ENV_FILE"
    echo "SMTP_USER=$SMTP_USER" >> "$ENV_FILE"
    echo "SMTP_PASSWORD=$SMTP_PASSWORD" >> "$ENV_FILE"
    echo "EMAIL_FROM=$EMAIL_FROM" >> "$ENV_FILE"
    echo "SMTP_SECURE=false" >> "$ENV_FILE"
    echo "EMAIL_TOKEN_EXPIRY=24h" >> "$ENV_FILE"
    echo "EMAIL_RESEND_DELAY=60000" >> "$ENV_FILE"
else
    echo "ENABLE_EMAIL_VERIFICATION=false" >> "$ENV_FILE"
fi

echo ""

# Two Factor Auth
echo -e "${YELLOW}🔐 Zwei-Faktor-Authentifizierung${NC}"
echo "   Zusätzliche Sicherheit mit TOTP/SMS"
if ask_yes_no "   Aktivieren?"; then
    echo "ENABLE_2FA=true" >> "$ENV_FILE"
else
    echo "ENABLE_2FA=false" >> "$ENV_FILE"
fi

echo ""

# OAuth Login
echo -e "${YELLOW}🌐 OAuth Login${NC}"
echo "   Login mit Google, GitHub, etc."
if ask_yes_no "   Aktivieren?"; then
    echo "ENABLE_OAUTH=true" >> "$ENV_FILE"
else
    echo "ENABLE_OAUTH=false" >> "$ENV_FILE"
fi

echo ""

# Chat System
echo -e "${YELLOW}💬 Chat System${NC}"
echo "   Real-time Chat zwischen Benutzern"
if ask_yes_no "   Aktivieren?"; then
    echo "ENABLE_CHAT=true" >> "$ENV_FILE"
else
    echo "ENABLE_CHAT=false" >> "$ENV_FILE"
fi

echo ""

# Game Statistics
echo -e "${YELLOW}📊 Spiel-Statistiken${NC}"
echo "   Leaderboard und Statistiken"
if ask_yes_no "   Aktivieren?"; then
    echo "ENABLE_GAME_STATS=true" >> "$ENV_FILE"
else
    echo "ENABLE_GAME_STATS=false" >> "$ENV_FILE"
fi

echo ""

# User Avatars
echo -e "${YELLOW}🖼️  Benutzer Avatars${NC}"
echo "   Avatar Upload für Benutzer"
if ask_yes_no "   Aktivieren?"; then
    echo "ENABLE_AVATARS=true" >> "$ENV_FILE"
else
    echo "ENABLE_AVATARS=false" >> "$ENV_FILE"
fi

echo ""

# Debug Mode
echo -e "${YELLOW}🐛 Debug Mode${NC}"
echo "   Erweiterte Logs und Debug-Informationen"
if ask_yes_no "   Aktivieren?"; then
    echo "DEBUG_MODE=true" >> "$ENV_FILE"
else
    echo "DEBUG_MODE=false" >> "$ENV_FILE"
fi

# Database Settings
echo "" >> "$ENV_FILE"
echo "# Database Settings" >> "$ENV_FILE"
echo "DB_TYPE=postgres" >> "$ENV_FILE"
echo "DB_HOST=postgres" >> "$ENV_FILE"
echo "DB_PORT=5432" >> "$ENV_FILE"
echo "DB_USER=transcendence" >> "$ENV_FILE"
echo "DB_PASSWORD=secretpassword" >> "$ENV_FILE"
echo "DB_NAME=transcendence_db" >> "$ENV_FILE"

# CORS Settings
echo "" >> "$ENV_FILE"
echo "# CORS Settings" >> "$ENV_FILE"
echo "CORS_ORIGIN=https://ft_transcendence" >> "$ENV_FILE"

# Rate Limiting
echo "" >> "$ENV_FILE"
echo "# Rate Limiting" >> "$ENV_FILE"
echo "ENABLE_RATE_LIMITING=true" >> "$ENV_FILE"
echo "RATE_LIMIT_WINDOW=900000" >> "$ENV_FILE"
echo "RATE_LIMIT_MAX=100" >> "$ENV_FILE"

# Success message
echo ""
echo -e "${GREEN}✅ Configuration completed!${NC}"
echo ""
echo -e "${BLUE}📄 Generated files:${NC}"
echo "   - $ENV_FILE"
echo ""
echo -e "${YELLOW}🚀 Next steps:${NC}"
echo "   1. Review the configuration in $ENV_FILE"
echo "   2. Run: ${CYAN}make up${NC}"
echo "   3. Visit: ${CYAN}https://ft_transcendence${NC}"
echo ""

# Show feature summary
echo -e "${PURPLE}📋 Feature Summary:${NC}"
echo "================================"

if grep -q "ENABLE_EMAIL_VERIFICATION=true" "$ENV_FILE"; then
    echo -e "📧 E-Mail Verification:    ${GREEN}ENABLED${NC}"
else
    echo -e "📧 E-Mail Verification:    ${RED}DISABLED${NC}"
fi

if grep -q "ENABLE_2FA=true" "$ENV_FILE"; then
    echo -e "🔐 Two-Factor Auth:        ${GREEN}ENABLED${NC}"
else
    echo -e "🔐 Two-Factor Auth:        ${RED}DISABLED${NC}"
fi

if grep -q "ENABLE_OAUTH=true" "$ENV_FILE"; then
    echo -e "🌐 OAuth Login:            ${GREEN}ENABLED${NC}"
else
    echo -e "🌐 OAuth Login:            ${RED}DISABLED${NC}"
fi

if grep -q "ENABLE_CHAT=true" "$ENV_FILE"; then
    echo -e "💬 Chat System:            ${GREEN}ENABLED${NC}"
else
    echo -e "💬 Chat System:            ${RED}DISABLED${NC}"
fi

if grep -q "ENABLE_GAME_STATS=true" "$ENV_FILE"; then
    echo -e "📊 Game Statistics:        ${GREEN}ENABLED${NC}"
else
    echo -e "📊 Game Statistics:        ${RED}DISABLED${NC}"
fi

if grep -q "ENABLE_AVATARS=true" "$ENV_FILE"; then
    echo -e "🖼️  User Avatars:           ${GREEN}ENABLED${NC}"
else
    echo -e "🖼️  User Avatars:           ${RED}DISABLED${NC}"
fi

if grep -q "DEBUG_MODE=true" "$ENV_FILE"; then
    echo -e "🐛 Debug Mode:             ${GREEN}ENABLED${NC}"
else
    echo -e "🐛 Debug Mode:             ${RED}DISABLED${NC}"
fi

echo "================================"
echo ""
echo -e "${CYAN}💡 Tip: You can re-run this script anytime to change settings!${NC}"