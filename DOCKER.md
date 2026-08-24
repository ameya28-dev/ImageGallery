# Docker Setup for ImageGallery (Local Profile + VS Code Debugging)

## Quick Start

1. **Copy the env template** (optional for now):
   ```bash
   cp .env.example .env
   # Leave ANTHROPIC_API_KEY empty unless you want AI image description + NL search
   ```

2. **Start Docker containers**:
   ```bash
   docker compose up --build
   ```
   This auto-merges `compose.yaml` + `compose.override.yaml`, so debug ports (5005, 9229) are exposed by default.

3. **Access the app**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080/api/images

4. **Verify existing data loads**:
   - The gallery should show 5 pre-existing images (bind-mounted from `ImageAPI/src/main/resources/images/`).
   - SQLite DB at `ImageAPI/data/gallery.db` is bind-mounted and persists across restarts.

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

## Code Changes After Build

### Backend (Java)
After editing `.java` files:
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
- View logs: `docker compose logs -f backend` or `docker compose logs -f frontend`.

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
- Check the port is exposed: `docker compose ps` should show `5005->5005/tcp` and `9229->9229/tcp`.
- If using `compose -f compose.yaml up`, ports aren't exposed — run full `docker compose up` instead.
- Confirm VS Code's Java/Node extensions are installed.

## Production Notes

This setup is **for local development only** (SQLite, local filesystem). For production, the `docs/docker-setup.md` file describes a multi-stage build for Next.js with `output: "standalone"` and deployment to a production Compose setup with PostgreSQL + S3.
