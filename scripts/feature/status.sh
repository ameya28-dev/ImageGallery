#!/bin/bash
# Show container status and verify .env.feature
# Usage: ./scripts/feature/status.sh

echo "📊 Container Status (feature profile):"
docker compose -f compose.yaml -f compose.feature.override.yaml ps

echo ""
echo "🔗 Service URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   API:       http://localhost:8000"
echo "   Swagger:   http://localhost:8000/swagger-ui.html"

echo ""
echo "🔐 Environment Check:"
if [ -f ".env.feature" ]; then
  echo "   ✅ .env.feature exists"
  echo "   Configured values:"
  grep -E '^(DB_HOST|S3_BUCKET_NAME|AWS_REGION|GOOGLE_CLIENT_ID)=' .env.feature | sed 's/^/     /'
else
  echo "   ❌ .env.feature missing"
fi
