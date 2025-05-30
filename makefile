# Makefile

# Standard build
all: up

# Services starten
up:
	docker-compose up -d --build

# Services stoppen
down:
	docker-compose down

# Logs anzeigen
logs:
	docker-compose logs -f

# Restart services
restart:
	docker-compose restart

# Clean - Services stoppen und Container/Images löschen
clean:
	docker-compose down
	docker-compose rm -f
	docker image prune -f

# Clean all - ALLES löschen (inkl. Volumes/Datenbank!)
clean_all:
	docker-compose down -v
	docker-compose rm -f
	docker image prune -a -f
	docker system prune -f

# NEU: Deep Clean - Komplett aufräumen (inkl. Build Cache)
deep_clean:
	docker-compose down -v
	docker system prune -a --volumes -f
	docker builder prune -a -f

# NEU: Speicher-Status anzeigen
docker_status:
	@echo "=== DOCKER SPEICHER STATUS ==="
	@echo "Images:"
	@docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
	@echo "\nContainer:"
	@docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
	@echo "\nVolumes:"
	@docker volume ls
	@echo "\nGesamter Docker Speicher:"
	@docker system df

# NEU: Nur Build Cache löschen (behält Images)
clean_cache:
	docker builder prune -a -f

.PHONY: all up down logs restart clean clean_all deep_clean docker_status clean_cache