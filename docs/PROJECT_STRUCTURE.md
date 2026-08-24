# ImageGallery — Project Structure & Setup Guide

## 📁 Project Architecture

```
ImageGallery/
├── .env                          # Local secrets (gitignored)
├── .env.example                  # Template for .env (git-tracked)
├── .gitignore                    # Git exclusion rules
├── .vscode/
│   └── launch.json              # Debugging configs (backend JDWP + frontend Node)
├── .claude/                      # Claude Code settings
├── compose.yaml                 # Docker Compose orchestration
├── compose.override.yaml        # Development overrides (debugging ports)
├── nginx.conf                   # Reverse proxy config (frontend → nginx → backend)
├── DOCKER.md                    # Docker setup notes
├── README.md                    # User-facing project overview
├── PROJECT_STRUCTURE.md         # This file
│
├── docs/                        # Documentation
│   ├── docker-setup.md         # Docker Compose setup guide
│   ├── aws-setup.md            # AWS deployment guide
│   └── search-setup.md         # Visual search (Claude Vision) setup
│
├── ImageAPI/                    # Spring Boot 3.5 backend (Java 21)
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/imagegallery/
│   │   │   │   ├── config/         # Spring configuration
│   │   │   │   ├── controller/     # REST endpoints (/api/images, /api/tags)
│   │   │   │   ├── dto/            # Data transfer objects
│   │   │   │   ├── exception/      # Error handling (ApiException, ErrorType)
│   │   │   │   ├── model/          # JPA entities (Image, Tag, User)
│   │   │   │   ├── repository/     # Database access (Spring Data JPA)
│   │   │   │   └── service/        # Business logic
│   │   │   │       ├── ImageService              # Image CRUD, tagging, search
│   │   │   │       ├── ImageDescriptionService  # Claude Vision API (AI descriptions)
│   │   │   │       ├── LocalImageScanner        # First-run seeding, image indexing
│   │   │   │       ├── StorageService           # File I/O (images, thumbnails)
│   │   │   │       ├── ThumbnailService         # Thumbnail generation
│   │   │   │       └── TagService               # Tag autocomplete, ranking
│   │   │   └── resources/
│   │   │       └── application.yml              # Spring config (database, profiles)
│   │   └── test/
│   ├── seed-data/
│   │   ├── images/                # 8 demo images for first-run population
│   │   └── seed-metadata.json     # Tags and favorites for seed images
│   ├── Dockerfile                 # Multi-stage Maven build
│   ├── .dockerignore              # Docker build exclusions
│   └── pom.xml                    # Maven dependencies
│
├── ImageWebPage/                  # Next.js 15.5 frontend (React 19)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx         # Root layout + auth context
│   │   │   ├── page.tsx           # Gallery homepage
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── gallery/           # GalleryPage, grid rendering
│   │   │   ├── search/            # SearchResultsPage, visual search UI
│   │   │   ├── lightbox/          # Image viewer (fullscreen, keyboard nav)
│   │   │   ├── tags/              # Tag dialog, tag management
│   │   │   └── upload/            # File upload form
│   │   ├── context/               # React contexts (AuthContext)
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/
│   │   │   └── api.ts            # REST client (with cache-control headers)
│   │   └── types/                 # TypeScript types
│   ├── public/                    # Static assets
│   ├── .env.local                 # Dev config (API_URL, feature flags)
│   ├── .dockerignore              # Docker build exclusions
│   ├── Dockerfile                 # Single-stage dev server
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── package.json               # Dependencies
│   └── tailwind.config.ts         # Tailwind CSS config
```

## 🏗️ Architecture Overview

### Three-Tier Setup (via Docker Compose)

```
┌─────────────────────────────────────────┐
│  Frontend Network (frontend-tier)       │
│  ┌─────────────────┐                    │
│  │ Next.js Dev     │ :3000              │
│  │ (hot reload)    │                    │
│  └────────┬────────┘                    │
│           │ HTTP calls                  │
│  ┌────────▼────────────────────────┐    │
│  │ nginx Reverse Proxy  :8000      │    │
│  │ (Pattern A - API only)          │    │
│  └────────┬─────────────────────┬──┘    │
└───────────┼─────────────────────┼───────┘
            │                     │
    ┌───────▼─────────────────────▼────┐
    │ Backend Network (backend-tier)    │
    │                                   │
    │  ┌──────────────────────────────┐ │
    │  │ Spring Boot API  :8080       │ │
    │  │ (JDWP debug :5005)           │ │
    │  └──────────┬───────────────────┘ │
    │             │                     │
    │  ┌──────────▼───────────────────┐ │
    │  │ SQLite (named volume)        │ │
    │  │ gallery-data:/app/data       │ │
    │  └──────────────────────────────┘ │
    │                                   │
    └───────────────────────────────────┘

Debugging Ports (exposed on host):
  - Backend:  localhost:5005 (JDWP)
  - Frontend: localhost:9229 (Node Inspector)
  - API:      localhost:8000 (nginx reverse proxy)
  - UI:       localhost:3000 (Next.js dev server)
```

### Data Flow

1. **User uploads image** → Frontend → nginx → Backend
2. Backend:
   - Stores image + thumbnail in volume
   - Registers in SQLite database
   - **Async**: Calls Claude Vision API for AI description
   - Caches description in database
3. **User searches** → Frontend → nginx → Backend
4. Backend:
   - Text search: Filters by tags (exact match, case-insensitive)
   - Visual search (AI mode): Uses cached descriptions + Claude Vision API
5. Response: JSON with images grouped by date

### Profiles & Features

**Profiles** (via `SPRING_PROFILES_ACTIVE`):
- `local` — Default, SQLite, seed data on startup, JDWP debugging enabled

**Features** (Environment-based):
- `ANTHROPIC_API_KEY` — Enable Claude Vision for AI descriptions
  - If missing: App runs fine, skips AI features
  - If invalid: AI calls fail gracefully with error reporting

## 🚀 Running the Project

### Prerequisites

- **Docker & Docker Compose** (v2.0+)
- **Port availability**: 3000, 8000, 5005, 9229
- **Anthropic API key** (optional, for AI features)

### Quick Start

#### 1. Set up environment

```bash
cd ImageGallery

# Copy template (if .env doesn't exist)
cp .env.example .env

# Add your Anthropic API key (optional)
# Edit .env and fill in: ANTHROPIC_API_KEY=sk-ant-...
```

#### 2. Start services

```bash
# First time (builds images, creates volumes, seeds data)
docker compose up --build

# Subsequent runs (faster, reuses images + volumes)
docker compose up

# In background
docker compose up -d

# Stop services
docker compose down

# Stop + remove volumes (clean slate)
docker compose down -v
```

#### 3. Access the app

- **UI**: http://localhost:3000
- **API**: http://localhost:8000/api/images
- **nginx health**: http://localhost:8000/health

### Debugging

#### Attach to Backend (Java/Spring Boot)

1. **VS Code**:
   - Open `.vscode/launch.json`
   - Run: **Run** → **Start Debugging** (Ctrl+F5)
   - Select: "Attach: Backend (JDWP 5005)"
   - Breakpoints now work in `ImageAPI/src/main/java/**`

2. **IntelliJ/WebStorm**:
   - **Run** → **Edit Configurations**
   - Add "Remote JVM Debug"
   - Host: `localhost`, Port: `5005`
   - Click Debug

#### Attach to Frontend (Node.js)

1. **VS Code**:
   - Run: **Start Debugging** (Ctrl+F5)
   - Select: "Attach: Frontend (Node 9229)"
   - Breakpoints work in `ImageWebPage/src/**`

2. **Chrome DevTools**:
   - Open `chrome://inspect`
   - Click "inspect" next to the frontend container

#### Combined Debugging

- VS Code: Select **"Attach: Backend + Frontend"** to debug both simultaneously

### Database Inspection

```bash
# View images in database
docker compose exec backend sqlite3 /app/data/gallery.db \
  "SELECT id, filename, is_favourite FROM images;"

# Interactive SQLite shell
docker compose exec backend sqlite3 /app/data/gallery.db

# Export database for backup
docker cp imagegallery-backend-1:/app/data/gallery.db ./gallery.db.backup
```

### Docker Image Sizes

Current optimized sizes:
- **Backend**: ~592 MB (Spring Boot 3.5, Java 21, JRE)
- **Frontend**: ~1.21 GB (Node 20, Next.js, all dependencies)
- **nginx**: ~40 MB (Alpine Linux)

### Volume Management

```bash
# List volumes
docker volume ls | grep imagegallery

# Inspect volume contents (for gallery-data)
docker run --rm -v imagegallery_gallery-data:/data alpine:latest ls -lah /data

# Clean specific volume
docker volume rm imagegallery_gallery-data

# Full clean (start fresh)
docker compose down -v
docker volume prune -f
docker compose up --build
```

## 📋 Configuration

### Environment Variables

**Root `.env`** (Docker Compose):
```env
ANTHROPIC_API_KEY=sk-ant-...  # Optional, for AI descriptions
```

**Frontend `ImageWebPage/.env.local`**:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000    # nginx reverse proxy
NEXT_PUBLIC_GOOGLE_AUTH=false                # Feature flag (future)
```

**Backend** (`src/main/resources/application.yml`):
- Profiles: `local` (default), `featurecomplete`, `aws`
- Database: SQLite on `local` profile
- Paths: Images in `/app/data/images`, thumbnails in `/app/data/thumbnails`

## 🔄 Startup Sequence

1. **Docker Compose** starts containers in order:
   - Backend (Spring Boot)
   - nginx (reverse proxy)
   - Frontend (Next.js dev server)

2. **Backend initialization** (via `LocalImageScanner`):
   - Checks if database is empty
   - **If empty**: Copies seed images from `ImageAPI/seed-data/images/` to volume
   - Scans images, generates thumbnails, indexes in database
   - (100ms delay) Applies seed metadata (tags, favorites)
   - Starts async AI description backfill (if API key configured)

3. **Frontend** loads at http://localhost:3000
   - Fetches image list via nginx
   - Displays seeded gallery

## 📝 Notes

- **First run**: Slower (builds images, seeds data), ~30-60 seconds
- **Subsequent runs**: Fast, ~10 seconds (containers reuse images)
- **Cache headers**: API metadata is never cached (always fresh), images cached 1 year
- **SEO/Meta**: Only for `/` route (GalleryPage), search results are client-side
- **Auth**: Not implemented yet (framework in place in `AuthContext`)

## 🚧 Future Enhancements

- [ ] User authentication (OAuth, JWT)
- [ ] Multiple user galleries (storage isolation)
- [ ] AWS S3 storage (instead of local volume)
- [ ] Elasticsearch for full-text search
- [ ] Image classification (tags via Claude Vision)
- [ ] Collections/albums feature
