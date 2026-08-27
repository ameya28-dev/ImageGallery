#!/bin/bash
# Open interactive shell in backend container
# Usage: ./scripts/feature/shell-backend.sh

set -e

if ! docker compose --env-file .env.feature -f compose.yaml -f compose.feature.override.yaml ps backend | grep -q "running"; then
  echo "❌ Backend container is not running. Start it first: ./scripts/feature/up.sh"
  exit 1
fi

echo "🔧 Entering backend container shell (type 'exit' to leave)..."
docker compose --env-file .env.feature -f compose.yaml -f compose.feature.override.yaml exec backend bash
