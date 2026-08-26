#!/bin/bash
# Clean up Docker artifacts (stopped containers, dangling images, etc.)
# Does NOT delete data volumes
# Usage: ./scripts/local/clean.sh

set -e

echo "🧹 Cleaning up Docker artifacts (local profile)..."

echo "  Removing stopped containers..."
docker container prune -f

echo "  Removing dangling images..."
docker image prune -f

echo "  Removing unused networks..."
docker network prune -f

echo "✅ Cleanup complete."
