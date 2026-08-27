#!/bin/bash
# Start local profile in RELEASE MODE (no debug overhead)
# Use this for performance testing
# Usage: ./scripts/local/up-release.sh

set -e

echo "🚀 Starting Image Gallery (local profile, RELEASE MODE)..."
echo "   Backend: SQLite (./data/gallery.db) — No JDWP debugging"
echo "   Storage: Local filesystem (./data/)"
echo "   Frontend: http://localhost:3000 — No Node inspect"
echo "   API: http://localhost:8000"
echo ""

# Load release configuration (disables Swagger, debug endpoints)
docker compose --env-file .env.release -f compose.yaml -f compose.release.override.yaml up -d --build

echo "✅ Services starting in background (release mode — optimized performance)..."
echo ""
echo "📖 View logs:   ./scripts/local/logs.sh"
echo "📊 Status:      ./scripts/local/status.sh"
echo "🛑 Stop:        ./scripts/local/down.sh"
echo ""
echo "🚀 Once healthy, access at:"
echo "   Frontend:   http://localhost:3000"
echo "   API:        http://localhost:8000"
echo ""
echo "📊 Release mode active:"
echo "   ✅ JDWP debugging disabled (faster)"
echo "   ✅ Node inspect disabled (faster)"
echo "   ✅ Swagger docs hidden (/swagger-ui disabled)"
echo "   ✅ Management endpoints hidden"
echo ""
echo "💡 Tip: To return to debug mode, use ./scripts/local/up.sh"
