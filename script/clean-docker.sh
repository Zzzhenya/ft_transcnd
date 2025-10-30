#!/bin/zsh

echo "🧹 Cleaning up Docker junk..."

# Stop Docker (optional but safer for cleanup)
echo "🛑 Stopping Docker..."
pkill -f Docker
killall Docker 2>/dev/null

# Remove stopped containers
echo "🗑 Removing stopped containers..."
docker container prune -f 2>/dev/null

# Remove unused images
echo "🗑 Removing unused Docker images..."
docker image prune -a -f 2>/dev/null

# Remove unused volumes
echo "🗑 Removing unused volumes..."
docker volume prune -f 2>/dev/null

# Remove unused networks
echo "🗑 Removing unused networks..."
docker network prune -f 2>/dev/null

# Clear build cache
echo "🗑 Cleaning build cache..."
docker builder prune -a -f 2>/dev/null

echo "✅ Docker cleanup complete! Your system is now lighter 🚀"
echo "💡 Tip: restart Docker with:  open -a Docker"
