# Frontend Makefile for ft_transcendence
# Project configuration
PROJECT_NAME = transcendence-frontend
DOCKER_IMAGE = $(PROJECT_NAME)
DOCKER_TAG = latest
CONTAINER_NAME = $(PROJECT_NAME)-container
PORT = 3004

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

# Default target
.PHONY: help
help:
	@echo "$(GREEN)Frontend Makefile for ft_transcendence$(NC)"
	@echo ""
	@echo "$(YELLOW)Available targets:$(NC)"
	@echo "  $(GREEN)Development:$(NC)"
	@echo "    dev          - Start development server locally"
	@echo "    install      - Install npm dependencies"
	@echo "    build        - Build the frontend for production"
	@echo "    preview      - Preview production build locally"
	@echo "    clean        - Clean build artifacts"
	@echo ""
	@echo "  $(GREEN)Code Quality:$(NC)"
	@echo "    lint         - Run ESLint"
	@echo "    lint-fix     - Run ESLint with auto-fix"
	@echo "    format       - Format code with Prettier"
	@echo "    check        - Run all checks (lint + format check)"
	@echo ""
	@echo "  $(GREEN)Docker:$(NC)"
	@echo "    docker-build - Build Docker image"
	@echo "    docker-dev   - Run development container"
	@echo "    docker-prod  - Run production container"
	@echo "    docker-stop  - Stop running container"
	@echo "    docker-clean - Remove container and image"
	@echo ""
	@echo "  $(GREEN)Utility:$(NC)"
	@echo "    logs         - Show container logs"
	@echo "    shell        - Open shell in running container"
	@echo "    status       - Show container status"

# Development targets
.PHONY: install
install:
	@echo "$(GREEN)Installing npm dependencies...$(NC)"
	npm install

.PHONY: dev
dev:
	@echo "$(GREEN)Starting development server...$(NC)"
	npm run dev

.PHONY: build
build:
	@echo "$(GREEN)Building frontend for production...$(NC)"
	npm run build

.PHONY: preview
preview: build
	@echo "$(GREEN)Starting preview server...$(NC)"
	npm run preview

.PHONY: clean
clean:
	@echo "$(GREEN)Cleaning build artifacts...$(NC)"
	rm -rf dist/
	rm -rf node_modules/.cache/
	@echo "$(GREEN)Clean complete!$(NC)"

# Code quality targets
.PHONY: lint
lint:
	@echo "$(GREEN)Running ESLint...$(NC)"
	npm run lint

.PHONY: lint-fix
lint-fix:
	@echo "$(GREEN)Running ESLint with auto-fix...$(NC)"
	npm run lint:fix

.PHONY: format
format:
	@echo "$(GREEN)Formatting code with Prettier...$(NC)"
	npm run format

.PHONY: check
check: lint
	@echo "$(GREEN)Running Prettier check...$(NC)"
	npx prettier --check "{src,public}/**/*.{ts,tsx,css,html}"
	@echo "$(GREEN)All checks passed!$(NC)"

# Docker targets
.PHONY: docker-build
docker-build:
	@echo "$(GREEN)Building Docker image...$(NC)"
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .
	@echo "$(GREEN)Docker image built successfully!$(NC)"

.PHONY: docker-dev
docker-dev: docker-build
	@echo "$(GREEN)Starting development container...$(NC)"
	docker run -d \
		--name $(CONTAINER_NAME)-dev \
		-p $(PORT):$(PORT) \
		-v $(PWD):/app \
		-v /app/node_modules \
		--target development \
		$(DOCKER_IMAGE):$(DOCKER_TAG)
	@echo "$(GREEN)Development container started at http://localhost:$(PORT)$(NC)"

.PHONY: docker-prod
docker-prod: docker-build
	@echo "$(GREEN)Starting production container...$(NC)"
	docker run -d \
		--name $(CONTAINER_NAME)-prod \
		-p $(PORT):$(PORT) \
		--target production \
		$(DOCKER_IMAGE):$(DOCKER_TAG)
	@echo "$(GREEN)Production container started at http://localhost:$(PORT)$(NC)"

.PHONY: docker-stop
docker-stop:
	@echo "$(YELLOW)Stopping containers...$(NC)"
	-docker stop $(CONTAINER_NAME)-dev $(CONTAINER_NAME)-prod 2>/dev/null || true
	-docker rm $(CONTAINER_NAME)-dev $(CONTAINER_NAME)-prod 2>/dev/null || true
	@echo "$(GREEN)Containers stopped!$(NC)"

.PHONY: docker-clean
docker-clean: docker-stop
	@echo "$(YELLOW)Removing Docker image...$(NC)"
	-docker rmi $(DOCKER_IMAGE):$(DOCKER_TAG) 2>/dev/null || true
	@echo "$(GREEN)Docker cleanup complete!$(NC)"

# Utility targets
.PHONY: logs
logs:
	@echo "$(GREEN)Showing container logs...$(NC)"
	@if docker ps --format "table {{.Names}}" | grep -q "$(CONTAINER_NAME)"; then \
		docker logs -f $$(docker ps --filter "name=$(CONTAINER_NAME)" --format "{{.Names}}" | head -1); \
	else \
		echo "$(RED)No running container found with name $(CONTAINER_NAME)$(NC)"; \
	fi

.PHONY: shell
shell:
	@echo "$(GREEN)Opening shell in container...$(NC)"
	@if docker ps --format "table {{.Names}}" | grep -q "$(CONTAINER_NAME)"; then \
		docker exec -it $$(docker ps --filter "name=$(CONTAINER_NAME)" --format "{{.Names}}" | head -1) /bin/sh; \
	else \
		echo "$(RED)No running container found with name $(CONTAINER_NAME)$(NC)"; \
	fi

.PHONY: status
status:
	@echo "$(GREEN)Container status:$(NC)"
	@docker ps --filter "name=$(CONTAINER_NAME)" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "$(YELLOW)No containers found$(NC)"

# Convenience targets
.PHONY: up
up: docker-prod

.PHONY: down
down: docker-stop

.PHONY: restart
restart: docker-stop docker-prod

.PHONY: rebuild
rebuild: docker-clean docker-prod

# Make sure intermediate files are cleaned up
.INTERMEDIATE: