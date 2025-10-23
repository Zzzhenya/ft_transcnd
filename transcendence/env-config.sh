#!/bin/bash

# Environment Configuration Helper for Transcendence

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Transcendence Environment Configuration Helper${NC}"
echo "=================================================="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
    else
        echo -e "${RED}❌ .env.example not found. Please create one first.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

# Function to show environment status
show_env_status() {
    echo ""
    echo -e "${BLUE}📋 Current Environment Configuration:${NC}"
    echo "======================================"
    
    # Check required variables
    required_vars=(
        "NODE_ENV"
        "VITE_API_BASE"
        "VITE_GATEWAY_BASE"
        "VITE_WS_BASE"
        "USER_SERVICE_URL"
        "GAME_SERVICE_URL"
        "LOG_SERVICE_URL"
        "JWT_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        value=$(grep "^${var}=" .env 2>/dev/null | cut -d'=' -f2- || echo "")
        if [ -n "$value" ]; then
            # Mask sensitive values
            if [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"PASSWORD"* ]]; then
                echo -e "${GREEN}✅ $var: [HIDDEN]${NC}"
            else
                echo -e "${GREEN}✅ $var: $value${NC}"
            fi
        else
            echo -e "${RED}❌ $var: NOT SET${NC}"
        fi
    done
}

# Function to validate environment
validate_env() {
    echo ""
    echo -e "${BLUE}🔍 Validating Environment...${NC}"
    
    # Check for development vs production
    node_env=$(grep "^NODE_ENV=" .env | cut -d'=' -f2 || echo "")
    if [ "$node_env" = "development" ]; then
        echo -e "${GREEN}✅ Development mode detected${NC}"
    elif [ "$node_env" = "production" ]; then
        echo -e "${YELLOW}⚠️  Production mode detected${NC}"
        
        # Check JWT secret
        jwt_secret=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2 || echo "")
        if [ "$jwt_secret" = "your-secret-key-change-in-production" ]; then
            echo -e "${RED}❌ SECURITY WARNING: Default JWT secret detected in production!${NC}"
            echo -e "${YELLOW}   Please change JWT_SECRET to a secure random value${NC}"
        fi
    fi
    
    # Check URL consistency
    gateway_base=$(grep "^VITE_GATEWAY_BASE=" .env | cut -d'=' -f2 || echo "")
    api_base=$(grep "^VITE_API_BASE=" .env | cut -d'=' -f2 || echo "")
    
    if [[ "$api_base" == "$gateway_base"* ]]; then
        echo -e "${GREEN}✅ API URLs are consistent${NC}"
    else
        echo -e "${YELLOW}⚠️  API base should start with gateway base${NC}"
    fi
}

# Function to update environment for different modes
update_env_mode() {
    echo ""
    echo -e "${BLUE}🔄 Environment Mode Options:${NC}"
    echo "1. Development (localhost)"
    echo "2. Docker (service names)"
    echo "3. Production (custom)"
    echo "4. Cancel"
    
    read -p "Select mode [1-4]: " choice
    
    case $choice in
        1)
            echo -e "${YELLOW}Setting up for development mode...${NC}"
            sed -i '' 's/NODE_ENV=.*/NODE_ENV=development/' .env
            sed -i '' 's|VITE_API_BASE=.*|VITE_API_BASE=http://localhost:3000/user-service|' .env
            sed -i '' 's|VITE_GATEWAY_BASE=.*|VITE_GATEWAY_BASE=http://localhost:3000|' .env
            sed -i '' 's|VITE_WS_BASE=.*|VITE_WS_BASE=ws://localhost:3000|' .env
            echo -e "${GREEN}✅ Development mode configured${NC}"
            ;;
        2)
            echo -e "${YELLOW}Setting up for Docker mode...${NC}"
            sed -i '' 's/NODE_ENV=.*/NODE_ENV=development/' .env
            sed -i '' 's|VITE_API_BASE=.*|VITE_API_BASE=http://gateway:3000/user-service|' .env
            sed -i '' 's|VITE_GATEWAY_BASE=.*|VITE_GATEWAY_BASE=http://gateway:3000|' .env
            sed -i '' 's|VITE_WS_BASE=.*|VITE_WS_BASE=ws://gateway:3000|' .env
            echo -e "${GREEN}✅ Docker mode configured${NC}"
            ;;
        3)
            echo -e "${YELLOW}Production mode setup...${NC}"
            read -p "Enter your domain (e.g., yourdomain.com): " domain
            read -p "Use HTTPS? [y/N]: " https_choice
            
            protocol="http"
            ws_protocol="ws"
            if [[ "$https_choice" =~ ^[Yy]$ ]]; then
                protocol="https"
                ws_protocol="wss"
            fi
            
            sed -i '' 's/NODE_ENV=.*/NODE_ENV=production/' .env
            sed -i '' "s|VITE_API_BASE=.*|VITE_API_BASE=${protocol}://${domain}/user-service|" .env
            sed -i '' "s|VITE_GATEWAY_BASE=.*|VITE_GATEWAY_BASE=${protocol}://${domain}|" .env
            sed -i '' "s|VITE_WS_BASE=.*|VITE_WS_BASE=${ws_protocol}://${domain}|" .env
            
            echo -e "${GREEN}✅ Production mode configured for ${domain}${NC}"
            echo -e "${YELLOW}⚠️  Don't forget to update JWT_SECRET for production!${NC}"
            ;;
        4)
            echo "Cancelled"
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            ;;
    esac
}

# Function to generate secure JWT secret
generate_jwt_secret() {
    echo ""
    echo -e "${BLUE}🔐 Generating secure JWT secret...${NC}"
    
    # Generate a random 64-character string
    jwt_secret=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 32)
    
    if [ -n "$jwt_secret" ]; then
        sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=${jwt_secret}/" .env
        echo -e "${GREEN}✅ New JWT secret generated and saved${NC}"
    else
        echo -e "${RED}❌ Failed to generate JWT secret${NC}"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo -e "${BLUE}📚 Available Actions:${NC}"
    echo "1. Show environment status"
    echo "2. Validate environment"
    echo "3. Update environment mode"
    echo "4. Generate new JWT secret"
    echo "5. Exit"
    echo ""
}

# Main loop
while true; do
    show_menu
    read -p "Select an action [1-5]: " action
    
    case $action in
        1)
            show_env_status
            ;;
        2)
            validate_env
            ;;
        3)
            update_env_mode
            ;;
        4)
            generate_jwt_secret
            ;;
        5)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice. Please select 1-5.${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done