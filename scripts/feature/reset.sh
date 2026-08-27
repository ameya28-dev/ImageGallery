#!/bin/bash
# Full reset: stop containers and remove volumes (but does NOT delete RDS/S3 data)
# ⚠️  WARNING: This removes only local Docker volumes, not AWS data
# Usage: ./scripts/feature/reset.sh

set -e

echo "⚠️  Reset will remove local Docker volumes (RDS/S3 data untouched)"
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Reset cancelled."
  exit 1
fi

echo ""
echo "🗑️  Removing containers and local volumes..."
docker compose --env-file .env.feature -f compose.yaml -f compose.feature.override.yaml down -v

echo "Pruning unused Docker images and networks..."
docker image prune -f
docker network prune -f

echo "✅ Local reset complete. RDS/S3 data preserved in AWS."
echo "   Run ./scripts/feature/up.sh to start again."
