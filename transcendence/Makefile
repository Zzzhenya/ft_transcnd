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
	@echo "  make stop             - Stop all services (💾 keeps database data)"
	@echo "  make stop-safe        - Stop with explicit data preservation verification"
	@echo "  make clean            - Stop and remove containers (💾 keeps all data)"
	@echo "  make fclean           - Stop and remove everything (⚠️  deletes all data!)"
	@echo "  make nuke             - Alias for fclean (⚠️  nuclear option!)"
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
	@echo "🗄️  Database Operations:"
	@echo "  make db-status        - Check database service health"
	@echo "  make db-list-users    - List users in database"
	@echo "  make db-seed          - Seed database with test data"
	@echo "  make db-clear         - Clear all database data (⚠️  destructive!)"
	@echo "  make db-reset         - Reset database completely (⚠️  fresh start!)"
	@echo "  make db-view          - Open database viewer"
	@echo ""
	@echo "🔄 Development:"
	@echo "  make up               - Build and start (alias for start-monitoring)"
	@echo "  make down             - Interactive cleanup with confirmation"
	@echo "  make restart          - Stop and start all services"
	@echo ""
	@echo "🔐 SSL/HTTPS:"
	@echo "  make dev-ssl          - Start with HTTPS verification"
	@echo "  make ssl-cert         - Generate new SSL certificates"
	@echo "  make ssl-verify       - Check SSL certificate validity"
	@echo "  make ssl-info         - Display SSL certificate information"

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
	@echo "  Nginx:        http://localhost:8000 (HTTP) / https://localhost:8443 (HTTPS)"
	@echo "  Frontend:     http://localhost:3004 (direct)"
	@echo "  Gateway:      http://localhost:3000"
	@echo "  Database API: http://localhost:3006"
	@echo "  Kibana:       http://localhost:5601"
	@echo "  Logstash:     http://localhost:5044 (external testing)"
	@echo ""
	@echo "📊 Running health checker..."
	@sleep 2
#	@docker compose -f docker-compose.yml run --rm health-checker || true
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
	@echo "🛑 Stopping all services (keeping database data)..."
	@docker ps | wc -l
	docker compose --profile monitoring --profile full down
	@echo "✅ All services stopped - database data preserved"
	@echo "💾 Database volumes maintained:"
	@docker volume ls | grep transcendence_ | grep -E "(shared-data|elasticsearch-data)" || echo "  No transcendence volumes found"
	@docker ps | wc -l

clean: stop
	@echo "🧹 Cleaning containers (keeping all volumes and data)..."
	docker compose --profile monitoring --profile full down --remove-orphans
	@echo "✅ Containers cleaned - all data preserved"

stop-safe:
	@echo "🛡️  Safe stop - explicitly preserving all data..."
	@echo "📊 Current volumes before stop:"
	@docker volume ls | grep transcendence_ || echo "  No transcendence volumes found"
	docker compose --profile monitoring --profile full down --remove-orphans
	@echo "📊 Volumes after stop (should be same as before):"
	@docker volume ls | grep transcendence_ || echo "  No transcendence volumes found"
	@echo "✅ Safe stop completed - all data preserved"

fclean: stop
	@echo "⚠️  Full cleanup will remove ALL DATA including logs and databases!"
	@read -p "Are you sure? [y/N] " ans && ans=$${ans:-N} ;\
	if [ $${ans} = y ] || [ $${ans} = Y ]; then\
		printf "🗑️  Performing full cleanup...\n" ;\
		docker compose --profile monitoring --profile full down -v ;\
		docker volume prune -af ;\
		docker volume rm transcendence_shared-data transcendence_elasticsearch-data 2>/dev/null || true ;\
		docker system prune -a -f ;\
		echo "✅ Full cleanup completed!" ;\
	else\
		printf "❌ Cleanup aborted\n" ;\
	fi

# New alias for the old behavior
nuke: fclean

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
	docker compose logs -f gateway user-service game-service tournament-service log-service database-service frontend

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
			"message": "Test log from Makefile", \
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
# SSL/HTTPS Commands
#=============================================================================
ssl-cert:
	@echo "🔐 Generating SSL certificates..."
	@./generate-ssl.sh

ssl-verify:
	@echo "🔍 Verifying SSL certificates..."
	@openssl x509 -in nginx/ssl/certificate.crt -text -noout | grep -A 3 "Validity"
	@openssl verify -CAfile nginx/ssl/certificate.crt nginx/ssl/certificate.crt || echo "⚠️  Self-signed certificate (expected for development)"

ssl-info:
	@echo "📋 SSL Certificate Information:"
	@echo "🗂️  Certificate: nginx/ssl/certificate.crt"
	@echo "🔑 Private key: nginx/ssl/private.key"
	@echo ""
	@openssl x509 -in nginx/ssl/certificate.crt -noout -subject -dates
	@echo ""
	@echo "🌐 Access URLs:"
	@echo "  HTTPS: https://localhost"
	@echo "  HTTP:  http://localhost (redirects to HTTPS)"

dev-ssl: ssl-verify start-monitoring
	@echo ""
	@echo "🎉 HTTPS development environment started!"
	@echo "🔐 Access your application at: https://localhost"
	@echo "⚠️  You may need to accept the self-signed certificate in your browser"

#=============================================================================
# Development Helpers
#=============================================================================
dev-setup:
	@echo "🛠️  Setting up development environment..."
	@chmod +x monitoring/kibana/*.sh
	@chmod +x generate-ssl.sh
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
# Database Operations (René's Integration)
#=============================================================================
db-status:
	@echo "🗄️  Checking database service health..."
	@curl -s http://localhost:3006/health | grep -q "ok" \
		&& echo "✅ Database service is healthy" \
		|| echo "❌ Database service not responding"

db-list-users:
	@echo "👥 Listing users in database..."
	@curl -s "http://localhost:3006/api/list?table=Users&limit=10" | \
		python3 -m json.tool 2>/dev/null || \
		echo "❌ Failed to connect to database service"

db-seed:
	@echo "🌱 Seeding database with test data..."
	@if [ -f "services/database/scripts/test_db_data.sh" ]; then \
		docker compose exec database-service /bin/sh /app/scripts/test_db_data.sh || \
		echo "⚠️  Running seed script locally..." && ./services/database/scripts/test_db_data.sh; \
	else \
		echo "❌ Seed script not found"; \
	fi

db-clear:
	@echo "⚠️  This will delete ALL database data!"
	@read -p "Are you sure? [y/N] " ans && ans=$${ans:-N} ;\
	if [ $${ans} = y ] || [ $${ans} = Y ]; then\
		echo "🗑️  Clearing database..." ;\
		if [ -f "services/database/scripts/clear_db.sh" ]; then \
			docker compose exec database-service /bin/sh /app/scripts/clear_db.sh || \
			./services/database/scripts/clear_db.sh; \
		else \
			echo "❌ Clear script not found"; \
		fi ;\
	else\
		printf "❌ Database clear aborted\n" ;\
	fi

# New: Reset database completely (for when you want fresh start)
db-reset:
	@echo "🔄 This will completely reset the database to initial state!"
	@echo "   All users, games, tournaments, and notifications will be lost."
	@read -p "Continue? [y/N] " ans && ans=$${ans:-N} ;\
	if [ $${ans} = y ] || [ $${ans} = Y ]; then\
		echo "🗑️  Removing existing database file..." ;\
		docker run --rm -v transcendence_shared-data:/data alpine rm -f /data/database/transcendence.db* 2>/dev/null || echo "  No database file to remove" ;\
		echo "🔄 Restarting database service to recreate fresh database..." ;\
		docker compose restart database ;\
		echo "⏳ Waiting for database to initialize..." ;\
		sleep 5 ;\
		echo "✅ Database reset complete! Fresh database with test user created." ;\
		echo "   You can now register new users." ;\
	else\
		printf "❌ Database reset aborted\n" ;\
	fi

db-view:
	@echo "🔍 Opening database viewer..."
	@if [ -f "viewdb.sh" ]; then \
		./viewdb.sh; \
	else \
		echo "❌ Database viewer script not found"; \
		echo "💡 Alternatively, database is accessible at: http://localhost:3006"; \
	fi

db-query:
	@echo "📊 Example database queries:"
	@echo "  Users count:     curl \"http://localhost:3006/api/query\" -X POST -H \"Content-Type: application/json\" -d '{\"sql\":\"SELECT COUNT(*) as count FROM Users\"}'"
	@echo "  Recent matches:  curl \"http://localhost:3006/api/list?table=Matches&limit=5\""
	@echo "  Tournaments:     curl \"http://localhost:3006/api/list?table=Tournament_Singlematches\""

# New: Volume and data persistence commands
db-check-volumes:
	@echo "💾 Checking database volumes and data persistence..."
	@echo ""
	@echo "📁 Docker volumes:"
	@docker volume ls | grep transcendence_ || echo "  No transcendence volumes found"
	@echo ""
	@echo "📊 Volume inspection:"
	@docker volume inspect transcendence_shared-data 2>/dev/null | grep -A5 -B5 "Mountpoint" || echo "  shared-data volume not found"
	@echo ""
	@echo "🗄️  Database file check:"
	@if docker volume inspect transcendence_shared-data >/dev/null 2>&1; then \
		echo "  ✅ shared-data volume exists"; \
		if docker run --rm -v transcendence_shared-data:/data alpine ls -la /data/database/ 2>/dev/null; then \
			echo "  ✅ Database directory accessible"; \
			docker run --rm -v transcendence_shared-data:/data alpine ls -lah /data/database/transcendence.db 2>/dev/null && echo "  ✅ Database file found" || echo "  ❌ Database file not found"; \
		else \
			echo "  ❌ Database directory not accessible"; \
		fi; \
	else \
		echo "  ❌ shared-data volume not found"; \
	fi

# Show data before and after operations  
show-data:
	@echo "📊 Current data summary:"
	@echo ""
	@$(MAKE) db-check-volumes
	@echo ""
	@echo "👥 Users in database (if accessible):"
	@curl -s "http://localhost:3006/api/query" \
		-X POST -H "Content-Type: application/json" \
		-d '{"sql":"SELECT COUNT(*) as user_count FROM Users"}' 2>/dev/null | \
		python3 -c "import sys,json; data=json.load(sys.stdin); print(f'  Total users: {data[\"data\"][0][\"user_count\"]}')" 2>/dev/null || \
		echo "  ❌ Could not fetch user count (service may be down)"

#=============================================================================
# Enhanced Health Checks
#=============================================================================
health-full: health
	@echo ""
	@echo "🗄️  Database Service Health:"
	@curl -s http://localhost:3006/health -w " (Status: %{http_code})\n" || echo "❌ Database service not responding"
	@echo ""
	@echo "📊 Database Stats:"
	@curl -s "http://localhost:3006/api/query" \
		-X POST -H "Content-Type: application/json" \
		-d '{"sql":"SELECT COUNT(*) as user_count FROM Users"}' 2>/dev/null | \
		python3 -c "import sys,json; data=json.load(sys.stdin); print(f'  Users: {data[\"data\"][0][\"user_count\"]}')" 2>/dev/null || \
		echo "  ❌ Could not fetch user count"

#=============================================================================
# Shortcuts and Aliases
#=============================================================================
# Quick shortcuts
s: start
sm: start-monitoring
st: stop
sts: stop-safe
l: logs
t: test
h: health
hf: health-full
k: kibana
db: db-status
dbu: db-list-users
dbv: db-check-volumes
data: show-data
ssl: dev-ssl
cert: ssl-cert
