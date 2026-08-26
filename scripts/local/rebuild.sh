#!/bin/bash
# Rebuild Docker images without starting containers
# Usage: ./scripts/local/rebuild.sh

set -e

echo "🔨 Rebuilding Docker images (local profile)..."
docker compose build

echo "✅ Build complete. Run ./scripts/local/up.sh to start."
