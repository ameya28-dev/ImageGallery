# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**ImageGallery** is a containerized personal image gallery built with **Spring Boot 3.5** (backend) and **Next.js 15.5** (frontend), orchestrated via **Docker Compose**. It supports image/video uploads, AI-powered visual search (Claude Vision API), tagging, and multi-user authentication.

**Key Tech Stack:**
- Backend: Java 25, Spring Boot 3.5, JPA/Hibernate, FFmpeg (video processing)
- Frontend: React 19, Next.js 15, TypeScript, Tailwind CSS
- Database: SQLite (local) or PostgreSQL/RDS (feature)
- Storage: Local filesystem (local) or AWS S3 (feature)
- Authentication: JWT + Google OAuth2 (feature profile only)
- Containerization: Docker Compose with nginx reverse proxy

---

## Architecture: Two Profiles

The app runs in **two distinct profiles** with different features, storage, and use cases:

### Local Profile (Development/Personal Use)
- **Database**: SQLite (file-based, in container)
- **Storage**: Local filesystem (Docker volume)
- **Auth**: JWT only, single user (admin@example.com/changeme)
- **Guest Mode**: Enabled (public browsing, no login required for GET endpoints)
- **Use Case**: Development sandbox, personal use, no AWS needed
- **Run**: `./scripts/local/up.sh`

### Feature Profile (Staging/Multi-User)
- **Database**: PostgreSQL on AWS RDS (requires `.env.feature` with RDS credentials)
- **Storage**: AWS S3 (requires S3 bucket, IAM credentials, region)
- **Auth**: JWT + Google OAuth2 (sign in with Google button on login page)
- **Guest Mode**: Disabled (all endpoints require login)
- **Use Case**: Multi-user staging, cloud-ready deployment
- **Run**: `./scripts/feature/up.sh`
- **Setup**: See `docs/feature-profile-setup.md` for complete AWS + OAuth2 guide

---

## Critical Files & Code Locations

### Backend (Spring Boot)
- **Config**: `ImageAPI/src/main/resources/application.yml` — Spring profiles (local/feature/google-auth), database, S3, OAuth2
- **Security**: `ImageAPI/src/main/java/com/imagegallery/config/SecurityConfig.java` — JWT auth, OAuth2 endpoints, guest mode gating
- **OAuth2 Handler**: `ImageAPI/src/main/java/com/imagegallery/service/OAuth2AuthSuccessHandler.java` — Post-login token generation
- **Storage Abstraction**: `ImageAPI/src/main/java/com/imagegallery/service/StorageService.java` (interface), implementations: `LocalStorageService`, `S3StorageService`
- **Image Upload/Download**: `ImageAPI/src/main/java/com/imagegallery/controller/ImageController.java`
- **Database Entities**: `ImageAPI/src/main/java/com/imagegallery/model/` (Image, Tag, User)
- **Flyway Migrations**: `ImageAPI/src/main/resources/db/migration/` — Schema for PostgreSQL (feature profile)

### Frontend (Next.js)
- **Auth Context**: `ImageWebPage/src/context/AuthContext.tsx` — JWT token management, login/logout
- **Gallery Page**: `ImageWebPage/src/components/gallery/GalleryPage.tsx` — Main grid, image grouping by date
- **Lightbox/Viewer**: `ImageWebPage/src/components/lightbox/Lightbox.tsx` — Fullscreen image viewer with keyboard nav
- **Tag Management**: `ImageWebPage/src/components/tags/TagDialog.tsx` — Tag add/remove UI with Portal for dropdown
- **Search**: `ImageWebPage/src/components/search/SearchPage.tsx` — Tag filter + AI visual search
- **Upload**: `ImageWebPage/src/components/upload/UploadForm.tsx` — Multipart file upload with FormData
- **API Layer**: `ImageWebPage/src/lib/api.ts` — Fetch wrapper with JWT token injection

### Docker & Infrastructure
- **Compose**: `compose.yaml` (base, local profile), `compose.override.yaml` (debug ports: 5005 Java, 9229 Node)
- **Feature Overlay**: `compose.feature.override.yaml` — RDS/S3 env vars, profile activation
- **Release Mode**: `compose.release.override.yaml` — Disables JDWP/Node inspect, Spring 'release' profile (Swagger disabled)
- **Nginx Reverse Proxy**: `nginx.conf` — Routes /api, /oauth2, /login/oauth2, /swagger to backend; hosts frontend on :3000, API on :8000
- **Environment Files**: `.env.example` (local secrets), `.env.feature.example` (AWS + OAuth2 template)

### Convenience Scripts
- **Local Profile**: `scripts/local/{up,down,reset,logs,status,rebuild,debug,shell-backend,shell-frontend}.sh`
- **Feature Profile**: `scripts/feature/{up,down,reset,logs,status,rebuild,shell-backend,shell-frontend}.sh`
- **Release Mode**: `scripts/local/up-release.sh`, `scripts/feature/up-release.sh` (no debug overhead, ~5-10% faster)

---

## Key Development Workflows

### Start & Stop
```bash
# Local profile (guest mode, SQLite)
./scripts/local/up.sh           # Start (detached)
./scripts/local/logs.sh -f      # Follow logs
./scripts/local/status.sh       # Show URLs + health
./scripts/local/down.sh         # Stop (data preserved)
./scripts/local/reset.sh        # FULL RESET (delete all data ⚠️)

# Feature profile (login required, RDS + S3)
./scripts/feature/up.sh         # Start (requires .env.feature)
./scripts/feature/status.sh     # Show URLs + validate .env.feature
./scripts/feature/down.sh       # Stop
```

### Debugging & Shell Access
```bash
# View backend logs
docker exec imagegallery-backend-1 sh -c 'tail -f /app/app.jar'
# OR shorter:
./scripts/local/logs.sh

# Enter backend container
./scripts/local/shell-backend.sh
# Test DB directly (SQLite)
sqlite3 /app/data/gallery.db  ".tables"

# Enter frontend container
./scripts/local/shell-frontend.sh
```

### Code Rebuild (Without Docker)
```bash
./scripts/local/rebuild.sh      # Rebuilds images, doesn't start
./scripts/feature/rebuild.sh    # Same for feature profile
```

### Performance Testing
```bash
# Release mode: disables JDWP/Node inspect, ~5-10% faster
./scripts/local/up-release.sh   # Local profile, no debug overhead
./scripts/feature/up-release.sh # Feature profile, no debug overhead
# See RELEASE_MODE.md for details
```

### Database Access
**Local Profile (SQLite):**
```bash
./scripts/local/shell-backend.sh
sqlite3 /app/data/gallery.db
# Common queries:
SELECT COUNT(*) FROM image;
SELECT * FROM tag ORDER BY frequency DESC LIMIT 10;
.schema image          # View Image table schema
```

**Feature Profile (PostgreSQL):**
```bash
# Inside backend container, .env.feature has RDS host/port/credentials
psql -h $DB_HOST -U $DB_USERNAME -d $DB_NAME
# Common queries:
SELECT COUNT(*) FROM image WHERE owner_id = ?;
SELECT tag, COUNT(*) FROM image_tag GROUP BY tag ORDER BY count DESC;
```

---

## Recent Work & Current Status (as of 2026-08-27)

### ✅ Completed
- **OAuth2 Implementation**: Fixed bean initialization order, explicit redirect_uri configuration, Google OAuth2 flow working end-to-end
- **UI Fixes**: Tag dropdown clipping fixed (React Portal), full-image loading fixed (byte array instead of StreamingResponseBody)
- **Release Mode**: Spring 'release' profile disables Swagger/dev endpoints; `up-release.sh` scripts available; ~5-10% performance gain
- **Local Profile**: Verified no regressions from OAuth2/UI changes; guest mode, SQLite, local storage all working
- **Convenience Scripts**: All 19 scripts working with startup messages showing URLs

### 🔄 In Progress / Pending
- **Mobile Testing**: Tag dropdown, lightbox, OAuth2 redirect on mobile devices (separate session)
- **AWS Data Tier**: RDS + S3 fully configured but requires user's AWS account setup (see `docs/feature-profile-setup.md`)
- **Google OAuth2 Propagation**: Settings may take 5-60 minutes to fully propagate in Google's systems

### 📝 Key Architectural Decisions
1. **Profile-Based Separation**: `local` for dev, `feature` for staging—codebase is unified but behaves differently per profile (Spring `@Profile` annotations on services like `S3StorageService`, `LocalImageScanner`)
2. **StorageService Abstraction**: All file I/O goes through an interface; implementations swap by profile via Spring DI
3. **JWT + OAuth2 Coexistence**: SecurityConfig conditionally enables `oauth2Login()` only if `ClientRegistrationRepository` is available (feature profile); local profile uses JWT only
4. **nginx Reverse Proxy**: Frontend on port 3000, backend on port 8000 internally; both exposed through nginx on port 8000, with frontend served separately by Node
5. **Explicit Redirect URI**: OAuth2 `redirect-uri` in application.yml is hardcoded to `http://localhost:8000/login/oauth2/code/google` (not dynamic `{baseUrl}`) to avoid nginx Host-header resolution issues

---

## Environment Variables & Secrets

### `.env.local` (Local Profile)
```bash
ANTHROPIC_API_KEY=sk-ant-...  # Optional: Claude Vision for AI descriptions
```

### `.env.feature` (Feature Profile)
```bash
# RDS (PostgreSQL)
DB_HOST=<rds-endpoint>
DB_PORT=5432
DB_NAME=imagegallery
DB_USERNAME=postgres
DB_PASSWORD=<your-password>

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<iam-key>
AWS_SECRET_ACCESS_KEY=<iam-secret>
S3_BUCKET_NAME=imagegallery-s3-<account-id>-<region>-<suffix>

# Google OAuth2
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<client-secret>

# App Config
GALLERY_FRONTEND_URL=http://localhost:3000
GALLERY_ADMIN_EMAIL=admin@example.com
GALLERY_ADMIN_PASSWORD=changeme
```

**NEVER commit `.env` or `.env.feature`** — use `.env.example` and `.env.feature.example` as templates.

---

## Useful References

- **Quick Start**: [README.md](./README.md)
- **Project Structure**: [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)
- **Feature Profile Setup**: [docs/feature-profile-setup.md](./docs/feature-profile-setup.md) (AWS RDS + S3 guide)
- **Search Setup**: [docs/search-setup.md](./docs/search-setup.md) (Claude Vision API setup)
- **Docker Guide**: [DOCKER.md](./DOCKER.md) (manual `docker compose` commands, troubleshooting)
- **Release Mode**: [RELEASE_MODE.md](./RELEASE_MODE.md) (performance testing without debug overhead)
- **Scripts**: [scripts/README.md](./scripts/README.md) (all available convenience scripts)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

---

## Common Pitfalls & Solutions

1. **"Port 8000 already in use"**: Another service (or old container) is listening. Run `./scripts/local/down.sh` or kill the process on port 8000.

2. **"SQLite database locked" (SQLITE_BUSY)**: SQLite allows one writer at a time. The app uses a single-threaded worker for image descriptions to avoid lock contention. If it persists, restart containers: `./scripts/local/reset.sh`.

3. **OAuth2 "redirect_uri_mismatch"**: Ensure `http://localhost:8000/login/oauth2/code/google` is in Google Cloud Console's authorized URIs (not `:3000` or plain `localhost`).

4. **Full images return 404 in lightbox**: Check that `ImageController.getFullImage()` returns `ResponseEntity<byte[]>` (not `StreamingResponseBody`), and S3 key prefix is correctly applied if using feature profile.

5. **Tags clipped in dropdown on mobile**: Dropdown must be rendered via React Portal to escape parent overflow containers; check `TagDialog.tsx` uses `createPortal()`.

6. **"No route to host" when accessing RDS**: Verify RDS "Public accessibility" is enabled in AWS console, and security group inbound rule allows port 5432 from your IP.

---

## Testing Checklist (Before Committing)

- [ ] Local profile: guest browsing works (`/api/images` unauthenticated)
- [ ] Local profile: upload, tag, favorite work after login
- [ ] Local profile: lightbox opens, tag dropdown doesn't clip
- [ ] Feature profile: login with email/password works
- [ ] Feature profile: Google OAuth2 flow completes (if configured)
- [ ] Feature profile: guest endpoints return 401 (not 200)
- [ ] Release mode: `./scripts/local/up-release.sh` starts, Swagger is disabled
- [ ] Release mode: API still works (`/api/images` returns data)
- [ ] Scripts: `status.sh` shows correct URLs and health
