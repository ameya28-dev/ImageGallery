#!/bin/bash
# Open interactive shell in frontend container
# Usage: ./scripts/feature/shell-frontend.sh

set -e

if ! docker compose --env-file .env.feature -f compose.yaml -f compose.feature.override.yaml ps frontend | grep -q "running"; then
  echo "❌ Frontend container is not running. Start it first: ./scripts/feature/up.sh"
  exit 1
fi

echo "🔧 Entering frontend container shell (type 'exit' to leave)..."
docker compose --env-file .env.feature -f compose.yaml -f compose.feature.override.yaml exec frontend sh
