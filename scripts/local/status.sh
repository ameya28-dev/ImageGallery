#!/bin/bash
# Show container and service status
# Usage: ./scripts/local/status.sh

echo "📊 Container Status (local profile):"
docker compose ps

echo ""
echo "🔗 Service URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   API:       http://localhost:8000"
echo "   Swagger:   http://localhost:8000/swagger-ui.html"
