# Transcendence Project Makefile
# Enhanced with Feature Configuration Support

COMPOSE_FILE = docker-compose.yml
PROJECT_NAME = transcendence

# Colors for output
GREEN = \033[0;32m
RED = \033[0;31m
YELLOW = \033[0;33m
BLUE = \033[0;34m
PURPLE = \033[0;35m
CYAN = \033[0;36m
NC = \033[0m # No Color

.PHONY: help setup ssl up down restart logs clean deep_clean status docker_status ps build rebuild

# Default target
help:
	@echo "$(PURPLE)🚀 TRANSCENDENCE PROJECT$(NC)"
	@echo "$(GREEN)Available commands:$(NC)"
	@echo ""
	@echo "$(YELLOW)📋 Setup & Configuration:$(NC)"
	@echo "  $(CYAN)setup$(NC)         - Complete project setup (SSL + Features)"
	@echo "  $(CYAN)config$(NC)        - Configure features interactively"
	@echo "  $(CYAN)ssl$(NC)           - Setup SSL certificates only"
	@echo "  $(CYAN)quick-setup$(NC)   - Quick setup with default features"
	@echo ""
	@echo "$(YELLOW)🐳 Docker Management:$(NC)"
	@echo "  $(CYAN)up$(NC)            - Start all services"
	@echo "  $(CYAN)down$(NC)          - Stop all services"
	@echo "  $(CYAN)restart$(NC)       - Restart all services"
	@echo "  $(CYAN)build$(NC)         - Build all images"
	@echo "  $(CYAN)rebuild$(NC)       - Rebuild all images from scratch"
	@echo ""
	@echo "$(YELLOW)📊 Monitoring & Debugging:$(NC)"
	@echo "  $(CYAN)logs$(NC)          - Show logs for all services"
	@echo "  $(CYAN)logs-f$(NC)        - Follow logs for all services"
	@echo "  $(CYAN)status$(NC)        - Show status of all services"
	@echo "  $(CYAN)features$(NC)      - Show current feature configuration"
	@echo "  $(CYAN)ps$(NC)            - Show running containers"
	@echo ""
	@echo "$(YELLOW)🧹 Cleanup:$(NC)"
	@echo "  $(CYAN)clean$(NC)         - Remove containers and networks"
	@echo "  $(CYAN)deep_clean$(NC)    - Full cleanup (containers, images, volumes)"
	@echo "  $(CYAN)docker_status$(NC) - Show Docker system usage"
	@echo ""
	@echo "$(GREEN)🌍 After setup, visit:$(NC) https://ft_transcendence"
	@echo "$(GREEN)🔧 Database Admin:$(NC) https://ft_transcendence/admin"

# Complete setup
setup: ssl config hosts_info
	@echo "$(GREEN)✅ Complete setup finished!$(NC)"
	@echo "$(YELLOW)Ready to start:$(NC) $(BLUE)make up$(NC)"

# Quick setup with defaults
quick-setup: ssl quick-config hosts_info
	@echo "$(GREEN)⚡ Quick setup finished!$(NC)"
	@echo "$(YELLOW)Ready to start:$(NC) $(BLUE)make up$(NC)"

# Interactive feature configuration
config:
	@echo "$(BLUE)🎯 Starting interactive feature configuration...$(NC)"
	@chmod +x setup-features.sh
	@./setup-features.sh
	@echo "$(GREEN)✅ Feature configuration completed!$(NC)"

# Quick configuration with sensible defaults
quick-config:
	@echo "$(BLUE)⚡ Setting up with default configuration...$(NC)"
	@echo "# Transcendence Configuration - Quick Setup" > backend/.env
	@echo "# Generated on $$(date)" >> backend/.env
	@echo "" >> backend/.env
	@echo "# Basic Settings" >> backend/.env
	@echo "PORT=5000" >> backend/.env
	@echo "JWT_SECRET=$$(openssl rand -base64 32 2>/dev/null || echo 'default-secret-$$(date +%s)')" >> backend/.env
	@echo "" >> backend/.env
	@echo "# Feature Switches - Quick Setup Defaults" >> backend/.env
	@echo "ENABLE_EMAIL_VERIFICATION=false" >> backend/.env
	@echo "ENABLE_2FA=false" >> backend/.env
	@echo "ENABLE_OAUTH=false" >> backend/.env
	@echo "ENABLE_CHAT=true" >> backend/.env
	@echo "ENABLE_GAME_STATS=true" >> backend/.env
	@echo "ENABLE_AVATARS=true" >> backend/.env
	@echo "DEBUG_MODE=false" >> backend/.env
	@echo "" >> backend/.env
	@echo "# Database Settings" >> backend/.env
	@echo "DB_TYPE=postgres" >> backend/.env
	@echo "DB_HOST=postgres" >> backend/.env
	@echo "DB_PORT=5432" >> backend/.env
	@echo "DB_USER=transcendence" >> backend/.env
	@echo "DB_PASSWORD=secretpassword" >> backend/.env
	@echo "DB_NAME=transcendence_db" >> backend/.env
	@echo "" >> backend/.env
	@echo "# CORS Settings" >> backend/.env
	@echo "CORS_ORIGIN=https://ft_transcendence" >> backend/.env
	@echo "$(GREEN)✅ Quick configuration completed!$(NC)"

# Show current feature configuration
features:
	@echo "$(PURPLE)📋 CURRENT FEATURE CONFIGURATION$(NC)"
	@echo "=================================="
	@if [ -f "backend/.env" ]; then \
		echo "$(BLUE)Configuration file: backend/.env$(NC)"; \
		echo ""; \
		grep -E "^ENABLE_|^DEBUG_" backend/.env | while read line; do \
			feature=$$(echo $$line | cut -d'=' -f1); \
			status=$$(echo $$line | cut -d'=' -f2); \
			if [ "$$status" = "true" ]; then \
				echo "$$feature: $(GREEN)ENABLED$(NC)"; \
			else \
				echo "$$feature: $(RED)DISABLED$(NC)"; \
			fi; \
		done; \
		echo ""; \
		echo "$(YELLOW)To reconfigure features, run:$(NC) $(CYAN)make config$(NC)"; \
	else \
		echo "$(RED)❌ No configuration found!$(NC)"; \
		echo "$(YELLOW)Run setup first:$(NC) $(CYAN)make setup$(NC)"; \
	fi
	@echo "=================================="

# Setup SSL certificates
ssl:
	@echo "$(BLUE)🔒 Setting up SSL certificates...$(NC)"
	@chmod +x setup-ssl.sh
	@./setup-ssl.sh
	@echo "$(GREEN)✅ SSL setup complete!$(NC)"

# Show hosts file info
hosts_info:
	@echo "$(YELLOW)🌐 Add this to /etc/hosts:$(NC)"
	@echo "127.0.0.1    ft_transcendence"
	@echo ""
	@echo "$(BLUE)Run this command:$(NC)"
	@echo "echo '127.0.0.1    ft_transcendence' | sudo tee -a /etc/hosts"
	@echo ""

# Start all services
up:
	@echo "$(BLUE)🚀 Starting Transcendence...$(NC)"
	@if [ ! -f "backend/.env" ]; then \
		echo "$(RED)❌ No configuration found!$(NC)"; \
		echo "$(YELLOW)Run setup first:$(NC) $(CYAN)make setup$(NC)"; \
		exit 1; \
	fi
	@docker-compose -f $(COMPOSE_FILE) up -d
	@echo "$(GREEN)✅ Services started!$(NC)"
	@echo ""
	@echo "$(GREEN)🌍 URLs:$(NC)"
	@echo "  Frontend: https://ft_transcendence"
	@echo "  API: https://ft_transcendence/api"
	@echo "  Adminer: https://ft_transcendence/admin"
	@echo "  Health: https://ft_transcendence/health"
	@echo ""
	@echo "$(CYAN)💡 Check feature status:$(NC) $(YELLOW)make features$(NC)"

# Stop all services
down:
	@echo "$(YELLOW)🛑 Stopping Transcendence...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) down
	@echo "$(GREEN)✅ Services stopped!$(NC)"

# Restart all services
restart: down up

# Show logs
logs:
	@docker-compose -f $(COMPOSE_FILE) logs

# Follow logs
logs-f:
	@docker-compose -f $(COMPOSE_FILE) logs -f

# Show service status
status:
	@echo "$(BLUE)📊 SERVICE STATUS$(NC)"
	@echo "===================="
	@docker-compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "$(BLUE)🌐 APPLICATION URLS$(NC)"
	@echo "====================="
	@echo "Frontend:  https://ft_transcendence"
	@echo "API:       https://ft_transcendence/api"
	@echo "Adminer:   https://ft_transcendence/admin"
	@echo "Health:    https://ft_transcendence/health"
	@echo ""
	@make features

# Show running containers
ps:
	@docker-compose -f $(COMPOSE_FILE) ps

# Build all images
build:
	@echo "$(BLUE)🔨 Building images...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) build
	@echo "$(GREEN)✅ Build complete!$(NC)"

# Rebuild all images from scratch
rebuild:
	@echo "$(BLUE)🔨 Rebuilding images from scratch...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) build --no-cache
	@echo "$(GREEN)✅ Rebuild complete!$(NC)"

# Clean up containers and networks
clean:
	@echo "$(YELLOW)🧹 Cleaning up containers and networks...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) down --remove-orphans
	@docker network prune -f
	@echo "$(GREEN)✅ Cleanup complete!$(NC)"

# Deep clean - remove everything including images and volumes
deep_clean:
	@echo "$(RED)🗑️  Deep cleaning (removes everything)...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) down --volumes --remove-orphans
	@docker system prune -af --volumes
	@echo "$(GREEN)✅ Deep cleanup complete!$(NC)"

# Show Docker system usage
docker_status:
	@echo "$(BLUE)📊 DOCKER SYSTEM USAGE$(NC)"
	@echo "========================="
	@docker system df -v
	@echo ""
	@echo "$(BLUE)🐳 RUNNING CONTAINERS$(NC)"
	@echo "========================"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Development helpers
dev-logs:
	@docker-compose -f $(COMPOSE_FILE) logs -f backend frontend

dev-backend:
	@docker-compose -f $(COMPOSE_FILE) logs -f backend

dev-frontend:
	@docker-compose -f $(COMPOSE_FILE) logs -f frontend

dev-db:
	@docker-compose -f $(COMPOSE_FILE) logs -f postgres

# Check if SSL is setup
check-ssl:
	@if [ -f "nginx/ssl/transcendence.crt" ]; then \
		echo "$(GREEN)✅ SSL certificates found$(NC)"; \
		openssl x509 -in nginx/ssl/transcendence.crt -text -noout | grep -E "(Subject|DNS|IP)"; \
	else \
		echo "$(RED)❌ SSL certificates not found. Run: make ssl$(NC)"; \
	fi

# Email test (for debugging email configuration)
test-email:
	@if [ ! -f "backend/.env" ]; then \
		echo "$(RED)❌ No configuration found!$(NC)"; \
		exit 1; \
	fi
	@if grep -q "ENABLE_EMAIL_VERIFICATION=true" backend/.env; then \
		echo "$(BLUE)📧 Email verification is enabled$(NC)"; \
		echo "Test email functionality by registering a new user"; \
	else \
		echo "$(YELLOW)📧 Email verification is disabled$(NC)"; \
		echo "Enable it with: $(CYAN)make config$(NC)"; \
	fi

# Reset configuration
reset-config:
	@echo "$(YELLOW)⚠️  This will reset your configuration!$(NC)"
	@read -p "Are you sure? [y/N]: " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		rm -f backend/.env backend/.env.backup.*; \
		echo "$(GREEN)✅ Configuration reset!$(NC)"; \
		echo "$(YELLOW)Run setup again:$(NC) $(CYAN)make setup$(NC)"; \
	else \
		echo "$(BLUE)Cancelled$(NC)"; \
	fi

# Show configuration
show-config:
	@if [ -f "backend/.env" ]; then \
		echo "$(BLUE)📄 Current Configuration:$(NC)"; \
		echo "========================"; \
		cat backend/.env; \
	else \
		echo "$(RED)❌ No configuration found!$(NC)"; \
	fi