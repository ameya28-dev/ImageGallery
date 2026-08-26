#!/bin/bash
# Open interactive shell in frontend container
# Usage: ./scripts/local/shell-frontend.sh

set -e

if ! docker compose ps frontend | grep -q "running"; then
  echo "❌ Frontend container is not running. Start it first: ./scripts/local/up.sh"
  exit 1
fi

echo "🔧 Entering frontend container shell (type 'exit' to leave)..."
docker compose exec frontend sh
