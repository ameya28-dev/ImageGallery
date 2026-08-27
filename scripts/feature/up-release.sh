#!/bin/bash
# Start feature profile in RELEASE MODE (no debug overhead)
# Use this for performance testing with AWS RDS + S3
# Usage: ./scripts/feature/up-release.sh

set -e

# Check for .env.feature
if [ ! -f ".env.feature" ]; then
  echo "❌ Missing .env.feature file"
  echo ""
  echo "Please create .env.feature with AWS credentials:"
  echo "  - DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD (RDS)"
  echo "  - AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME"
  echo "  - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (OAuth2)"
  echo "  - GALLERY_FRONTEND_URL, GALLERY_ADMIN_EMAIL, GALLERY_ADMIN_PASSWORD"
  echo ""
  echo "See .env.feature.example for a template."
  exit 1
fi

echo "🚀 Starting Image Gallery (feature profile, RELEASE MODE)..."
echo "   Backend: PostgreSQL (RDS) — No JDWP debugging"
echo "   Storage: Amazon S3"
echo "   Guest Mode: DISABLED (login required)"
echo "   Frontend: http://localhost:3000 — No Node inspect"
echo "   API: http://localhost:8000"
echo ""

# Load both feature credentials AND release configuration
# Note: .env.feature is loaded first (for DB/S3/OAuth2), then SPRING_PROFILES_ACTIVE is overridden for release mode
docker compose --env-file .env.feature -f compose.yaml -f compose.feature.override.yaml -f compose.release.override.yaml -e SPRING_PROFILES_ACTIVE="feature,google-auth,release" up -d --build

echo "✅ Services starting in background (release mode — optimized performance)..."
echo ""
echo "📖 View logs:   ./scripts/feature/logs.sh"
echo "📊 Status:      ./scripts/feature/status.sh"
echo "🛑 Stop:        ./scripts/feature/down.sh"
echo ""
echo "🚀 Once healthy, access at:"
echo "   Frontend:   http://localhost:3000"
echo "   API:        http://localhost:8000"
echo "   Swagger:    http://localhost:8000/swagger-ui.html"
echo "   OAuth2:     http://localhost:8000/oauth2/authorization/google"
echo ""
echo "💡 Tip: To return to debug mode, use ./scripts/feature/up.sh"
