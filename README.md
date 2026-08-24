# ImageGallery

A modern, containerized **personal image gallery** with AI-powered visual search, tag-based filtering, and local storage. Built with **Spring Boot 3.5** (backend) and **Next.js 15** (frontend), orchestrated with **Docker Compose**.

![Stack](https://img.shields.io/badge/Stack-Spring%20Boot%20%7C%20Next.js%20%7C%20Docker-blue) ![Java](https://img.shields.io/badge/Java-21-orange) ![Node](https://img.shields.io/badge/Node-20-green) ![Database](https://img.shields.io/badge/DB-SQLite-blue)

## ✨ Features

- 📸 **Gallery View** — Browse images grouped by date
- 🔍 **Smart Search**
  - Tag-based filtering (exact match, case-insensitive)
  - AI-powered visual search (via Claude Vision API)
- ❤️ **Favorites** — Mark and filter favorite images
- 🏷️ **Tags** — Add/remove tags, autocomplete suggestions
- 🖼️ **Image Viewer** — Fullscreen lightbox with keyboard navigation
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

```bash
# First time (will build images and seed demo data)
docker compose up --build

# Subsequent times (faster, reuses images)
docker compose up

# Run in background
docker compose up -d
```

### 3. Open in Browser

- **Gallery UI**: http://localhost:3000
- **API Docs**: http://localhost:8000/api/images (returns JSON)

### 4. Stop Services

```bash
docker compose down

# Clean everything (removes volumes + cached images)
docker compose down -v
```

## 📖 Usage

### Adding Images

1. Click the **upload icon** (⬆️) in the top-right
2. Select images to upload
3. They appear in the gallery immediately
4. AI descriptions are generated asynchronously

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
- Spring Boot 3.5 (Java 21)
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

### Backend (Java/Spring Boot)

Open VS Code and select **Run** → **Start Debugging** (Ctrl+F5), then choose:
- **"Attach: Backend (JDWP 5005)"**

Set breakpoints in `ImageAPI/src/main/java/` and they'll trigger.

### Frontend (Node.js)

Same debugging interface, select:
- **"Attach: Frontend (Node 9229)"**

Set breakpoints in `ImageWebPage/src/` and they'll trigger.

### Both Simultaneously

Select **"Attach: Backend + Frontend"** to debug both at once.

## 📚 Documentation

- **[docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)** — Detailed folder layout, startup sequence, debugging guide
- **[docs/docker-setup.md](./docs/docker-setup.md)** — Docker Compose detailed setup
- **[docs/search-setup.md](./docs/search-setup.md)** — Claude Vision API configuration
- **[DOCKER.md](./DOCKER.md)** — Docker image build details
- **[docs/REVIEW_NOTES.md](./docs/REVIEW_NOTES.md)** — Project review & decisions

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

## 📦 Building for Production

See **[docs/aws-setup.md](./docs/aws-setup.md)** for cloud deployment details.

Current profiles:
- `local` — Development (SQLite, debugging enabled)
- `featurecomplete` — Feature-rich variant (future)
- `aws` — Cloud deployment (future)

## 🤝 Contributing

This is a personal project, but feel free to open issues or PRs!

## 📄 License

MIT (check LICENSE file if present)

## 🙋 FAQ

**Q: Can I use this with multiple users?**  
A: Not yet. Currently single-user local storage. Multi-user support planned.

**Q: How large can the gallery be?**  
A: Limited by disk space. Tested with 1000+ images. SQLite handles it fine.

**Q: Do I need an API key?**  
A: No! Gallery works fully without one. AI descriptions just won't work.

**Q: Can I export my data?**  
A: Yes, the Docker volume is just a folder. You can backup the `.db` file and images.

**Q: How long does first startup take?**  
A: 30-60 seconds (building images, seeding data). Subsequent starts: ~10 seconds.

---

**Happy organizing! 📸✨**
