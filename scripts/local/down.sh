#!/bin/bash
# Stop containers (preserve volumes/data)
# Usage: ./scripts/local/down.sh

set -e

echo "🛑 Stopping Image Gallery containers (local profile)..."
docker compose down

echo "✅ Containers stopped. Data preserved in ./data/"
