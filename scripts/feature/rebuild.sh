#!/bin/bash
# Rebuild Docker images without starting containers
# Usage: ./scripts/feature/rebuild.sh

set -e

echo "🔨 Rebuilding Docker images (feature profile)..."
docker compose --env-file .env.feature -f compose.yaml -f compose.feature.override.yaml build

echo "✅ Build complete. Run ./scripts/feature/up.sh to start."
