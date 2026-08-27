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

docker compose up -d --build

echo "✅ Services starting in background..."
echo ""
echo "📖 View logs:   ./scripts/local/logs.sh"
echo "📊 Status:      ./scripts/local/status.sh"
echo "🛑 Stop:        ./scripts/local/down.sh"
echo ""
echo "🚀 Once healthy, access at:"
echo "   Frontend:   http://localhost:3000"
echo "   API:        http://localhost:8000"
echo "   Swagger:    http://localhost:8000/swagger-ui.html"
echo "   SQLite CLI: sqlite3 data/gallery.db (in backend container: docker exec imagegallery-backend-1 sqlite3 /app/data/gallery.db)"
