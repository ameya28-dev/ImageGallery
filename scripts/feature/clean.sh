#!/bin/bash
# Clean up Docker artifacts (stopped containers, dangling images, etc.)
# Does NOT delete RDS/S3 data
# Usage: ./scripts/feature/clean.sh

set -e

echo "🧹 Cleaning up Docker artifacts (feature profile)..."

echo "  Removing stopped containers..."
docker container prune -f

echo "  Removing dangling images..."
docker image prune -f

echo "  Removing unused networks..."
docker network prune -f

echo "✅ Cleanup complete."
