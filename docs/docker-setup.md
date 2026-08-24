# Docker Integration — Report & Plan

## What This Document Covers

This is a project-specific analysis of what Docker would solve for the ImageGallery app and a complete plan for integrating it. No changes have been made to the codebase yet.

---

## Why Docker Matters for This Project

### Problems During Development & Debugging

**1. Java 21 is non-negotiable and easy to break silently**

`pom.xml` declares `<java.version>21</java.version>` and uses Java 21 features (records, sealed classes). Running `mvn spring-boot:run` with Java 17 or 22 produces cryptic Maven compiler errors that look like a misconfiguration, not a JDK mismatch. Docker pins the exact JDK in the image — it cannot silently drift between machines.

**2. Relative paths in `LocalStorageService` break on CWD**

`LocalStorageService` stores images at `properties.getImagesPath()`, which resolves to `src/main/resources/images/` — a relative path. This only works when Maven is run from inside `ImageAPI/`. Running the compiled JAR from the project root, or from `D:\projects\Agentic\`, writes images into the wrong directory and they silently disappear from the gallery with no error message. Docker sets `WORKDIR /app` permanently — the path resolves correctly every time.

**3. `LocalDatabaseConfig` creates `./data/` relative to CWD**

The SQLite database lands at `./data/gallery.db`. The same CWD problem applies — if you run from the wrong directory, a second database is created somewhere else and the gallery starts empty. With Docker, `WORKDIR /app` means `data/` is always `/app/data/gallery.db`.

**4. `ANTHROPIC_API_KEY` must be set in two separate places**

The backend reads it from the OS environment (for visual descriptions). The Next.js frontend reads it from `.env.local` (for NL search). It is easy to set one and forget the other, and the failures look different:
- Backend: silently skips descriptions, no error
- Frontend: `/api/nl-search` returns a 500

Docker Compose puts both in a single `.env` file and injects it into both containers from one source of truth.

**5. `NEXT_PUBLIC_API_URL` breaks inside the frontend container**

`api.ts` uses `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8080`) for all API calls. `NEXT_PUBLIC_` variables are embedded into the JavaScript bundle at build time — they are designed for browser use. But `src/app/api/nl-search/route.ts` also uses the same variable:

```typescript
const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
```

Inside a Docker container, `localhost` refers to the container's own loopback — not the backend service. NL search silently fails with "connection refused" even though the backend is running fine. The fix is a separate server-side-only env var (`BACKEND_URL=http://backend:8080`) used by Next.js API routes, while `NEXT_PUBLIC_API_URL` stays as `http://localhost:8080` for the browser. This issue is invisible without containers.

**6. PostgreSQL startup race in the feature profile**

When the feature profile starts, Flyway runs migrations immediately. If PostgreSQL isn't ready yet, Flyway throws `Connection refused` and the application crashes before it can serve a single request. On bare metal you start Postgres and wait; in scripts this is error-prone. Docker Compose `depends_on` with a `healthcheck: pg_isready` enforces that the backend container does not start until PostgreSQL is genuinely accepting connections — no manual waiting or polling loops required.

**7. CORS is hardcoded to `http://localhost:3000`**

`WebConfig.java` hardcodes:
```java
.allowedOrigins("http://localhost:3000")
```

The `GALLERY_FRONTEND_URL` property already exists in `application.yml` and is already used by `OAuth2AuthSuccessHandler` — but `WebConfig` ignores it and hardcodes the origin. When the frontend container is on a different host or port (which happens in staging/production), all cross-origin requests are rejected. Docker deployment naturally surfaces this and prompts the fix: inject `GalleryProperties` into `WebConfig` and use `properties.getFrontend().getUrl()`.

---

### Problems Moving to Production

**8. No guarantee the production server has Java 21**

The compiled JAR requires the exact JRE it was built for. Without Docker, deploying to a VPS means hoping Java 21 is installed. With Docker, the JRE is baked into the image — the server only needs Docker.

**9. The local image store path is inside the source tree**

`gallery.images-path: src/main/resources/images/` points into the source directory. In a production JAR deployment this path does not exist and images would need manual directory creation and path configuration. Docker volumes (`gallery_images:/app/images`) make the storage location explicit and persistent across restarts without touching the source tree.

**10. PostgreSQL version is uncontrolled without Docker**

The feature profile assumes PostgreSQL is running and Flyway will handle migrations. Without Docker, the exact version on the production server is uncontrolled. `postgres:16-alpine` in Compose pins the exact version and the data directory is a named volume — upgrading the DB version becomes a deliberate action, not an accident.

**11. S3 integration cannot be tested locally without burning real AWS credits**

The feature profile requires a live S3 bucket for every upload/delete test during development. Any mistake (uploading large test files, forgetting to delete) burns real AWS credits. **LocalStack** provides a local S3 emulator as a Docker Compose service — you can create buckets, upload, delete, and verify locally without touching AWS. LocalStack is only available as a Docker image.

**12. Startup order across a multi-service deploy**

Feature profile startup order: PostgreSQL → backend (Flyway) → frontend (auth refresh runs on page load). Without Compose, this is manual. With health checks, each service starts only when its dependency is genuinely ready.

---

## What Changes Are Required

### New Files (7 files, no code changes)

| File | Purpose |
|------|---------|
| `ImageAPI/Dockerfile` | Multi-stage: Maven build → JRE-only runtime image |
| `ImageAPI/.dockerignore` | Exclude `target/`, `data/`, `.idea/`, images, thumbnails |
| `ImageWebPage/Dockerfile` | Multi-stage: `npm ci` + `next build` → standalone Next.js runtime |
| `ImageWebPage/.dockerignore` | Exclude `node_modules/`, `.next/`, `.env.local` |
| `docker-compose.yml` | Local profile: backend + frontend (SQLite, no external DB) |
| `docker-compose.feature.yml` | Feature profile: backend + frontend + PostgreSQL + optional LocalStack |
| `.env.docker.example` | Template listing every env var both containers need |

### Code Changes (3 files)

#### `ImageAPI/src/main/resources/application.yml`

**Change 1 — Parameterise image/thumbnail paths** (local profile section):

```yaml
# BEFORE
gallery:
  images-path: src/main/resources/images/
  thumbnails-path: src/main/resources/thumbnails/

# AFTER — defaults preserved for bare-metal; Docker overrides via env var
gallery:
  images-path: ${GALLERY_IMAGES_PATH:src/main/resources/images/}
  thumbnails-path: ${GALLERY_THUMBNAILS_PATH:src/main/resources/thumbnails/}
```

**Change 2 — Parameterise DB host/port** (feature profile section):

```yaml
# BEFORE
url: jdbc:postgresql://localhost:5432/imagegallery

# AFTER — DB_HOST defaults to localhost; Docker Compose sets it to the service name "db"
url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/imagegallery
```

#### `ImageWebPage/src/app/api/nl-search/route.ts`

```typescript
// BEFORE
const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// AFTER — BACKEND_URL is server-side only; NEXT_PUBLIC_API_URL is the browser fallback
const BACKEND = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
```

`BACKEND_URL` is set to `http://backend:8080` in Docker Compose. It has no `NEXT_PUBLIC_` prefix so it is never embedded in the browser bundle.

#### `ImageWebPage/next.config.ts`

```typescript
const nextConfig: NextConfig = {
  output: "standalone",   // ← add this line
  images: { unoptimized: true },
  ...(isDev && { allowedDevOrigins: ["192.168.1.*"] }),
};
```

`output: "standalone"` enables Next.js's minimal server output, reducing the Docker image from ~900 MB to ~250 MB. The Dockerfile copies `.next/standalone` and `.next/static` separately.

---

## Dockerfile Designs

### `ImageAPI/Dockerfile`

```dockerfile
# Stage 1 — build with full JDK + Maven
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Cache dependency layer separately from source changes
COPY pom.xml .
RUN mvn dependency:go-offline -q

COPY src ./src
RUN mvn package -DskipTests -q

# Stage 2 — runtime (JRE only — ~250 MB smaller than JDK image)
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN mkdir -p /app/images /app/thumbnails /app/data
COPY --from=build /workspace/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### `ImageWebPage/Dockerfile`

```dockerfile
# Stage 1 — install deps (cached unless package.json changes)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2 — build
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3 — runtime using Next.js standalone output
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## `docker-compose.yml` — Local Profile

```yaml
services:
  backend:
    build: ./ImageAPI
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: local
      GALLERY_IMAGES_PATH: /app/images
      GALLERY_THUMBNAILS_PATH: /app/thumbnails
      GALLERY_ADMIN_EMAIL: ${GALLERY_ADMIN_EMAIL}
      GALLERY_ADMIN_PASSWORD: ${GALLERY_ADMIN_PASSWORD}
      GALLERY_JWT_SECRET: ${GALLERY_JWT_SECRET}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
    volumes:
      - gallery_images:/app/images
      - gallery_thumbnails:/app/thumbnails
      - gallery_db:/app/data

  frontend:
    build: ./ImageWebPage
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8080
      BACKEND_URL: http://backend:8080
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
    depends_on:
      - backend

volumes:
  gallery_images:
  gallery_thumbnails:
  gallery_db:
```

---

## `docker-compose.feature.yml` — Feature Profile

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: imagegallery
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d imagegallery"]
      interval: 5s
      retries: 10

  backend:
    build: ./ImageAPI
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: feature
      DB_HOST: db
      DB_PORT: 5432
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      GALLERY_ADMIN_EMAIL: ${GALLERY_ADMIN_EMAIL}
      GALLERY_ADMIN_PASSWORD: ${GALLERY_ADMIN_PASSWORD}
      GALLERY_JWT_SECRET: ${GALLERY_JWT_SECRET}
      GALLERY_FRONTEND_URL: http://localhost:3000
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      GALLERY_S3_BUCKET: ${GALLERY_S3_BUCKET}
      GALLERY_S3_REGION: ${GALLERY_S3_REGION:-ap-south-1}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build: ./ImageWebPage
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8080
      BACKEND_URL: http://backend:8080
      NEXT_PUBLIC_GOOGLE_AUTH: ${NEXT_PUBLIC_GOOGLE_AUTH:-false}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Optional: LocalStack S3 (append to docker-compose.feature.yml)

Add this to test S3 locally without real AWS credentials:

```yaml
  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566"
    environment:
      SERVICES: s3
      DEFAULT_REGION: ap-south-1
      AWS_ACCESS_KEY_ID: test
      AWS_SECRET_ACCESS_KEY: test
    volumes:
      - localstack_data:/var/lib/localstack

# add localstack_data: to the volumes: section
```

When using LocalStack, set `AWS_ACCESS_KEY_ID=test`, `AWS_SECRET_ACCESS_KEY=test` in the backend, and add a one-line `endpointOverride` to `S3Config.java` pointing to `http://localstack:4566`.

---

## `.env.docker.example`

```
# Copy to .env and fill in real values before running docker compose

# Admin account (provisioned at startup)
GALLERY_ADMIN_EMAIL=your@email.com
GALLERY_ADMIN_PASSWORD=change-me-strong-password

# JWT secret — generate with: openssl rand -base64 32
GALLERY_JWT_SECRET=replace-with-base64-secret

# Feature profile — PostgreSQL
DB_PASSWORD=change-me-db-password

# Feature profile — AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret
GALLERY_S3_BUCKET=imagegallery-yourname
GALLERY_S3_REGION=ap-south-1

# Optional — visual search + NL search
ANTHROPIC_API_KEY=sk-ant-...

# Optional — Google sign-in (feature + google-auth profiles)
NEXT_PUBLIC_GOOGLE_AUTH=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## Complete File Change Summary

| File | Type | Change |
|------|------|--------|
| `ImageAPI/Dockerfile` | **New** | Multi-stage Maven → JRE image |
| `ImageAPI/.dockerignore` | **New** | Exclude build artefacts, images, DB |
| `ImageWebPage/Dockerfile` | **New** | Multi-stage Node build → standalone runtime |
| `ImageWebPage/.dockerignore` | **New** | Exclude node_modules, .next, .env.local |
| `docker-compose.yml` | **New** | Local profile orchestration |
| `docker-compose.feature.yml` | **New** | Feature profile + PostgreSQL + optional LocalStack |
| `.env.docker.example` | **New** | Template for all required env vars |
| `ImageAPI/src/main/resources/application.yml` | **Modify** | Parameterise `images-path`, `thumbnails-path`, DB host/port |
| `ImageWebPage/src/app/api/nl-search/route.ts` | **Modify** | Add `BACKEND_URL` for server-side backend resolution |
| `ImageWebPage/next.config.ts` | **Modify** | Add `output: "standalone"` |

**Zero changes to any Java service classes, repositories, controllers, or React/Next.js components.**

---

## How to Run (once implemented)

```powershell
# Local profile (SQLite, no external dependencies)
cp .env.docker.example .env
# edit .env: fill in GALLERY_ADMIN_EMAIL, GALLERY_ADMIN_PASSWORD, GALLERY_JWT_SECRET
docker compose up --build

# Feature profile (PostgreSQL + S3)
cp .env.docker.example .env
# edit .env: fill in all vars including DB_PASSWORD, AWS_*, bucket name
docker compose -f docker-compose.feature.yml up --build
```

---

## Verification Steps

1. `docker compose up --build` → backend log shows `Started ImageGalleryApplication` ✓
2. `http://localhost:3000` → gallery loads ✓
3. Upload an image → verify it persists in the `gallery_images` Docker volume ✓
4. Stop and restart containers → uploaded images still present ✓
5. Feature profile: backend log shows `Successfully applied N migrations` (Flyway) ✓
6. Restart feature profile → PostgreSQL data still present ✓
7. NL search works (server-side route reaches backend via `BACKEND_URL`) ✓
8. Visual search works (`ANTHROPIC_API_KEY` from single `.env` file reaches both services) ✓
