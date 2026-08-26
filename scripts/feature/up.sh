#!/bin/bash
# Start the feature profile (RDS + S3, guest mode disabled, login required)
# Usage: ./scripts/feature/up.sh

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

echo "🚀 Starting Image Gallery (feature profile)..."
echo "   Backend: PostgreSQL (RDS)"
echo "   Storage: Amazon S3"
echo "   Guest Mode: DISABLED (login required)"
echo "   Frontend: http://localhost:3000"
echo "   API: http://localhost:8000"
echo ""

docker compose -f compose.yaml -f compose.feature.override.yaml up --build

echo ""
echo "✅ Feature profile is running!"
