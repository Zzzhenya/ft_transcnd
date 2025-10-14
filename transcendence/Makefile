# Transcendence Microservices Makefile
# Combines development and production workflows

.PHONY: help all start start-monitoring stop clean fclean logs test health

# Default target
all: start-monitoring

#=============================================================================
# Help and Information
#=============================================================================
help:
	@echo "🚀 Transcendence Microservices Commands"
	@echo ""
	@echo "📦 Basic Operations:"
	@echo "  make all              - Start all services with monitoring (default)"
	@echo "  make start            - Start basic services only (no ELK stack)"
	@echo "  make start-monitoring - Start all services with ELK monitoring"
	@echo "  make stop             - Stop all services (keep data)"
	@echo "  make clean            - Stop and remove containers (keep volumes)"
	@echo "  make fclean           - Stop and remove everything (⚠️  deletes all data!)"
	@echo ""
	@echo "📊 Monitoring & Logs:"
	@echo "  make logs             - Follow all container logs"
	@echo "  make logs-elk         - Follow ELK stack logs only"
	@echo "  make logs-services    - Follow application services logs only"
	@echo "  make kibana           - Open Kibana in browser"
	@echo ""
	@echo "🧪 Testing & Health:"
	@echo "  make test             - Send test log to Logstash"
	@echo "  make health           - Check all services health"
	@echo "  make status           - Show container status"
	@echo ""
	@echo "🔄 Development:"
	@echo "  make up               - Build and start (alias for start-monitoring)"
	@echo "  make down             - Interactive cleanup with confirmation"
	@echo "  make restart          - Stop and start all services"

#=============================================================================
# Main Service Commands
#=============================================================================
start:
	@echo "🚀 Starting basic services..."
	docker compose up -d
	@echo ""
	@echo "✅ Basic services started!"
	@echo "  Frontend: http://localhost:3004"
	@echo "  Gateway:  http://localhost:3000"
	@echo ""
	@echo "💡 For monitoring, use: make start-monitoring"

start-monitoring:
	@echo "🚀 Starting all services with ELK monitoring..."
	docker compose --profile monitoring up --build -d
	@echo ""
	@echo "⏳ Waiting for services to initialize..."
	@sleep 3
	@echo ""
	@echo "🎉 All services started with monitoring!"
	@echo "⏳ Wait ~60 seconds for Elasticsearch & Kibana to fully initialize"
	@echo ""
	@echo "🔗 Access Points:"
	@echo "  Frontend:     http://localhost:3004"
	@echo "  Gateway:      http://localhost:3000"
	@echo "  Kibana:       http://localhost:5601"
	@echo "  Logstash:     http://localhost:5044 (external testing)"
	@echo ""
	@echo "📊 Running health checker..."
	@sleep 2
	@docker compose -f docker-compose.yml run --rm health-checker || true
	@echo ""
	@echo "📈 Container count:"
	@docker ps | wc -l

# Aliases for different workflows
up: start-monitoring
compose: start-monitoring

#=============================================================================
# Stop and Cleanup Commands
#=============================================================================
stop:
	@echo "🛑 Stopping all services..."
	@docker ps | wc -l
	docker compose down
	@echo "✅ All services stopped"
	@docker ps | wc -l

clean: stop
	@echo "🧹 Cleaning containers (keeping volumes)..."
	docker compose down
	@echo "✅ Containers cleaned"

fclean: stop
	@echo "⚠️  Full cleanup will remove ALL DATA including logs and databases!"
	@read -p "Are you sure? [y/N] " ans && ans=$${ans:-N} ;\
	if [ $${ans} = y ] || [ $${ans} = Y ]; then\
		printf "🗑️  Performing full cleanup...\n" ;\
		docker compose down -v ;\
		docker volume prune -af ;\
		docker volume rm transcendence_shared-data transcendence_elasticsearch-data 2>/dev/null || true ;\
		docker system prune -a -f ;\
		echo "✅ Full cleanup completed!" ;\
	else\
		printf "❌ Cleanup aborted\n" ;\
	fi

down: fclean

restart: stop start-monitoring

#=============================================================================
# Logging and Monitoring
#=============================================================================
logs:
	@echo "📜 Following all logs (Ctrl+C to stop)..."
	docker compose logs -f

logs-elk:
	@echo "📊 Following ELK stack logs (Ctrl+C to stop)..."
	docker compose logs -f elasticsearch logstash kibana kibana-setup

logs-services:
	@echo "🔧 Following application services logs (Ctrl+C to stop)..."
	docker compose logs -f gateway user-service game-service tournament-service log-service frontend

kibana:
	@echo "🔍 Opening Kibana in browser..."
	@open http://localhost:5601 2>/dev/null || xdg-open http://localhost:5601 2>/dev/null || echo "🌐 Open: http://localhost:5601"

status:
	@echo "📊 Container Status:"
	docker compose ps

#=============================================================================
# Testing and Health Checks
#=============================================================================
test:
	@echo "🧪 Sending test log to Logstash..."
	@curl -X POST http://localhost:5044 \
		-H "Content-Type: application/json" \
		-d '{ \
			"level": "info", \
			"message": "Test log from Makefile at '$$(date)'", \
			"service": "makefile-test", \
			"metadata": { \
				"source": "makefile", \
				"timestamp": "'$$(date -u +"%Y-%m-%dT%H:%M:%SZ")'" \
			} \
		}' \
		-w "\nHTTP Status: %{http_code}\n" \
		&& echo "✅ Test log sent successfully!" \
		|| echo "❌ Failed to send test log"

test-log-service:
	@echo "🧪 Testing log-service endpoint..."
	@curl -X POST http://localhost:3003/api/logs \
		-H "Content-Type: application/json" \
		-d '{ \
			"level": "info", \
			"message": "Test via log-service", \
			"service": "makefile-test" \
		}' \
		-w "\nHTTP Status: %{http_code}\n" \
		&& echo "✅ Log-service test completed!" \
		|| echo "❌ Log-service not accessible (internal only)"

health:
	@echo "🩺 Checking service health..."
	@echo ""
	@echo "🔍 Gateway Health:"
	@curl -s http://localhost:3000/health -w " (Status: %{http_code})\n" || echo "❌ Gateway not responding"
	@echo ""
	@echo "🔍 Elasticsearch Health:"
	@curl -s http://localhost:9200/_cluster/health?pretty || echo "❌ Elasticsearch not accessible (internal only)"
	@echo ""
	@echo "🔍 Kibana Status:"
	@curl -s http://localhost:5601/api/status -w " (Status: %{http_code})\n" || echo "❌ Kibana not responding"
	@echo ""
	@echo "🔍 Logstash Health:"
	@curl -s http://localhost:5044 -X GET -w " (Status: %{http_code})\n" || echo "❌ Logstash not responding"

#=============================================================================
# Development Helpers
#=============================================================================
dev-setup:
	@echo "🛠️  Setting up development environment..."
	@chmod +x monitoring/kibana/*.sh
	@echo "✅ Scripts made executable"

rebuild:
	@echo "🔄 Rebuilding all containers..."
	docker compose --profile monitoring build --no-cache
	@echo "✅ Rebuild completed"

reset-logs:
	@echo "🗑️  Resetting Elasticsearch logs..."
	@read -p "This will delete all stored logs. Continue? [y/N] " ans && ans=$${ans:-N} ;\
	if [ $${ans} = y ] || [ $${ans} = Y ]; then\
		docker compose stop elasticsearch ;\
		docker volume rm transcendence_elasticsearch-data 2>/dev/null || true ;\
		docker compose --profile monitoring up -d ;\
		echo "✅ Logs reset completed!" ;\
	else\
		printf "❌ Log reset aborted\n" ;\
	fi

#=============================================================================
# Shortcuts and Aliases
#=============================================================================
# Quick shortcuts
s: start
sm: start-monitoring
st: stop
l: logs
t: test
h: health
k: kibana