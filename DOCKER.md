# Docker Setup — Local Profile

**For quick start guide, see [README.md](./README.md#-quick-start). This document covers Docker configuration, debugging, and troubleshooting.**

---

## System Requirements

- **Docker Desktop** (Windows/Mac) or Docker Engine (Linux) with Compose v2.0+
- **Available Ports**: 3000 (frontend), 8000 (nginx), 5005 (Java debug), 9229 (Node debug)
- **FFmpeg**: Automatically installed in backend container for video processing
- **Anthropic API Key** (optional): For AI image descriptions

## Quick Reference

```bash
# Start with scripts (recommended)
./scripts/local/up.sh       # Start app
./scripts/local/logs.sh     # Watch logs
./scripts/local/down.sh     # Stop app

# Or manual Docker Compose
docker compose up --build
docker compose down

# Full reference: see scripts/README.md
```

**Ports**: Frontend on `:3000`, API on `:8000` (nginx reverse proxy)  
**Database**: SQLite at `ImageAPI/data/gallery.db`  
**Debug Ports**: `:5005` (Java JDWP), `:9229` (Node inspector) — exposed by default via `compose.override.yaml`

## Video & Image Processing

### Video Support
The backend container includes **FFmpeg** for:
- Extracting first frames from video files for thumbnails
- Parsing video metadata (duration, format info)
- Supporting MP4, MOV, WebM, AVI, MKV, and WMV formats

**Thumbnail Generation**: Videos automatically get thumbnails showing:
- First frame from the video
- Play button (▶️) in the bottom-right corner
- Duration text (mm:ss or hh:mm:ss) displayed prominently

### Image Format Support
- **Standard formats**: JPG, PNG, GIF
- **Modern formats**: WebP (with automatic JPEG thumbnail conversion)
- **Thumbnails**: Auto-generated at 400×400px with intelligent aspect ratio preservation

## Debugging from VS Code

### Prerequisites
- Install the **Language Support for Java** (Red Hat) extension for Java debugging.
- Docker Desktop with WSL 2 integration active.

### Attach Debugger

1. **Both services**:
   - Press F5 → select "Attach: Backend + Frontend" → both debuggers attach simultaneously.

2. **Backend only** (Java):
   - Set a breakpoint in any Java file (e.g., `ImageAPI/src/main/java/com/imagegallery/controller/ImageController.java`).
   - Press F5 → select "Attach: Backend (JDWP 5005)".
   - The debugger attaches to port 5005 inside the container and stops at your breakpoint.

3. **Frontend only** (Node/Next.js):
   - Set a breakpoint in any TypeScript/JavaScript file under `ImageWebPage/src/`.
   - Press F5 → select "Attach: Frontend (Node 9229)".
   - Trigger the code path from the browser (e.g., upload an image, run a search).

### No-Debug Mode
If you want to run without exposed debug ports:
```bash
docker compose -f compose.yaml up --build
```
(Omits the `compose.override.yaml` merge, so ports 5005/9229 aren't published.)

## Database Browser (sqlite-web)

Debug the SQLite database via a visual web UI:

**Option A: Use Script (Recommended)**
```bash
./scripts/local/debug.sh
```
Opens http://localhost:8085 for visual SQLite browser.

**Option B: Manual Docker Command**
```bash
docker compose --profile debug up -d sqlite-web
# Then open http://localhost:8085
```

**Notes:**
- Opt-in only (requires `--profile debug` flag) — the raw database browser is not started by default.
- Only useful when the backend runs the `local` Spring profile (SQLite). Under `feature` (PostgreSQL), this container has nothing to show.
- Runs in read-only mode (`-r` flag) to prevent write contention with the backend's single-writer SQLite connection. If you need to edit/delete rows directly via the UI, you can override the `command:` in `compose.yaml` locally, accepting the risk of lock contention during heavy backend writes.

To tear down:
```bash
docker compose --profile debug down sqlite-web
```
or just `docker compose down` to stop everything.

## API Documentation (Swagger UI)

Interactive API documentation is automatically available at http://localhost:8000/swagger-ui.html.

- Enabled by default in both `local` and `feature` Spring profiles.
- Displays all REST endpoints with request/response examples.
- Click the **"Authorize"** button to supply a Bearer JWT token (e.g., from `POST /api/auth/login`) for testing owner-only endpoints.

Example:
1. Register/login to get a JWT: `POST /api/auth/login` (visible in Swagger UI)
2. Click "Authorize" → paste `Bearer <your-jwt-token>`
3. Try out any endpoint (e.g., `DELETE /api/images/{id}`, `PATCH /api/images/{id}/favourite`) directly from the browser.

## Code Changes After Build

### Backend (Java)
After editing `.java` files:

**Option A: Use Script**
```bash
./scripts/local/rebuild.sh
./scripts/local/up.sh
```

**Option B: Manual Commands**
```bash
docker compose build backend
docker compose up -d backend
```

Then re-attach the debugger (F5).

### Frontend (Next.js)
Edit `.tsx`/`.ts` files and save — the `next dev` server hot-reloads automatically via Fast Refresh. No rebuild or container restart needed.

## What's Wired Up

### Containers
- **backend** (Spring Boot 3.5.14, Java 21, SQLite)
  - Port: 8080 (app), 5005 (JDWP debug)
  - Volumes: `ImageAPI/data/`, `ImageAPI/src/main/resources/{images,thumbnails}/` (bind-mounted from host)
  - Environment: `SPRING_PROFILES_ACTIVE=local`, JDWP agent enabled via `JAVA_TOOL_OPTIONS` (debug-only)

- **frontend** (Next.js 15, Node dev server)
  - Port: 3000 (app), 9229 (Node inspector)
  - Volumes: `ImageWebPage/` source (bind-mounted for hot reload), anonymous volumes for `node_modules`/`.next`
  - Environment: `NEXT_PUBLIC_API_URL=http://localhost:8080` (browser), `BACKEND_URL=http://backend:8080` (server-side NL search route)

### Key Settings
- `gallery.images-path` and `gallery.thumbnails-path` are parameterized via env vars with defaults for bare-metal runs.
- `ANTHROPIC_API_KEY` passed to both services (enables visual search on backend, NL search on frontend).
- SQLite DB path `./data/gallery.db` uses the container's `WORKDIR (/app)` and bind-mounts to the host.

## Troubleshooting

### Containers won't start
- Check Docker Desktop is running and WSL 2 integration is active.
- View logs:
  ```bash
  ./scripts/local/logs.sh backend    # or frontend
  # Manual: docker compose logs -f backend
  ```

### Check container status
```bash
./scripts/local/status.sh
# Manual: docker compose ps
```

### Backend can't reach database
- Confirm `ImageAPI/data/gallery.db` exists on the host.
- Check the volume mount: `docker volume inspect imagegallery_gallery_db` or verify bind-mount in `docker inspect imagegallery-backend-1`.

### Frontend can't reach backend
- Confirm backend is running: `curl http://localhost:8080/api/images`.
- Browser NL search: uses `NEXT_PUBLIC_API_URL=http://localhost:8080` (correct for browser).
- Server-side NL search route: uses `BACKEND_URL=http://backend:8080` (correct for container network).

### Images don't persist
- Volumes are bind-mounted to `ImageAPI/src/main/resources/{images,thumbnails}/`. Check these directories exist and are writable.
- Uploaded images should appear on the host immediately.

### Debugger won't attach
- Check the port is exposed:
  ```bash
  ./scripts/local/status.sh
  # Manual: docker compose ps (should show 5005->5005/tcp and 9229->9229/tcp)
  ```
- If using `compose -f compose.yaml up`, ports aren't exposed — run full `docker compose up` instead.
- Confirm VS Code's Java/Node extensions are installed.

### Need shell access to a container
```bash
./scripts/local/shell-backend.sh     # bash in backend
./scripts/local/shell-frontend.sh    # sh in frontend
```

## Production Notes

This setup is **for local development only** (SQLite, local filesystem). For production, the `docs/docker-setup.md` file describes a multi-stage build for Next.js with `output: "standalone"` and deployment to a production Compose setup with PostgreSQL + S3.
