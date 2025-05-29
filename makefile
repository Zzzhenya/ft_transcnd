# Transcendence Docker Management Makefile
.PHONY: all build up down re clean clean_all logs status help

# Default target - build und starten
all: build up

# Docker Services builden und starten
build:
	@echo "🔨 Building Docker containers..."
	docker-compose build

# Services starten
up:
	@echo "🚀 Starting all services..."
	docker-compose up -d
	@echo "✅ Services started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:5000"
	@echo "Adminer: http://localhost:8080"

# Services runterfahren
down:
	@echo "🛑 Stopping all services..."
	docker-compose down
	@echo "✅ All services stopped!"

# Restart - down und wieder up
re: down
	@echo "🔄 Restarting services..."
	@make up

# Nur Container und Networks bereinigen
clean: down
	@echo "🧹 Cleaning containers and networks..."
	docker-compose down --remove-orphans
	docker system prune -f
	@echo "✅ Cleanup completed!"

# Komplette Bereinigung - ACHTUNG: Löscht auch Volumes (Datenbank!)
clean_all: down
	@echo "⚠️  WARNING: This will delete ALL data including database!"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read dummy
	@echo "🗑️  Performing complete cleanup..."
	docker-compose down -v --remove-orphans
	docker system prune -af --volumes
	@echo "✅ Complete cleanup finished!"

# Logs anzeigen
logs:
	@echo "📋 Showing logs for all services..."
	docker-compose logs -f

# Logs für specific service
logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-db:
	docker-compose logs -f postgres

# Status aller Container anzeigen
status:
	@echo "📊 Container Status:"
	docker-compose ps

# In Backend Container einsteigen
shell-backend:
	docker-compose exec backend /bin/sh

# In Database Container einsteigen
shell-db:
	docker-compose exec postgres psql -U transcendence -d transcendence_db

# Database reset (nur Tabellen leeren, nicht Volume löschen)
db-reset:
	@echo "🔄 Resetting database tables..."
	docker-compose exec postgres psql -U transcendence -d transcendence_db -c "DROP TABLE IF EXISTS users CASCADE;"
	docker-compose restart backend
	@echo "✅ Database tables reset!"

# Development mode - mit live logs
dev: build
	@echo "🔧 Starting in development mode with logs..."
	docker-compose up --build

# Nur rebuild ohne cache
rebuild:
	@echo "🔨 Rebuilding without cache..."
	docker-compose build --no-cache
	@make up

# Health check
health:
	@echo "🏥 Checking service health..."
	@curl -s http://localhost:5000/health || echo "❌ Backend not responding"
	@curl -s -I http://localhost:3000 | head -n 1 || echo "❌ Frontend not responding"
	@echo "✅ Health check completed"

# Help - zeigt alle verfügbaren Befehle
help:
	@echo "🆘 Transcendence Docker Commands:"
	@echo ""
	@echo "Main Commands:"
	@echo "  make (all)     - Build and start all services"
	@echo "  make down      - Stop all services"
	@echo "  make re        - Restart all services (down + up)"
	@echo "  make clean_all - Complete cleanup (⚠️  deletes database!)"
	@echo ""
	@echo "Development:"
	@echo "  make dev       - Start with live logs"
	@echo "  make rebuild   - Rebuild without cache"
	@echo "  make logs      - Show all logs"
	@echo "  make status    - Show container status"
	@echo "  make health    - Check service health"
	@echo ""
	@echo "Database:"
	@echo "  make db-reset  - Reset database tables"
	@echo "  make shell-db  - Enter database shell"
	@echo ""
	@echo "Debugging:"
	@echo "  make logs-backend  - Backend logs only"
	@echo "  make logs-frontend - Frontend logs only"
	@echo "  make shell-backend - Enter backend container"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean     - Clean containers/networks only"
	@echo "  make clean_all - ⚠️  DANGER: Deletes everything including DB!"