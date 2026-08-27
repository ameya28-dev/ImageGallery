#!/bin/bash
# Tail logs from all services
# Usage: ./scripts/feature/logs.sh
# Usage: ./scripts/feature/logs.sh backend   (specific service)

set -e

SERVICE="${1:-}"

if [ -n "$SERVICE" ]; then
  echo "📋 Tailing logs from $SERVICE (Ctrl+C to stop)..."
  docker compose --env-file .env.feature -f compose.yaml -f compose.feature.override.yaml logs -f "$SERVICE"
else
  echo "📋 Tailing logs from all services (Ctrl+C to stop)..."
  docker compose --env-file .env.feature -f compose.yaml -f compose.feature.override.yaml logs -f
fi
