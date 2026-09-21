# ImageGallery

A modern, containerized **personal image gallery** with AI-powered visual search, tag-based filtering, and local storage. Built with **Spring Boot 3.5** (backend) and **Next.js 15** (frontend), orchestrated with **Docker Compose**.

![Stack](https://img.shields.io/badge/Stack-Spring%20Boot%20%7C%20Next.js%20%7C%20Docker-blue) ![Java](https://img.shields.io/badge/Java-25-orange) ![Node](https://img.shields.io/badge/Node-20-green) ![Database](https://img.shields.io/badge/DB-SQLite-blue)

## ✨ Features

- 📸 **Gallery View** — Browse images grouped by date
- 🎬 **Video Support** — Upload and play MP4, MOV, WebM, AVI, MKV videos
  - Auto-generated thumbnails with first frame + play button + duration
  - Full video player with controls (play, pause, volume, fullscreen)
- 📷 **WebP & Modern Formats** — Full-resolution WebP images with efficient thumbnails
- 🔐 **Multi-User Authentication** — User registration, login, isolated galleries per account
  - Personal image galleries with privacy control
  - JWT-based secure authentication
- 🔍 **Smart Search**
  - Tag-based filtering (exact match, case-insensitive)
  - AI-powered visual search (via Claude Vision API)
- ❤️ **Favorites** — Mark and filter favorite images
- 🏷️ **Tags** — Add/remove tags, autocomplete suggestions
- 🖼️ **Image Viewer** — Fullscreen lightbox with keyboard navigation (arrow keys always work)
- 📱 **Responsive UI** — Works on desktop and mobile
- 🚀 **AI Descriptions** — Automatic one-sentence descriptions of uploaded images
- 🔒 **Local Storage** — Everything stays on your machine (Docker volume)

## 🚀 Quick Start

### Prerequisites

- **Docker** & **Docker Compose** v2.0+
- **Ports available**: 3000, 8000, 5005, 9229
- **Anthropic API key** (optional, for AI features) — [Get one here](https://console.anthropic.com/account/keys)

### 1. Clone & Setup

```bash
git clone <repo>
cd ImageGallery

# Create .env file with your API key
cp .env.example .env
# Edit .env and add: ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Start the Application

**Recommended: Use Convenience Scripts**

```bash
# Start the app (builds images on first run)
./scripts/local/up.sh

# In another terminal, watch logs
./scripts/local/logs.sh

# Stop the app
./scripts/local/down.sh

# Full reset (delete all data)
./scripts/local/reset.sh
```

**All available scripts**: see [**scripts/README.md**](./scripts/README.md) (debugging, shell access, status monitoring, cleanup, etc.)

**Manual Docker (if preferred)**: see [DOCKER.md](./DOCKER.md#quick-start) for manual `docker compose` commands and detailed Docker setup guide.

### 3. Open in Browser

- **Gallery UI**: http://localhost:3000
- **API Docs**: http://localhost:8000/api/images (returns JSON)

## 📖 Usage

### Authentication

1. **First Time**: Click "Register" → enter email and password → create account
2. **Returning Users**: Click "Login" → enter credentials → access your gallery
3. Each user has a **private gallery** — images are not shared between accounts

### Adding Images & Videos

1. Click the **upload icon** (⬆️) in the top-right
2. Select images (JPG, PNG, GIF, WebP) or videos (MP4, MOV, WebM, AVI, MKV)
3. They appear in the gallery immediately
4. **For videos**: Thumbnails auto-generate with the first frame, play button, and duration
5. **For images**: AI descriptions are generated asynchronously (if API key configured)

### Searching

#### By Tags
- Click a tag in the gallery or type in the search box
- Combines multiple tags (AND logic)
- Case-insensitive exact match

#### By Content (AI Mode)
- Click the "Search" icon and type a description
- E.g., "sunset over mountains", "dog playing"
- Requires Anthropic API key

### Managing Images

- **Favorite**: Click ❤️ icon
- **Add tags**: Click image → Click "Add tag" → Type tag name
- **Remove tags**: Click the tag name in the info panel
- **Delete**: Click trash 🗑️ icon in viewer
- **Fullscreen**: Click 🔲 icon or double-click image (press ESC to exit)

## 🏗️ Architecture

```
┌──────────────────────────────┐
│ Frontend (Next.js)  :3000    │
│ - React 19, Tailwind CSS     │
│ - Image upload, gallery view │
└────────────┬─────────────────┘
             │ HTTP (via nginx)
┌────────────▼──────────────────┐
│ Reverse Proxy (nginx) :8000   │
│ - Routes API calls to backend │
│ - Cache headers management   │
└────────────┬─────────────────┘
             │
┌────────────▼──────────────────┐
│ Backend (Spring Boot) :8080   │
│ - REST API                   │
│ - Image processing           │
│ - AI integration (Claude)    │
└────────────┬─────────────────┘
             │
┌────────────▼──────────────────┐
│ SQLite Database (Docker Vol)  │
│ - Image metadata              │
│ - Tags, favorites             │
└───────────────────────────────┘
```

### Tech Stack

**Backend**
- Spring Boot 3.5 (Java 25)
- SQLite (local profile) with Spring Data JPA
- Anthropic Claude Vision API (optional, for AI descriptions)

**Frontend**
- Next.js 15.5 with React 19
- TypeScript
- Tailwind CSS

**Infrastructure**
- Docker & Docker Compose
- nginx (reverse proxy)
- Named volumes (data persistence)

## 🔧 Configuration

### Environment Variables

**`.env`** (Docker Compose, root directory)
```env
ANTHROPIC_API_KEY=sk-ant-...  # Optional
```

**`.env.local`** (Next.js frontend)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000   # nginx proxy URL
NEXT_PUBLIC_GOOGLE_AUTH=false               # Feature flag
```

### Database

- **Location**: `/app/data/gallery.db` (inside Docker volume)
- **Profile**: `local` (default, uses SQLite)
- **Seeding**: First run auto-populates 8 demo images

## 🐛 Debugging

### Quick Debugging Checklist

#### Shell Access
```bash
# Enter backend container shell
./scripts/local/shell-backend.sh

# Enter frontend container shell
./scripts/local/shell-frontend.sh
```

#### View Logs
```bash
# Check logs in real-time
./scripts/local/logs.sh            # all services
./scripts/local/logs.sh backend    # backend only
./scripts/local/logs.sh frontend   # frontend only
```

#### Debugger (VS Code)
Open VS Code and press **Ctrl+F5**, then choose:
- **"Attach: Backend (JDWP 5005)"** — Debug Java/Spring Boot (set breakpoints in `ImageAPI/src/main/java/`)
- **"Attach: Frontend (Node 9229)"** — Debug Node.js (set breakpoints in `ImageWebPage/src/`)
- **"Attach: Backend + Frontend"** — Debug both simultaneously

#### SQLite Database Inspector
```bash
# Start with SQLite Web UI (runs on http://localhost:8085)
./scripts/local/debug.sh
```

**For detailed debugging guide, see [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md#-debugging).**

## 📚 Documentation

- **[README.md](./README.md)** — Quick start, features, usage, FAQ (you are here)
- **[DOCKER.md](./DOCKER.md)** — Docker setup, debugging, configuration details
- **[docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)** — Project architecture, folder layout, startup sequence (detailed reference for developers)
- **[docs/feature-profile-setup.md](./docs/feature-profile-setup.md)** — Complete setup guide for feature profile (AWS RDS + S3 + Google OAuth)
- **[docs/search-setup.md](./docs/search-setup.md)** — Claude Vision API (visual/NL search) configuration
- **[scripts/README.md](./scripts/README.md)** — Convenience script reference (instead of manual docker compose commands)

## 🔌 API Endpoints

All endpoints are proxied through nginx (`:8000`):

### Images

```
GET  /api/images                      # List all images
GET  /api/images?tag=TagName          # Filter by tag
GET  /api/images?tags=A&tags=B        # Filter by multiple tags (AND)
GET  /api/images?q=search%20query     # Visual search (AI)
GET  /api/images?favourites=true      # Favorites only
GET  /api/images/counts               # Count images by media type
GET  /api/images/{id}/thumbnail       # Thumbnail image
GET  /api/images/{id}/full            # Full-resolution image
POST /api/images                      # Upload new image
PATCH /api/images/{id}/favourite      # Toggle favorite
DELETE /api/images/{id}               # Delete image
```

### Tags

```
GET /api/tags                         # Autocomplete tags (optional ?prefix=...)
GET /api/tags/ranked                  # Tags by usage count
POST /api/images/{id}/tags            # Add tag to image
DELETE /api/images/{id}/tags/{name}   # Remove tag from image
```

## 🛠️ Troubleshooting

### "Port already in use" Error

```bash
# Find what's using the port (e.g., 3000)
lsof -i :3000

# Kill it
kill -9 <PID>

# Or change port in compose.yaml
```

### Database looks empty on startup

This is normal! Run:
```bash
docker compose logs backend | grep -i "seed\|indexed"
```

If you see "Seed data copied" and "Indexed: X images", data is there. Refresh browser.

### AI features not working

1. Check `.env` has a valid API key
2. Verify key has billing enabled: https://console.anthropic.com/account/keys
3. Check backend logs: `docker compose logs backend | grep -i "api\|anthropic"`

### Images not loading

```bash
# Check volumes exist
docker volume ls | grep imagegallery

# Inspect volume
docker run --rm -v imagegallery_gallery-data:/data alpine:latest ls -la /data/images/

# Check API response
curl http://localhost:8000/api/images | head -c 200
```

## 📦 Profiles & Deployment

**Local Profile** (`local` — development):
- SQLite database, local filesystem storage
- Guest mode enabled, seed data auto-populated
- Debugging enabled (Java/Node breakpoints)
- Use: `./scripts/local/up.sh`

**Feature Profile** (`feature` — staging):
- PostgreSQL on AWS RDS, images in Amazon S3
- Login required (no guest mode), Google OAuth
- Production-like behavior (staging environment)
- Complete setup: **[docs/feature-profile-setup.md](./docs/feature-profile-setup.md)**
- Use: `./scripts/feature/up.sh`

**Production Profile** (`prod` — future):
- Will extend feature profile to AWS cloud compute (ECS/EC2)

## 🤝 Contributing

This is a personal project, but feel free to open issues or PRs!

## 📄 License

MIT (check LICENSE file if present)

## 🙋 FAQ

**Q: Can I use this with multiple users?**  
A: Yes! Multi-user authentication is fully implemented. Each user registers their own account and gets a private gallery.

**Q: Can I upload videos?**  
A: Yes! Supported formats: MP4, MOV, WebM, AVI, MKV, WMV. Thumbnails auto-generate with the first frame and duration badge.

**Q: What image formats are supported?**  
A: JPG, PNG, GIF, and WebP. All formats get efficient thumbnails (JPEG for WebP).

**Q: How large can the gallery be?**  
A: Limited by disk space. Tested with 1000+ images. SQLite (local profile) and PostgreSQL (feature profile) both handle large galleries fine.

**Q: Do I need an API key?**  
A: No! Gallery works fully without one. AI descriptions for images just won't work without the Anthropic API key.

**Q: Can I export my data?**  
A: Yes, the Docker volume is just a folder. You can backup the `.db` file and images/videos.

**Q: How long does first startup take?**  
A: 30-60 seconds (building images, seeding data, downloading FFmpeg). Subsequent starts: ~10 seconds.

---

**Happy organizing! 📸✨**
