# Transcendence Project Makefile
# Enhanced with HTTPS/TLS support

COMPOSE_FILE = docker-compose.yml
PROJECT_NAME = transcendence

# Colors for output
GREEN = \033[0;32m
RED = \033[0;31m
YELLOW = \033[0;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

.PHONY: help setup ssl up down restart logs clean deep_clean status docker_status ps build rebuild

# Default target
help:
	@echo "$(BLUE)🚀 Transcendence Project$(NC)"
	@echo "$(GREEN)Available commands:$(NC)"
	@echo "  $(YELLOW)setup$(NC)       - Initial project setup with SSL"
	@echo "  $(YELLOW)ssl$(NC)         - Setup SSL certificates only"
	@echo "  $(YELLOW)up$(NC)          - Start all services"
	@echo "  $(YELLOW)down$(NC)        - Stop all services"
	@echo "  $(YELLOW)restart$(NC)     - Restart all services"
	@echo "  $(YELLOW)logs$(NC)        - Show logs for all services"
	@echo "  $(YELLOW)logs-f$(NC)      - Follow logs for all services"
	@echo "  $(YELLOW)status$(NC)      - Show status of all services"
	@echo "  $(YELLOW)ps$(NC)          - Show running containers"
	@echo "  $(YELLOW)build$(NC)       - Build all images"
	@echo "  $(YELLOW)rebuild$(NC)     - Rebuild all images from scratch"
	@echo "  $(YELLOW)clean$(NC)       - Remove containers and networks"
	@echo "  $(YELLOW)deep_clean$(NC)  - Full cleanup (containers, images, volumes)"
	@echo "  $(YELLOW)docker_status$(NC) - Show Docker system usage"
	@echo ""
	@echo "$(GREEN)🌍 After setup, visit:$(NC) https://ft_transcendence"
	@echo "$(GREEN)🔧 Database Admin:$(NC) https://ft_transcendence/admin"

# Initial setup with SSL
setup: ssl hosts_info
	@echo "$(GREEN)✅ Setup complete!$(NC)"
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "1. Add ft_transcendence to /etc/hosts (see above)"
	@echo "2. Run: $(BLUE)make up$(NC)"
	@echo "3. Visit: $(BLUE)https://ft_transcendence$(NC)"

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
	@docker-compose -f $(COMPOSE_FILE) up -d
	@echo "$(GREEN)✅ Services started!$(NC)"
	@echo "$(GREEN)🌍 Frontend:$(NC) https://ft_transcendence"
	@echo "$(GREEN)🔧 Adminer:$(NC) https://ft_transcendence/admin"
	@echo "$(GREEN)🏥 Health:$(NC) https://ft_transcendence/health"

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
	@echo "$(BLUE)📊 Service Status:$(NC)"
	@docker-compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "$(BLUE)🌐 URLs:$(NC)"
	@echo "Frontend: https://ft_transcendence"
	@echo "API: https://ft_transcendence/api"
	@echo "Adminer: https://ft_transcendence/admin"
	@echo "Health: https://ft_transcendence/health"

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
	@echo "$(BLUE)📊 Docker System Usage:$(NC)"
	@docker system df -v
	@echo ""
	@echo "$(BLUE)🐳 Running Containers:$(NC)"
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