#!/bin/bash
# Open interactive shell in backend container
# Usage: ./scripts/local/shell-backend.sh

set -e

if ! docker compose ps backend | grep -q "running"; then
  echo "❌ Backend container is not running. Start it first: ./scripts/local/up.sh"
  exit 1
fi

echo "🔧 Entering backend container shell (type 'exit' to leave)..."
docker compose exec backend bash
