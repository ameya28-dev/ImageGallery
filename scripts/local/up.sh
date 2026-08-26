#!/bin/bash
# Start the local profile (SQLite + local storage, guest mode enabled)
# Usage: ./scripts/local/up.sh

set -e

echo "🚀 Starting Image Gallery (local profile)..."
echo "   Backend: SQLite (./data/gallery.db)"
echo "   Storage: Local filesystem (./data/)"
echo "   Frontend: http://localhost:3000"
echo "   API: http://localhost:8000"
echo ""

docker compose up --build

echo ""
echo "✅ Local profile is running!"
