# Search Setup Guide

The gallery has two search features, both powered by Claude (Anthropic). They use the **same API key** but it must be configured in two different places — one for the frontend process, one for the backend.

---

## 1. Get Your Anthropic API Key

1. Go to **[console.anthropic.com](https://console.anthropic.com)** and sign in (or create a free account)
2. Click **API Keys** in the left sidebar
3. Click **Create Key** → name it something like `ImageGallery`
4. Copy the key — it starts with `sk-ant-api03-...`

> **Cost:** Both searches use Claude Haiku (the cheapest model). New accounts receive free credits, and even regular use is very inexpensive.

---

## 2. Search Types

| Search | Description | Where it runs |
|--------|-------------|---------------|
| **NL Tag Search** | Interprets free-form text into tag/type/favourites filters — e.g. *"favourite beach videos"* | Next.js server (frontend) |
| **Visual Content Search** | Finds images by their actual visual content — e.g. *"Rocket"* finds photos of rockets | Spring Boot (backend) |

---

## 3. Frontend Key — NL Tag Search

The NL route (`/api/nl-search`) runs server-side in Next.js. Add the key to the frontend's local environment file.

**File:** `ImageWebPage/.env.local`

```env
ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY-HERE
```

> The key does **not** get a `NEXT_PUBLIC_` prefix — it stays server-side and is never sent to the browser.

Restart the dev server after saving:

```powershell
# Stop the running process (Ctrl+C), then restart:
cd ImageWebPage
npm run dev
```

---

## 4. Backend Key — Visual Content Search

Spring Boot calls the Anthropic Vision API to describe each uploaded image. Set the key as an OS environment variable before starting the backend.

### Option A — Per-session (simplest for local dev)

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-api03-YOUR-KEY-HERE"
cd ImageAPI
mvn spring-boot:run "-Dspring-boot.run.profiles=local"
```

Must be set again each time you open a new terminal.

### Option B — Permanently (recommended)

```powershell
[System.Environment]::SetEnvironmentVariable(
    "ANTHROPIC_API_KEY",
    "sk-ant-api03-YOUR-KEY-HERE",
    "User"
)
```

Restart your terminal after running this — the key will then always be available.

---

## 5. Backfilling Existing Images

Images uploaded **before** the visual search feature was added won't have descriptions yet. Once the backend key is configured, trigger a one-off backfill as the owner:

```http
POST /api/images/describe-all
Authorization: Bearer <your-access-token>
```

Example with PowerShell:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:8080/api/images/describe-all" `
  -Headers @{ Authorization = "Bearer <token>" }
```

The response is immediate — descriptions are written in the background:

```json
{ "queued": 47, "message": "47 images queued for description" }
```

---

## 6. Verification

### NL Tag Search
1. Start both servers
2. Go to `/search` and type `"my favourite beach photos"` → press Enter
3. Should land on `/search/results?favourites=true&tag=beach` (if a "beach" tag exists)

### Visual Content Search
1. Upload a photo (e.g. a rocket, a cat, a sunset)
2. Wait ~2–5 seconds for the background description job to finish
3. Go to `/search` and type `"rocket"` → press Enter
4. The uploaded photo should appear in the results

**Confirm descriptions are working** by checking the backend log:

```
DEBUG  Described image 42 [rocket.jpg]: A silver rocket launching into a clear blue sky with a trail of fire.
```

If you see this instead, the key is missing from the backend environment:

```
DEBUG  ANTHROPIC_API_KEY not configured — skipping vision description
```

---

## 7. Quick Reference

| Variable | Set in | Used by |
|----------|--------|---------|
| `ANTHROPIC_API_KEY` | `ImageWebPage/.env.local` | NL Tag Search (Next.js route `/api/nl-search`) |
| `ANTHROPIC_API_KEY` | OS environment variable | Visual Content Search (Spring Boot `ImageDescriptionService`) |

Both variables have the same name and the same value — just two different processes that each need their own copy.
