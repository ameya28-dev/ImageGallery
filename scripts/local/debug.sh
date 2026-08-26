#!/bin/bash
# Start local profile with debug services (sqlite-web UI on :8085)
# Usage: ./scripts/local/debug.sh

set -e

echo "🐛 Starting Image Gallery with debug services..."
echo "   SQLite Web UI: http://localhost:8085"
echo ""

docker compose --profile debug up --build

echo ""
echo "✅ Debug profile running!"
