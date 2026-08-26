#!/bin/bash
# Full reset: stop containers, remove data volumes, and prune images
# ⚠️  WARNING: This deletes all local data (gallery.db, images, thumbnails)
# Usage: ./scripts/local/reset.sh

set -e

echo "⚠️  Full reset will DELETE all local data (gallery.db, images, thumbnails)"
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Reset cancelled."
  exit 1
fi

echo ""
echo "🗑️  Removing containers, volumes, and data..."
docker compose down -v

echo "Pruning unused Docker images and networks..."
docker image prune -f
docker network prune -f

echo "✅ Full reset complete. Run ./scripts/local/up.sh to start fresh."
