#!/bin/bash
# Tail logs from all services
# Usage: ./scripts/local/logs.sh
# Usage: ./scripts/local/logs.sh backend   (specific service)

set -e

SERVICE="${1:-}"

if [ -n "$SERVICE" ]; then
  echo "📋 Tailing logs from $SERVICE (Ctrl+C to stop)..."
  docker compose logs -f "$SERVICE"
else
  echo "📋 Tailing logs from all services (Ctrl+C to stop)..."
  docker compose logs -f
fi
