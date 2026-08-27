#!/bin/bash
# Stop containers (preserve RDS data, S3 objects)
# Usage: ./scripts/feature/down.sh

set -e

echo "🛑 Stopping Image Gallery containers (feature profile)..."
docker compose --env-file .env.feature -f compose.yaml -f compose.feature.override.yaml down

echo "✅ Containers stopped. RDS/S3 data preserved."
